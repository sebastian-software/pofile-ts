/**
 * Catalog Compiler
 *
 * Compiles a PO catalog into optimized message functions.
 * Each message is compiled to a function that takes values and returns the formatted string.
 *
 * Uses messageId (8-char hash) as keys for minimal bundle size.
 *
 * @example
 * const po = PO.parse(poFileContent)
 * const catalog = itemsToCatalog(po.items)
 * const compiled = compileCatalog(catalog, { locale: "de" })
 *
 * compiled.format("Xk9mLp", { name: "Sebastian" })
 * // → "Hallo Sebastian!"
 */

import type { Catalog } from "./catalog"
import type { CompiledMessageFunction, MessageValues, MessageResult } from "./icu/compile"
import { compileIcu } from "./icu/compile"
import { parseIcu } from "./icu/parser"
import { generateMessageIdSync } from "./messageId"
import { getPluralCategories, getPluralFunction } from "./plurals"
import {
  createCodeGenContext,
  generateNodesCode,
  generatePluralFunctionCode,
  generateFormatterDeclarations,
  escapeComment,
  extractPluralVariable,
  type MessageCodeResult
} from "./internal/codegen"

// ============================================================================
// Runtime Compilation (compileCatalog)
// ============================================================================

/**
 * Options for compiling a catalog.
 */
export interface CompileCatalogOptions {
  /** Locale for plural rules and Intl formatting */
  locale: string

  /**
   * Whether to use messageId (hash) as key.
   * If false, uses msgid as key.
   * @default true
   */
  useMessageId?: boolean

  /**
   * Whether to throw on parse errors.
   * If false, invalid messages return the original text.
   * @default false
   */
  strict?: boolean
}

/**
 * A compiled catalog with message lookup and formatting.
 */
export interface CompiledCatalog {
  /**
   * Get a compiled message function by key (messageId or msgid).
   */
  get(key: string): CompiledMessageFunction | undefined

  /**
   * Format a message with values.
   * Returns the formatted string, or the key if not found.
   */
  format(key: string, values?: MessageValues): MessageResult

  /**
   * Check if a message exists.
   */
  has(key: string): boolean

  /**
   * Get all message keys.
   */
  keys(): string[]

  /**
   * Number of compiled messages.
   */
  readonly size: number

  /**
   * The locale this catalog was compiled for.
   */
  readonly locale: string
}

/**
 * Compiles a catalog into optimized message functions.
 *
 * @example
 * const compiled = compileCatalog(catalog, { locale: "de" })
 * compiled.format("Xk9mLp", { name: "World" }) // → "Hallo World!"
 */
export function compileCatalog(catalog: Catalog, options: CompileCatalogOptions): CompiledCatalog {
  const { locale, useMessageId = true, strict = false } = options

  const messages = new Map<string, CompiledMessageFunction>()
  const pluralFn = getPluralFunction(locale)

  for (const [msgid, entry] of Object.entries(catalog)) {
    const translation = entry.translation

    if (translation === undefined) {
      continue
    }

    const key = useMessageId ? generateMessageIdSync(msgid, entry.context) : msgid

    if (Array.isArray(translation)) {
      // Gettext plural format - compile all forms and select at runtime
      const compiled = compileGettextPluralRuntime(
        msgid,
        entry.pluralSource,
        translation,
        locale,
        pluralFn,
        strict
      )
      messages.set(key, compiled)
    } else {
      const compiled = compileIcu(translation, { locale, strict })
      messages.set(key, compiled)
    }
  }

  return {
    get(key: string) {
      return messages.get(key)
    },

    format(key: string, values?: MessageValues) {
      const fn = messages.get(key)
      if (!fn) {
        return key
      }
      return fn(values)
    },

    has(key: string) {
      return messages.has(key)
    },

    keys() {
      return [...messages.keys()]
    },

    get size() {
      return messages.size
    },

    locale
  }
}

/**
 * Compiles Gettext plural forms for runtime use.
 */
function compileGettextPluralRuntime(
  msgid: string,
  pluralSource: string | undefined,
  translations: string[],
  locale: string,
  pluralFn: (n: number) => number,
  strict: boolean
): CompiledMessageFunction {
  // Extract variable name from msgid or pluralSource
  const varName = extractPluralVariable(msgid, pluralSource) ?? "count"

  // Compile each form
  const compiledForms = translations.map((form) => compileIcu(form, { locale, strict }))

  // Return a function that selects the right form at runtime
  return (values?: MessageValues): MessageResult => {
    const rawCount = values?.[varName]
    const count = typeof rawCount === "number" ? rawCount : 0
    const index = pluralFn(count)
    // Use the form at index, or fall back to the last form
    const form = compiledForms[index]
    if (form) {
      return form(values)
    }
    // Fallback to last form if index is out of range
    const lastForm = compiledForms[compiledForms.length - 1]
    return lastForm ? lastForm(values) : String(count)
  }
}

// ============================================================================
// Static Code Generation (generateCompiledCode)
// ============================================================================

/**
 * Options for generating compiled code.
 */
export interface GenerateCodeOptions {
  /** Locale for plural rules and Intl formatting */
  locale: string

  /**
   * Whether to use messageId (hash) as key.
   * @default true
   */
  useMessageId?: boolean

  /**
   * Export name for the messages object.
   * @default "messages"
   */
  exportName?: string

  /**
   * Whether to generate TypeScript or JavaScript.
   * @default "typescript"
   */
  format?: "typescript" | "javascript"

  /**
   * Whether to include source comments with original msgid.
   * @default false
   */
  includeSourceComments?: boolean
}

/**
 * Entry in compiled output for code generation.
 */
interface CompiledEntry {
  key: string
  msgid: string
  code: string
}

/**
 * Generates JavaScript/TypeScript code for a compiled catalog.
 *
 * This can be used in build pipelines to generate static message files
 * that don't require runtime ICU parsing.
 *
 * @example
 * const code = generateCompiledCode(catalog, { locale: "de" })
 * // Write to file: messages.de.ts
 *
 * // Generated code:
 * // const _nf = new Intl.NumberFormat("de")
 * // export const messages = {
 * //   "Xk9mLp": (v) => `Hallo ${v?.name ?? "{name}"}!`,
 * //   ...
 * // }
 */
export function generateCompiledCode(catalog: Catalog, options: GenerateCodeOptions): string {
  const {
    locale,
    useMessageId = true,
    exportName = "messages",
    format = "typescript",
    includeSourceComments = false
  } = options

  const pluralCategories = getPluralCategories(locale)

  // Process all catalog entries
  const { entries, usedFormatters, needsPluralFn } = processCatalogEntries(
    catalog,
    locale,
    pluralCategories,
    useMessageId
  )

  // Build output
  return buildOutput({
    locale,
    format,
    exportName,
    includeSourceComments,
    entries,
    usedFormatters,
    needsPluralFn,
    pluralCategories
  })
}

/**
 * Processes all catalog entries and generates code for each.
 */
function processCatalogEntries(
  catalog: Catalog,
  locale: string,
  pluralCategories: readonly string[],
  useMessageId: boolean
): {
  entries: CompiledEntry[]
  usedFormatters: {
    number: Set<string>
    date: Set<string>
    time: Set<string>
    list: Set<string>
    ago: Set<string>
    name: Set<string>
  }
  needsPluralFn: boolean
} {
  const entries: CompiledEntry[] = []
  const usedFormatters = {
    number: new Set<string>(),
    date: new Set<string>(),
    time: new Set<string>(),
    list: new Set<string>(),
    ago: new Set<string>(),
    name: new Set<string>()
  }
  let needsPluralFn = false

  for (const [msgid, entry] of Object.entries(catalog)) {
    const translation = entry.translation

    if (translation === undefined) {
      continue
    }

    const key = useMessageId ? generateMessageIdSync(msgid, entry.context) : msgid

    let result: MessageCodeResult

    if (Array.isArray(translation)) {
      // Gettext plural format: msgstr[0], msgstr[1], ...
      result = generateGettextPluralCode(
        msgid,
        entry.pluralSource,
        translation,
        locale,
        pluralCategories
      )
    } else {
      // Single string (may contain ICU syntax)
      result = generateMessageCodeFromString(translation, locale, pluralCategories)
    }

    // Merge formatters
    mergeFormatters(usedFormatters, result.formatters)
    if (result.needsPluralFn) {
      needsPluralFn = true
    }

    entries.push({ key, msgid, code: result.code })
  }

  return { entries, usedFormatters, needsPluralFn }
}

/**
 * Generates code for Gettext plural format (msgstr[] array).
 */
function generateGettextPluralCode(
  msgid: string,
  pluralSource: string | undefined,
  translations: string[],
  locale: string,
  pluralCategories: readonly string[]
): MessageCodeResult {
  const formatters = {
    number: new Set<string>(),
    date: new Set<string>(),
    time: new Set<string>(),
    list: new Set<string>(),
    ago: new Set<string>(),
    name: new Set<string>()
  }

  // Extract the plural variable name from msgid or pluralSource
  const varName = extractPluralVariable(msgid, pluralSource) ?? "count"

  // Compile each msgstr[] form
  const compiledForms = compileGettextForms(translations, locale, pluralCategories, formatters)

  // Handle edge cases
  if (compiledForms.length === 0) {
    return { code: `() => ""`, formatters, needsPluralFn: false, hasTags: false }
  }

  if (compiledForms.length === 1) {
    return {
      code: compiledForms[0] ?? `() => ""`,
      formatters,
      needsPluralFn: false,
      hasTags: false
    }
  }

  // Build plural switch expression
  const code = buildGettextPluralSwitch(varName, compiledForms)

  return { code, formatters, needsPluralFn: true, hasTags: false }
}

/**
 * Compiles all Gettext plural forms.
 */
function compileGettextForms(
  translations: string[],
  locale: string,
  pluralCategories: readonly string[],
  formatters: {
    number: Set<string>
    date: Set<string>
    time: Set<string>
    list: Set<string>
    ago: Set<string>
    name: Set<string>
  }
): string[] {
  const compiledForms: string[] = []

  for (const form of translations) {
    const result = generateMessageCodeFromString(form, locale, pluralCategories)
    compiledForms.push(result.code)
    mergeFormatters(formatters, result.formatters)
  }

  return compiledForms
}

/**
 * Builds the plural switch expression for Gettext format.
 */
function buildGettextPluralSwitch(varName: string, compiledForms: string[]): string {
  let code = `(v) => { const _n = v?.${varName} ?? 0; const _i = _pf(_n); return `

  // Regex to extract body from arrow function: (v) => body OR () => body
  const fnBodyRegex = /^\([^)]*\) => (.+)$/

  for (let i = 0; i < compiledForms.length; i++) {
    const formCode = compiledForms[i] ?? '() => ""'
    const bodyMatch = fnBodyRegex.exec(formCode)
    const body = bodyMatch?.[1] ?? formCode

    if (i === compiledForms.length - 1) {
      code += body
    } else {
      code += `_i === ${i} ? ${body} : `
    }
  }

  code += " }"
  return code
}

/**
 * Merges formatter sets from a result into the accumulated set.
 */
function mergeFormatters(
  target: {
    number: Set<string>
    date: Set<string>
    time: Set<string>
    list: Set<string>
    ago: Set<string>
    name: Set<string>
  },
  source: {
    number: Set<string>
    date: Set<string>
    time: Set<string>
    list: Set<string>
    ago: Set<string>
    name: Set<string>
  }
): void {
  for (const style of source.number) {
    target.number.add(style)
  }
  for (const style of source.date) {
    target.date.add(style)
  }
  for (const style of source.time) {
    target.time.add(style)
  }
  for (const style of source.list) {
    target.list.add(style)
  }
  for (const style of source.ago) {
    target.ago.add(style)
  }
  for (const style of source.name) {
    target.name.add(style)
  }
}

/**
 * Generates JavaScript code for a single message string.
 */
function generateMessageCodeFromString(
  message: string,
  locale: string,
  pluralCategories: readonly string[]
): MessageCodeResult {
  const formatters = {
    number: new Set<string>(),
    date: new Set<string>(),
    time: new Set<string>(),
    list: new Set<string>(),
    ago: new Set<string>(),
    name: new Set<string>()
  }

  // Static string - no placeholders
  if (!message.includes("{") && !message.includes("<")) {
    return {
      code: `() => ${JSON.stringify(message)}`,
      formatters,
      needsPluralFn: false,
      hasTags: false
    }
  }

  // Parse the ICU message
  const result = parseIcu(message)
  if (!result.success) {
    return {
      code: `() => ${JSON.stringify(message)}`,
      formatters,
      needsPluralFn: false,
      hasTags: false
    }
  }

  // Create context and generate code
  const ctx = createCodeGenContext(locale, pluralCategories)
  const bodyCode = generateNodesCode(result.ast, ctx)

  // Build the function
  let code: string
  if (ctx.hasTags) {
    code = `(v) => { const _r = ${bodyCode}; return Array.isArray(_r) && _r.every(x => typeof x === "string") ? _r.join("") : _r }`
  } else {
    code = `(v) => ${bodyCode}`
  }

  return {
    code,
    formatters: ctx.formatters,
    needsPluralFn: ctx.needsPluralFn,
    hasTags: ctx.hasTags
  }
}

/**
 * Options for building the output string.
 */
interface BuildOutputOptions {
  locale: string
  format: "typescript" | "javascript"
  exportName: string
  includeSourceComments: boolean
  entries: CompiledEntry[]
  usedFormatters: {
    number: Set<string>
    date: Set<string>
    time: Set<string>
    list: Set<string>
    ago: Set<string>
    name: Set<string>
  }
  needsPluralFn: boolean
  pluralCategories: readonly string[]
}

/**
 * Builds the final output string.
 */
function buildOutput(options: BuildOutputOptions): string {
  const {
    locale,
    format,
    exportName,
    includeSourceComments,
    entries,
    usedFormatters,
    needsPluralFn,
    pluralCategories
  } = options

  const lines: string[] = []

  // Header
  lines.push("/**")
  lines.push(` * Compiled messages for locale: ${locale}`)
  lines.push(" * Generated by pofile-ts")
  lines.push(" * DO NOT EDIT - This file is auto-generated")
  lines.push(" */")
  lines.push("")

  // Plural function
  if (needsPluralFn) {
    lines.push(generatePluralFunctionCode(locale, pluralCategories))
    lines.push("")
  }

  // Formatter declarations
  const formatterDecls = generateFormatterDeclarations(locale, usedFormatters)
  if (formatterDecls) {
    lines.push(formatterDecls)
    lines.push("")
  }

  // Type (TypeScript only)
  if (format === "typescript") {
    lines.push("type V = Record<string, unknown>")
    lines.push("")
  }

  // Messages object
  lines.push(`export const ${exportName} = {`)

  for (const entry of entries) {
    if (includeSourceComments) {
      lines.push(`  // ${escapeComment(entry.msgid)}`)
    }
    lines.push(`  "${entry.key}": ${entry.code},`)
  }

  lines.push("}")
  lines.push("")

  return lines.join("\n")
}
