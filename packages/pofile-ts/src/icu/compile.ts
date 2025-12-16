/**
 * ICU Message Compiler
 *
 * Compiles ICU MessageFormat strings into executable JavaScript functions.
 * The compiled functions take a values object and return the formatted string.
 *
 * Features:
 * - Variables: {name} → values.name
 * - Plurals: {count, plural, one {# item} other {# items}} → CLDR plural rules
 * - Select: {gender, select, male {He} female {She} other {They}}
 * - Number/Date/Time: {n, number, percent}, {d, date, medium} → Intl formatters
 * - Tags: <bold>text</bold> → values.bold(children) for JSX support
 *
 * @example
 * const fn = compileIcu("{count, plural, one {# item} other {# items}}", { locale: "en" })
 * fn({ count: 5 }) // → "5 items"
 */

import type { IcuNode, IcuPluralNode, IcuSelectNode, IcuTagNode } from "./types"
import { parseIcu } from "./parser"
import { getPluralFunction, getPluralCategories } from "../plurals"

/**
 * Options for compiling ICU messages.
 */
export interface CompileIcuOptions {
  /** Locale for plural rules and Intl formatting */
  locale: string

  /**
   * Whether to throw on parse errors.
   * If false, returns a function that returns the original message.
   * @default true
   */
  strict?: boolean
}

/**
 * Values that can be passed to a compiled message function.
 */
export type MessageValues = Record<string, unknown>

/**
 * Return type of a compiled message function.
 * - string: when no tags are used
 * - (string | unknown)[]: when tags are used (for JSX support)
 */
export type MessageResult = string | readonly unknown[]

/**
 * A compiled message function.
 */
export type CompiledMessageFunction = (values?: MessageValues) => MessageResult

/**
 * Context passed during AST traversal.
 */
interface CompileContext {
  locale: string
  pluralFn: (n: number) => number
  pluralCategories: readonly string[]
  /** Current plural value for # substitution */
  pluralValue: string | null
  /** Current plural offset for # substitution */
  pluralOffset: number
  /** Cached Intl formatters */
  formatters: FormatterCache
  /** Whether any tags were encountered */
  hasTags: boolean
}

/**
 * Cache for Intl formatters to avoid recreation.
 */
interface FormatterCache {
  number: Map<string, Intl.NumberFormat>
  date: Map<string, Intl.DateTimeFormat>
  time: Map<string, Intl.DateTimeFormat>
  list: Map<string, Intl.ListFormat>
  ago: Map<string, Intl.RelativeTimeFormat>
  name: Map<string, Intl.DisplayNames>
}

/**
 * Creates a new formatter cache.
 */
function createFormatterCache(): FormatterCache {
  return {
    number: new Map(),
    date: new Map(),
    time: new Map(),
    list: new Map(),
    ago: new Map(),
    name: new Map()
  }
}

/**
 * Maps ICU date/time styles to Intl.DateTimeFormat options.
 */
function getDateTimeOptions(
  style: string | null,
  type: "date" | "time"
): Intl.DateTimeFormatOptions {
  const styleKey = type === "date" ? "dateStyle" : "timeStyle"

  switch (style) {
    case "short":
    case "medium":
    case "long":
    case "full":
      return { [styleKey]: style }
    case null:
      return { [styleKey]: "medium" }
    default:
      // Handle skeleton format (::yyyyMMdd)
      if (style.startsWith("::")) {
        // For now, fall back to medium - skeleton parsing is complex
        return { [styleKey]: "medium" }
      }
      return { [styleKey]: "medium" }
  }
}

/**
 * Maps ICU number styles to Intl.NumberFormat options.
 */
function getNumberOptions(style: string | null): Intl.NumberFormatOptions {
  switch (style) {
    case "percent":
      return { style: "percent" }
    case "currency":
      // Currency code should come from skeleton or be provided separately
      return { style: "currency", currency: "USD" }
    case "integer":
      return { maximumFractionDigits: 0 }
    case null:
      return {}
    default:
      // Handle skeleton format (::currency/EUR)
      if (style.startsWith("::")) {
        const skeleton = style.slice(2)
        if (skeleton.startsWith("currency/")) {
          const currency = skeleton.slice(9, 12).toUpperCase()
          return { style: "currency", currency }
        }
        // More skeleton patterns could be added here
      }
      return {}
  }
}

/**
 * Gets or creates a number formatter.
 */
function getNumberFormatter(
  cache: FormatterCache,
  locale: string,
  style: string | null
): Intl.NumberFormat {
  const key = style ?? ""
  let formatter = cache.number.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, getNumberOptions(style))
    cache.number.set(key, formatter)
  }
  return formatter
}

/**
 * Gets or creates a date/time formatter.
 */
function getDateTimeFormatter(
  cache: FormatterCache,
  locale: string,
  style: string | null,
  type: "date" | "time"
): Intl.DateTimeFormat {
  const key = `${type}:${style ?? ""}`
  const cacheMap = type === "date" ? cache.date : cache.time
  let formatter = cacheMap.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, getDateTimeOptions(style, type))
    cacheMap.set(key, formatter)
  }
  return formatter
}

/**
 * Gets or creates a list formatter.
 */
function getListFormatter(
  cache: FormatterCache,
  locale: string,
  style: string | null
): Intl.ListFormat {
  const key = style ?? ""
  let formatter = cache.list.get(key)
  if (!formatter) {
    const type =
      style === "disjunction" || style === "or"
        ? "disjunction"
        : style === "unit"
          ? "unit"
          : "conjunction"
    formatter = new Intl.ListFormat(locale, { type })
    cache.list.set(key, formatter)
  }
  return formatter
}

/**
 * Parses relative time style: "day", "hour short", "minute narrow"
 */
function parseRelativeTimeStyle(style: string | null): {
  unit: Intl.RelativeTimeFormatUnit
  formatStyle: Intl.RelativeTimeFormatStyle
} {
  if (!style) {
    return { unit: "day", formatStyle: "long" }
  }
  const parts = style.split(/\s+/)
  const unit = (parts[0] ?? "day") as Intl.RelativeTimeFormatUnit
  const formatStyle = (parts[1] ?? "long") as Intl.RelativeTimeFormatStyle
  return { unit, formatStyle }
}

/**
 * Gets or creates a relative time formatter for {n, ago, unit}.
 */
function getAgoFormatter(
  cache: FormatterCache,
  locale: string,
  style: string | null
): { formatter: Intl.RelativeTimeFormat; unit: Intl.RelativeTimeFormatUnit } {
  const { unit, formatStyle } = parseRelativeTimeStyle(style)
  const key = `${unit}:${formatStyle}`
  let formatter = cache.ago.get(key)
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, { style: formatStyle })
    cache.ago.set(key, formatter)
  }
  return { formatter, unit }
}

/**
 * Gets or creates a display names formatter for {code, name, type}.
 */
function getNameFormatter(
  cache: FormatterCache,
  locale: string,
  style: string | null
): Intl.DisplayNames {
  const type = (style ?? "language") as Intl.DisplayNamesType
  const key = type
  let formatter = cache.name.get(key)
  if (!formatter) {
    formatter = new Intl.DisplayNames(locale, { type })
    cache.name.set(key, formatter)
  }
  return formatter
}

/**
 * Compiles an array of AST nodes into parts.
 */
function compileNodes(nodes: IcuNode[], ctx: CompileContext): unknown[] {
  const parts: unknown[] = []

  for (const node of nodes) {
    const result = compileNode(node, ctx)
    if (result !== "") {
      parts.push(result)
    }
  }

  return parts
}

/**
 * Compiles a single AST node.
 */
// eslint-disable-next-line complexity
function compileNode(
  node: IcuNode,
  ctx: CompileContext
): string | ((values?: MessageValues) => unknown) {
  switch (node.type) {
    case "literal":
      return node.value

    case "argument":
      // Return a getter function - will be called with values
      return (values?: MessageValues) => {
        const val = values?.[node.value]
        if (val == null) {
          return `{${node.value}}`
        }
        return typeof val === "string" ? val : String(val as string | number | boolean)
      }

    case "number": {
      const formatter = getNumberFormatter(ctx.formatters, ctx.locale, node.style)
      return (values?: MessageValues) => {
        const val = values?.[node.value]
        if (typeof val === "number") {
          return formatter.format(val)
        }
        if (val == null) {
          return `{${node.value}}`
        }
        return typeof val === "string" ? val : String(val as string | number | boolean)
      }
    }

    case "date": {
      const formatter = getDateTimeFormatter(ctx.formatters, ctx.locale, node.style, "date")
      return (values?: MessageValues) => {
        const val = values?.[node.value]
        if (val instanceof Date) {
          return formatter.format(val)
        }
        if (typeof val === "number") {
          return formatter.format(new Date(val))
        }
        if (val == null) {
          return `{${node.value}}`
        }
        return typeof val === "string" ? val : String(val as string | number | boolean)
      }
    }

    case "time": {
      const formatter = getDateTimeFormatter(ctx.formatters, ctx.locale, node.style, "time")
      return (values?: MessageValues) => {
        const val = values?.[node.value]
        if (val instanceof Date) {
          return formatter.format(val)
        }
        if (typeof val === "number") {
          return formatter.format(new Date(val))
        }
        if (val == null) {
          return `{${node.value}}`
        }
        return typeof val === "string" ? val : String(val as string | number | boolean)
      }
    }

    case "list": {
      const formatter = getListFormatter(ctx.formatters, ctx.locale, node.style)
      return (values?: MessageValues) => {
        const val = values?.[node.value]
        if (Array.isArray(val)) {
          return formatter.format(val.map((v) => String(v)))
        }
        if (val == null) {
          return `{${node.value}}`
        }
        return typeof val === "string" ? val : JSON.stringify(val)
      }
    }

    case "duration": {
      return (values?: MessageValues) => {
        const val = values?.[node.value]
        if (val == null) {
          return `{${node.value}}`
        }
        // Duration can be a DurationLike object or we format it manually
        // Intl.DurationFormat is still a stage 3 proposal, so we provide a fallback
        if (typeof Intl !== "undefined" && "DurationFormat" in Intl) {
          const style = (node.style ?? "long") as "long" | "short" | "narrow" | "digital"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const formatter = new (Intl as any).DurationFormat(ctx.locale, { style })
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
          return formatter.format(val)
        }
        // Fallback: just stringify the object
        return JSON.stringify(val)
      }
    }

    case "ago": {
      const { formatter, unit } = getAgoFormatter(ctx.formatters, ctx.locale, node.style)
      return (values?: MessageValues) => {
        const val = values?.[node.value]
        if (typeof val === "number") {
          return formatter.format(val, unit)
        }
        if (val == null) {
          return `{${node.value}}`
        }
        return typeof val === "string" ? val : JSON.stringify(val)
      }
    }

    case "name": {
      const formatter = getNameFormatter(ctx.formatters, ctx.locale, node.style)
      return (values?: MessageValues) => {
        const val = values?.[node.value]
        if (typeof val === "string") {
          return formatter.of(val) ?? val
        }
        if (val == null) {
          return `{${node.value}}`
        }
        return typeof val === "string" ? val : JSON.stringify(val)
      }
    }

    case "plural":
      return compilePlural(node, ctx)

    case "select":
      return compileSelect(node, ctx)

    case "pound":
      // # is replaced with the current plural value (minus offset)
      return (values?: MessageValues) => {
        if (ctx.pluralValue === null) {
          return "#"
        }
        const val = values?.[ctx.pluralValue]
        if (typeof val === "number") {
          const formatter = getNumberFormatter(ctx.formatters, ctx.locale, null)
          return formatter.format(val - ctx.pluralOffset)
        }
        if (val == null) {
          return "#"
        }
        return typeof val === "string" ? val : String(val as string | number | boolean)
      }

    case "tag":
      ctx.hasTags = true
      return compileTag(node, ctx)

    default:
      return ""
  }
}

/**
 * Compiles a plural node.
 */
function compilePlural(
  node: IcuPluralNode,
  ctx: CompileContext
): (values?: MessageValues) => string {
  const { value: varName, options, offset } = node
  const categories = ctx.pluralCategories

  // Pre-compile all options
  const compiledOptions: Record<string, (values?: MessageValues) => string> = {}

  // Create a child context with plural value set for # substitution
  const childCtx: CompileContext = {
    ...ctx,
    pluralValue: varName,
    pluralOffset: offset
  }

  for (const [key, option] of Object.entries(options)) {
    const parts = compileNodes(option.value, childCtx)
    compiledOptions[key] = createResolver(parts)
  }

  return (values?: MessageValues) => {
    const count = values?.[varName]
    if (typeof count !== "number") {
      return `{${varName}}`
    }

    const adjustedCount = count - offset

    // Check for exact match first (=0, =1, etc.)
    const exactKey = `=${count}`
    if (compiledOptions[exactKey]) {
      return compiledOptions[exactKey](values)
    }

    // Get plural category from CLDR rules
    const categoryIndex = ctx.pluralFn(adjustedCount)
    const category = categories[categoryIndex] ?? "other"

    // Try category, fall back to "other"
    const resolver = compiledOptions[category] ?? compiledOptions.other
    return resolver?.(values) ?? `{${varName}}`
  }
}

/**
 * Compiles a select node.
 */
function compileSelect(
  node: IcuSelectNode,
  ctx: CompileContext
): (values?: MessageValues) => string {
  const { value: varName, options } = node

  // Pre-compile all options
  const compiledOptions: Record<string, (values?: MessageValues) => string> = {}

  for (const [key, option] of Object.entries(options)) {
    const parts = compileNodes(option.value, ctx)
    compiledOptions[key] = createResolver(parts)
  }

  return (values?: MessageValues) => {
    const selectorVal = values?.[varName]
    const selector =
      selectorVal == null
        ? ""
        : typeof selectorVal === "string"
          ? selectorVal
          : String(selectorVal as string | number | boolean)

    // Try exact match, fall back to "other"
    const resolver = compiledOptions[selector] ?? compiledOptions.other
    return resolver?.(values) ?? `{${varName}}`
  }
}

/**
 * Compiles a tag node.
 */
function compileTag(node: IcuTagNode, ctx: CompileContext): (values?: MessageValues) => unknown {
  const { value: tagName, children } = node

  // Pre-compile children
  const compiledChildren = compileNodes(children, ctx)
  const childResolver = createResolver(compiledChildren)

  return (values?: MessageValues) => {
    const tagFn = values?.[tagName]

    // Resolve children first
    const resolvedChildren = childResolver(values)

    // If tag value is a function, call it with children
    if (typeof tagFn === "function") {
      return (tagFn as (children: string) => unknown)(resolvedChildren)
    }

    // If no function provided, return children as-is
    return resolvedChildren
  }
}

/**
 * Creates a resolver function that combines parts into a string or array.
 */
function createResolver(parts: unknown[]): (values?: MessageValues) => string {
  // Optimize: if all parts are strings, just join them
  if (parts.every((p) => typeof p === "string")) {
    const joined = parts.join("")
    return () => joined
  }

  return (values?: MessageValues) => {
    let result = ""
    for (const part of parts) {
      if (typeof part === "string") {
        result += part
      } else if (typeof part === "function") {
        const resolved = (part as (v?: MessageValues) => unknown)(values)
        if (typeof resolved === "string") {
          result += resolved
        } else if (resolved != null) {
          result += String(resolved as string | number | boolean)
        }
      }
    }
    return result
  }
}

/**
 * Compiles an ICU MessageFormat string into an executable function.
 *
 * @example
 * const fn = compileIcu("Hello {name}!", { locale: "en" })
 * fn({ name: "World" }) // → "Hello World!"
 *
 * @example
 * const fn = compileIcu("{count, plural, one {# item} other {# items}}", { locale: "en" })
 * fn({ count: 1 }) // → "1 item"
 * fn({ count: 5 }) // → "5 items"
 *
 * @example
 * const fn = compileIcu("Created on {date, date, medium}", { locale: "de" })
 * fn({ date: new Date() }) // → "Created on 15. Dez. 2024"
 */
export function compileIcu(message: string, options: CompileIcuOptions): CompiledMessageFunction {
  const { locale, strict = true } = options

  // Parse the ICU message
  const result = parseIcu(message)

  if (!result.success) {
    if (strict) {
      throw new Error(`Failed to parse ICU message: ${result.errors[0]?.message}`)
    }
    // Return a function that returns the original message
    return () => message
  }

  // Create compilation context
  const ctx: CompileContext = {
    locale,
    pluralFn: getPluralFunction(locale),
    pluralCategories: getPluralCategories(locale),
    pluralValue: null,
    pluralOffset: 0,
    formatters: createFormatterCache(),
    hasTags: false
  }

  // Compile the AST
  const parts = compileNodes(result.ast, ctx)

  // If no dynamic parts, return static string
  if (parts.every((p) => typeof p === "string")) {
    const staticResult = parts.join("")
    return () => staticResult
  }

  // Create the final resolver
  const resolver = createResolver(parts)

  // If tags were used, we might return an array
  if (ctx.hasTags) {
    return (values?: MessageValues) => {
      const result = resolveWithTags(parts, values)
      // If result is all strings, join them
      if (result.every((r) => typeof r === "string")) {
        return result.join("")
      }
      return result
    }
  }

  return resolver
}

/**
 * Resolves parts that may contain tag results (non-strings).
 */
function resolveWithTags(parts: unknown[], values?: MessageValues): unknown[] {
  const result: unknown[] = []

  for (const part of parts) {
    if (typeof part === "string") {
      result.push(part)
    } else if (typeof part === "function") {
      const resolved = (part as (v?: MessageValues) => unknown)(values)
      result.push(resolved)
    }
  }

  return result
}
