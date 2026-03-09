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
import type { FormatterUsage } from "./types"
import type { IcuNode } from "./icu/types"
import type {
  CompiledMessageFunction,
  IcuMessageHost,
  MessageValues,
  MessageResult
} from "./icu/compile"
import { compileIcu } from "./icu/compile"
import { parseIcu } from "./icu/parser"
import { generateMessageIdSync } from "./messageId"
import { canSerializeNativeValues, getNativeBinding, stringifyNativeValues } from "./native"
import { getPluralCategories, getPluralFunction } from "./plurals"
import {
  createCodeGenContext,
  generateNodesCode,
  generatePluralFunctionCode,
  generateFormatterDeclarations,
  escapeComment,
  extractPluralVariable,
  DEFAULT_PLURAL_VAR,
  type MessageCodeResult
} from "./internal/codegen"

const nativeCompiledCatalogRegistry =
  typeof FinalizationRegistry === "function"
    ? new FinalizationRegistry<number>((handle) => {
        getNativeBinding()?.freeCompiledCatalog(handle)
      })
    : null

// ============================================================================
// Runtime Compilation (compileCatalog)
// ============================================================================

/**
 * Options for compiling a catalog.
 */
export interface CompileCatalogOptions {
  /** Locale for plural rules and Intl formatting */
  locale: string

  /** Optional host implementation for formatting and tag rendering. */
  host?: IcuMessageHost

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
function compileCatalogJs(catalog: Catalog, options: CompileCatalogOptions): CompiledCatalog {
  const { locale, host, useMessageId = true, strict = false } = options
  const effectiveLocale = host?.locale ?? locale

  const messages = new Map<string, CompiledMessageFunction>()
  const pluralFn = getPluralFunction(effectiveLocale)

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
        effectiveLocale,
        pluralFn,
        strict,
        host
      )
      messages.set(key, compiled)
    } else {
      const compiled = compileIcu(translation, { locale, strict, host })
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

function everyOptionValueSupports(
  options: Record<string, { value: IcuNode[] }>,
  predicate: (node: IcuNode) => boolean
): boolean {
  return Object.values(options).every((option) => option.value.every(predicate))
}

function supportsNativeNode(node: IcuNode): boolean {
  switch (node.type) {
    case "literal":
    case "argument":
    case "pound":
      return true
    case "tag":
      return node.children.every(supportsNativeNode)
    case "select":
      return everyOptionValueSupports(node.options, supportsNativeNode)
    case "plural":
      return everyOptionValueSupports(node.options, supportsNativeNode)
    default:
      return false
  }
}

function supportsNativeMessage(message: string): boolean {
  const parsed = parseIcu(message)
  return !parsed.success || parsed.ast.every(supportsNativeNode)
}

function isNativeCatalogEntry(entry: Catalog[string] | undefined): boolean {
  if (entry?.translation === undefined) {
    return false
  }

  if (Array.isArray(entry.translation)) {
    return entry.translation.every(supportsNativeMessage)
  }

  return supportsNativeMessage(entry.translation)
}

function getCatalogKey(
  msgid: string,
  entry: Catalog[string] | undefined,
  useMessageId: boolean
): string {
  return useMessageId ? generateMessageIdSync(msgid, entry?.context) : msgid
}

function splitCatalogByNativeSupport(
  catalog: Catalog,
  useMessageId: boolean
): {
  nativeCatalog: Catalog
  jsCatalog: Catalog
  orderedKeys: string[]
  nativeKeys: Set<string>
} {
  const nativeCatalog: Catalog = {}
  const jsCatalog: Catalog = {}
  const orderedKeys: string[] = []
  const nativeKeys = new Set<string>()

  for (const [msgid, entry] of Object.entries(catalog)) {
    if (entry.translation === undefined) {
      continue
    }

    const key = getCatalogKey(msgid, entry, useMessageId)
    orderedKeys.push(key)

    if (isNativeCatalogEntry(entry)) {
      nativeCatalog[msgid] = entry
      nativeKeys.add(key)
    } else {
      jsCatalog[msgid] = entry
    }
  }

  return { nativeCatalog, jsCatalog, orderedKeys, nativeKeys }
}

function createNativeCatalog(
  catalog: Catalog,
  options: CompileCatalogOptions,
  handle: number,
  nativeKeys: Set<string>,
  orderedKeys: string[],
  jsCatalogFallback?: CompiledCatalog
): CompiledCatalog {
  let fullFallback: CompiledCatalog | undefined
  const getFullFallback = (): CompiledCatalog => {
    fullFallback ??= compileCatalogJs(catalog, options)
    return fullFallback
  }

  const formatNative = (key: string, values?: MessageValues): MessageResult => {
    if (!canSerializeNativeValues(values)) {
      return getFullFallback().format(key, values)
    }

    const binding = getNativeBinding()
    if (!binding) {
      return getFullFallback().format(key, values)
    }

    try {
      return binding.formatCompiledCatalogJson(handle, key, stringifyNativeValues(values))
    } catch {
      return getFullFallback().format(key, values)
    }
  }

  const getNative = (key: string): CompiledMessageFunction | undefined => {
    if (!nativeKeys.has(key)) {
      return undefined
    }

    const binding = getNativeBinding()
    if (!binding?.compiledCatalogHas(handle, key)) {
      return undefined
    }

    return (values?: MessageValues) => formatNative(key, values)
  }

  const compiled: CompiledCatalog = {
    get(key: string) {
      return getNative(key) ?? jsCatalogFallback?.get(key) ?? getFullFallback().get(key)
    },

    format(key: string, values?: MessageValues) {
      const message = getNative(key)
      if (message) {
        return message(values)
      }
      return jsCatalogFallback?.format(key, values) ?? getFullFallback().format(key, values)
    },

    has(key: string) {
      return (
        getNative(key) !== undefined ||
        jsCatalogFallback?.has(key) === true ||
        (nativeKeys.has(key) && getFullFallback().has(key))
      )
    },

    keys() {
      return orderedKeys
    },

    get size() {
      return orderedKeys.length
    },

    get locale() {
      const binding = getNativeBinding()
      return binding ? binding.compiledCatalogLocale(handle) : getFullFallback().locale
    }
  }

  nativeCompiledCatalogRegistry?.register(compiled, handle, compiled)
  return compiled
}

export function compileCatalog(catalog: Catalog, options: CompileCatalogOptions): CompiledCatalog {
  if (options.host) {
    return compileCatalogJs(catalog, options)
  }

  const binding = getNativeBinding()
  if (!binding) {
    return compileCatalogJs(catalog, options)
  }

  const useMessageId = options.useMessageId ?? true
  const { nativeCatalog, jsCatalog, orderedKeys, nativeKeys } = splitCatalogByNativeSupport(
    catalog,
    useMessageId
  )
  if (Object.keys(nativeCatalog).length === 0) {
    return compileCatalogJs(catalog, options)
  }

  const jsFallback =
    Object.keys(jsCatalog).length > 0
      ? compileCatalogJs(jsCatalog, options)
      : compileCatalogJs({}, options)

  try {
    const handle = binding.compileCatalogJson(
      JSON.stringify(nativeCatalog),
      JSON.stringify({
        locale: options.locale,
        useMessageId,
        strict: options.strict ?? false
      })
    )
    return createNativeCatalog(catalog, options, handle, nativeKeys, orderedKeys, jsFallback)
  } catch {
    return compileCatalogJs(catalog, options)
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
  strict: boolean,
  host: IcuMessageHost | undefined
): CompiledMessageFunction {
  // Extract variable name from msgid or pluralSource
  const varName = extractPluralVariable(msgid, pluralSource) ?? DEFAULT_PLURAL_VAR

  // Compile each form
  const compiledForms = translations.map((form) => compileIcu(form, { locale, strict, host }))

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
  usedFormatters: FormatterUsage
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
  const varName = extractPluralVariable(msgid, pluralSource) ?? DEFAULT_PLURAL_VAR

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
  formatters: FormatterUsage
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
function mergeFormatters(target: FormatterUsage, source: FormatterUsage): void {
  for (const key of Object.keys(source) as (keyof FormatterUsage)[]) {
    for (const style of source[key]) {
      target[key].add(style)
    }
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
  usedFormatters: FormatterUsage
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
