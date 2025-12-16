/**
 * Code Generation Utilities
 *
 * Internal module for generating JavaScript code from ICU AST.
 */

import type { IcuNode, IcuPluralNode, IcuSelectNode, IcuTagNode } from "../icu/types"
import type { FormatterUsage } from "../types"

/** Default variable name for Gettext plurals when none can be extracted */
export const DEFAULT_PLURAL_VAR = "count"

/**
 * Context for code generation.
 */
export interface CodeGenContext {
  locale: string
  formatters: FormatterUsage
  pluralCategories: readonly string[]
  /** Current plural variable for # substitution */
  pluralVar: string | null
  /** Current plural offset */
  pluralOffset: number
  needsPluralFn: boolean
  hasTags: boolean
}

/**
 * Result of generating message code.
 */
export interface MessageCodeResult {
  code: string
  formatters: FormatterUsage
  needsPluralFn: boolean
  hasTags: boolean
}

/**
 * Creates a new code generation context.
 */
export function createCodeGenContext(
  locale: string,
  pluralCategories: readonly string[]
): CodeGenContext {
  return {
    locale,
    formatters: {
      number: new Set<string>(),
      date: new Set<string>(),
      time: new Set<string>(),
      list: new Set<string>(),
      ago: new Set<string>(),
      name: new Set<string>()
    },
    pluralCategories,
    pluralVar: null,
    pluralOffset: 0,
    needsPluralFn: false,
    hasTags: false
  }
}

/**
 * Generates code for an array of nodes.
 * Returns a template literal string for simple cases, or an array for JSX.
 */
export function generateNodesCode(nodes: IcuNode[], ctx: CodeGenContext): string {
  if (nodes.length === 0) {
    return '""'
  }

  if (nodes.length === 1) {
    const firstNode = nodes[0]
    if (firstNode) {
      // For single literal node, just return the quoted string
      if (firstNode.type === "literal") {
        return JSON.stringify(firstNode.value)
      }
      return generateNodeCode(firstNode, ctx)
    }
    return '""'
  }

  // Check if all nodes are simple (can be concatenated as strings)
  const allSimple = nodes.every((n) => !isTagNode(n, ctx))

  if (allSimple) {
    // Use template literal for better readability
    return generateTemplateLiteral(nodes, ctx)
  } else {
    // Use array for potential JSX content
    ctx.hasTags = true
    const parts = nodes.map((n) => generateNodeCode(n, ctx))
    return `[${parts.join(", ")}]`
  }
}

/**
 * Generates a template literal from nodes.
 */
function generateTemplateLiteral(nodes: IcuNode[], ctx: CodeGenContext): string {
  let template = "`"

  for (const node of nodes) {
    if (node.type === "literal") {
      // Escape backticks and ${} in literals
      template += escapeTemplateString(node.value)
    } else {
      // Wrap expression in ${}
      template += "${" + generateNodeCode(node, ctx) + "}"
    }
  }

  template += "`"
  return template
}

/**
 * Check if a node is a tag.
 */
function isTagNode(node: IcuNode, ctx: CodeGenContext): boolean {
  if (node.type === "tag") {
    ctx.hasTags = true
    return true
  }
  return false
}

/**
 * Generates code for a single node.
 */
// eslint-disable-next-line complexity
export function generateNodeCode(node: IcuNode, ctx: CodeGenContext): string {
  switch (node.type) {
    case "literal":
      return JSON.stringify(node.value)

    case "argument":
      return generateArgumentCode(node.value)

    case "number":
      return generateNumberCode(node.value, node.style, ctx)

    case "date":
      return generateDateCode(node.value, node.style, ctx)

    case "time":
      return generateTimeCode(node.value, node.style, ctx)

    case "list":
      return generateListCode(node.value, node.style, ctx)

    case "duration":
      return generateDurationCode(node.value, node.style, ctx)

    case "ago":
      return generateAgoCode(node.value, node.style, ctx)

    case "name":
      return generateNameCode(node.value, node.style, ctx)

    case "plural":
      return generatePluralCode(node, ctx)

    case "select":
      return generateSelectCode(node, ctx)

    case "pound":
      return generatePoundCode(ctx)

    case "tag":
      return generateTagCode(node, ctx)

    default:
      return '""'
  }
}

/**
 * Generates code for a simple argument {name}.
 */
function generateArgumentCode(varValue: string): string {
  const varName = safeVarName(varValue)
  const fallback = JSON.stringify(`{${varValue}}`)
  return `(v?.${varName} ?? ${fallback})`
}

/**
 * Generates code for {n, number, style}.
 */
function generateNumberCode(varValue: string, style: string | null, ctx: CodeGenContext): string {
  const styleKey = style ?? ""
  ctx.formatters.number.add(styleKey)
  const formatterName = styleKey ? `_nf_${sanitizeStyle(styleKey)}` : "_nf"
  const varName = safeVarName(varValue)
  const fallback = JSON.stringify(`{${varValue}}`)
  return `(typeof v?.${varName} === "number" ? ${formatterName}.format(v.${varName}) : v?.${varName} ?? ${fallback})`
}

/**
 * Generates code for {d, date, style}.
 */
function generateDateCode(varValue: string, style: string | null, ctx: CodeGenContext): string {
  const styleKey = style ?? "medium"
  ctx.formatters.date.add(styleKey)
  const formatterName = `_df_${sanitizeStyle(styleKey)}`
  const varName = safeVarName(varValue)
  const fallback = JSON.stringify(`{${varValue}}`)
  return `(v?.${varName} instanceof Date ? ${formatterName}.format(v.${varName}) : typeof v?.${varName} === "number" ? ${formatterName}.format(new Date(v.${varName})) : v?.${varName} ?? ${fallback})`
}

/**
 * Generates code for {t, time, style}.
 */
function generateTimeCode(varValue: string, style: string | null, ctx: CodeGenContext): string {
  const styleKey = style ?? "medium"
  ctx.formatters.time.add(styleKey)
  const formatterName = `_tf_${sanitizeStyle(styleKey)}`
  const varName = safeVarName(varValue)
  const fallback = JSON.stringify(`{${varValue}}`)
  return `(v?.${varName} instanceof Date ? ${formatterName}.format(v.${varName}) : typeof v?.${varName} === "number" ? ${formatterName}.format(new Date(v.${varName})) : v?.${varName} ?? ${fallback})`
}

/**
 * Generates code for {items, list, style}.
 */
function generateListCode(varValue: string, style: string | null, ctx: CodeGenContext): string {
  const styleKey = style ?? ""
  ctx.formatters.list.add(styleKey)
  const formatterName = styleKey ? `_lf_${sanitizeStyle(styleKey)}` : "_lf"
  const varName = safeVarName(varValue)
  const fallback = JSON.stringify(`{${varValue}}`)
  return `(Array.isArray(v?.${varName}) ? ${formatterName}.format(v.${varName}.map(String)) : v?.${varName} ?? ${fallback})`
}

/**
 * Generates code for {d, duration, style}.
 */
function generateDurationCode(varValue: string, style: string | null, ctx: CodeGenContext): string {
  const varName = safeVarName(varValue)
  const fallback = JSON.stringify(`{${varValue}}`)
  const styleStr = JSON.stringify(style ?? "long")
  // DurationFormat (Baseline 2025) - generate runtime check for older environments
  return `(v?.${varName} != null && typeof Intl !== "undefined" && "DurationFormat" in Intl ? new Intl.DurationFormat(${JSON.stringify(ctx.locale)}, { style: ${styleStr} }).format(v.${varName}) : v?.${varName} ?? ${fallback})`
}

/**
 * Parses relative time style: "day", "hour short"
 */
function parseRelativeTimeStyleForCodegen(style: string | null): {
  unit: string
  formatStyle: string
} {
  if (!style) {
    return { unit: "day", formatStyle: "long" }
  }
  const parts = style.split(/\s+/)
  return {
    unit: parts[0] ?? "day",
    formatStyle: parts[1] ?? "long"
  }
}

/**
 * Generates code for {n, ago, unit style}.
 */
function generateAgoCode(varValue: string, style: string | null, ctx: CodeGenContext): string {
  const { unit, formatStyle } = parseRelativeTimeStyleForCodegen(style)
  const styleKey = `${unit}_${formatStyle}`
  ctx.formatters.ago.add(styleKey)
  const formatterName = `_rtf_${sanitizeStyle(styleKey)}`
  const varName = safeVarName(varValue)
  const fallback = JSON.stringify(`{${varValue}}`)
  return `(typeof v?.${varName} === "number" ? ${formatterName}.format(v.${varName}, ${JSON.stringify(unit)}) : v?.${varName} ?? ${fallback})`
}

/**
 * Generates code for {code, name, type}.
 */
function generateNameCode(varValue: string, style: string | null, ctx: CodeGenContext): string {
  const type = style ?? "language"
  ctx.formatters.name.add(type)
  const formatterName = `_dn_${sanitizeStyle(type)}`
  const varName = safeVarName(varValue)
  const fallback = JSON.stringify(`{${varValue}}`)
  return `(typeof v?.${varName} === "string" ? (${formatterName}.of(v.${varName}) ?? v.${varName}) : v?.${varName} ?? ${fallback})`
}

/**
 * Generates code for # in plurals.
 */
function generatePoundCode(ctx: CodeGenContext): string {
  if (ctx.pluralVar === null) {
    return '"#"'
  }
  ctx.formatters.number.add("")
  const varName = safeVarName(ctx.pluralVar)
  if (ctx.pluralOffset > 0) {
    return `_nf.format((v?.${varName} ?? 0) - ${ctx.pluralOffset})`
  }
  return `_nf.format(v?.${varName} ?? 0)`
}

/**
 * Generates code for a plural node.
 */
export function generatePluralCode(node: IcuPluralNode, ctx: CodeGenContext): string {
  ctx.needsPluralFn = true
  const varName = safeVarName(node.value)
  const offset = node.offset

  // Save context and set plural variable for # substitution
  const prevPluralVar = ctx.pluralVar
  const prevPluralOffset = ctx.pluralOffset
  ctx.pluralVar = node.value
  ctx.pluralOffset = offset

  // Collect exact matches and category matches
  const exactMatches: { value: number; code: string }[] = []
  const categoryMatches: Record<string, string> = {}

  for (const [key, option] of Object.entries(node.options)) {
    const optionCode = generateNodesCode(option.value, ctx)

    if (key.startsWith("=")) {
      const exactValue = parseInt(key.slice(1), 10)
      exactMatches.push({ value: exactValue, code: optionCode })
    } else {
      categoryMatches[key] = optionCode
    }
  }

  // Restore context
  ctx.pluralVar = prevPluralVar
  ctx.pluralOffset = prevPluralOffset

  // Build the conditional expression
  const code = buildPluralCondition(varName, offset, exactMatches, categoryMatches, ctx)
  return `(${code})`
}

/**
 * Builds the conditional expression for plural.
 */
// eslint-disable-next-line complexity
function buildPluralCondition(
  varName: string,
  offset: number,
  exactMatches: { value: number; code: string }[],
  categoryMatches: Record<string, string>,
  ctx: CodeGenContext
): string {
  let code = ""

  // Handle exact matches first
  for (const { value, code: optionCode } of exactMatches) {
    code += `v?.${varName} === ${value} ? ${optionCode} : `
  }

  // Then handle category matches
  const categories = ctx.pluralCategories

  if (Object.keys(categoryMatches).length > 0) {
    const adjustedVar = offset > 0 ? `((v?.${varName} ?? 0) - ${offset})` : `(v?.${varName} ?? 0)`

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i]
      if (category && categoryMatches[category]) {
        if (i === categories.length - 1 || category === "other") {
          code += categoryMatches[category]
        } else {
          code += `_pf(${adjustedVar}) === ${i} ? ${categoryMatches[category]} : `
        }
      }
    }

    if (!code.endsWith(categoryMatches.other ?? '""')) {
      code += categoryMatches.other ?? `"{${varName}}"`
    }
  } else {
    code += `"{${varName}}"`
  }

  return code
}

/**
 * Generates code for a select node.
 */
export function generateSelectCode(node: IcuSelectNode, ctx: CodeGenContext): string {
  const varName = safeVarName(node.value)

  const optionCodes: Record<string, string> = {}
  for (const [key, option] of Object.entries(node.options)) {
    optionCodes[key] = generateNodesCode(option.value, ctx)
  }

  let code = ""
  const keys = Object.keys(optionCodes).filter((k) => k !== "other")

  for (const key of keys) {
    code += `v?.${varName} === ${JSON.stringify(key)} ? ${optionCodes[key]} : `
  }

  code += optionCodes.other ?? `"{${node.value}}"`

  return `(${code})`
}

/**
 * Generates code for a tag node.
 */
export function generateTagCode(node: IcuTagNode, ctx: CodeGenContext): string {
  ctx.hasTags = true
  const tagName = safeVarName(node.value)

  const childrenCode = generateNodesCode(node.children, ctx)

  return `(typeof v?.${tagName} === "function" ? v.${tagName}(${childrenCode}) : ${childrenCode})`
}

/**
 * Makes a variable name safe for use in generated code.
 */
export function safeVarName(name: string): string {
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
    return name
  }
  return `[${JSON.stringify(name)}]`
}

/**
 * Sanitizes a style string for use as a variable name suffix.
 */
export function sanitizeStyle(style: string): string {
  return style.replace(/[^a-zA-Z0-9]/g, "_").replace(/^_+|_+$/g, "")
}

/**
 * Escapes a string for use inside a template literal.
 */
export function escapeTemplateString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")
}

/**
 * Escapes a string for use in a comment.
 */
export function escapeComment(str: string): string {
  return str.replace(/\*\//g, "* /").replace(/\n/g, " ")
}

/**
 * Extracts the plural variable name from msgid or msgid_plural.
 * Looks for {varName} patterns and returns the first one found.
 *
 * @example
 * extractPluralVariable("{count} item", "{count} items") // → "count"
 * extractPluralVariable("One item", "{n} items") // → "n"
 * extractPluralVariable("One item", "Many items") // → null (use default)
 */
export function extractPluralVariable(msgid: string, pluralSource?: string): string | null {
  // Try pluralSource first (msgid_plural), then msgid
  const sources = [pluralSource, msgid].filter(Boolean) as string[]

  for (const source of sources) {
    // Match {varName} or {varName, ...}
    const match = /\{([a-zA-Z_$][a-zA-Z0-9_$]*?)(?:,|\})/u.exec(source)
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * Gets Intl.NumberFormat options for a style.
 */
export function getNumberOptionsForStyle(style: string): Intl.NumberFormatOptions {
  switch (style) {
    case "percent":
      return { style: "percent" }
    case "currency":
      return { style: "currency", currency: "USD" }
    default:
      return {}
  }
}

/**
 * Generates the plural function code for a locale.
 * Uses native Intl.PluralRules for accurate CLDR-compliant plural selection.
 */
export function generatePluralFunctionCode(locale: string, categories: readonly string[]): string {
  // For single category (only "other"), no plural function needed
  if (categories.length === 1) {
    return "const _pf = () => 0"
  }

  // For simple one/other pattern, use inline function for smaller output
  if (categories.length === 2 && categories[0] === "one" && categories[1] === "other") {
    return "const _pf = (n) => n !== 1 ? 1 : 0"
  }

  // Use Intl.PluralRules for complex patterns
  // This ensures CLDR-compliant plural selection
  return `const _pr = new Intl.PluralRules("${locale}")
const _pc = _pr.resolvedOptions().pluralCategories
const _pf = (n) => { const i = _pc.indexOf(_pr.select(n)); return i >= 0 ? i : _pc.length - 1 }`
}

/**
 * Gets Intl.ListFormat type from style.
 */
function getListTypeFromStyle(style: string): "conjunction" | "disjunction" | "unit" {
  switch (style) {
    case "disjunction":
    case "or":
      return "disjunction"
    case "unit":
      return "unit"
    default:
      return "conjunction"
  }
}

/**
 * Generates Intl formatter declarations.
 */
// eslint-disable-next-line complexity
export function generateFormatterDeclarations(locale: string, used: FormatterUsage): string | null {
  const decls: string[] = []

  for (const style of used.number) {
    const name = style ? `_nf_${sanitizeStyle(style)}` : "_nf"
    const opts = style ? `, ${JSON.stringify(getNumberOptionsForStyle(style))}` : ""
    decls.push(`const ${name} = new Intl.NumberFormat("${locale}"${opts})`)
  }

  for (const style of used.date) {
    const name = `_df_${sanitizeStyle(style)}`
    decls.push(`const ${name} = new Intl.DateTimeFormat("${locale}", { dateStyle: "${style}" })`)
  }

  for (const style of used.time) {
    const name = `_tf_${sanitizeStyle(style)}`
    decls.push(`const ${name} = new Intl.DateTimeFormat("${locale}", { timeStyle: "${style}" })`)
  }

  for (const style of used.list) {
    const name = style ? `_lf_${sanitizeStyle(style)}` : "_lf"
    const type = getListTypeFromStyle(style)
    decls.push(`const ${name} = new Intl.ListFormat("${locale}", { type: "${type}" })`)
  }

  for (const styleKey of used.ago) {
    // styleKey is "unit_formatStyle" e.g. "day_long", "hour_short"
    const parts = styleKey.split("_")
    const formatStyle = parts[1] ?? "long"
    const formatterName = `_rtf_${sanitizeStyle(styleKey)}`
    decls.push(
      `const ${formatterName} = new Intl.RelativeTimeFormat("${locale}", { style: "${formatStyle}" })`
    )
  }

  for (const type of used.name) {
    const formatterName = `_dn_${sanitizeStyle(type)}`
    decls.push(`const ${formatterName} = new Intl.DisplayNames("${locale}", { type: "${type}" })`)
  }

  return decls.length > 0 ? decls.join("\n") : null
}
