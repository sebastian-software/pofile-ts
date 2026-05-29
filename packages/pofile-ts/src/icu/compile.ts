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

  /**
   * Custom number format styles.
   * Keys are style names used in messages, values are Intl.NumberFormat options.
   * @example
   * numberStyles: {
   *   bytes: { style: "unit", unit: "byte", unitDisplay: "narrow" },
   *   percent2: { style: "percent", minimumFractionDigits: 2 }
   * }
   * // Usage: {size, number, bytes}
   */
  numberStyles?: Record<string, Intl.NumberFormatOptions>

  /**
   * Custom date format styles.
   * Keys are style names used in messages, values are Intl.DateTimeFormat options.
   * @example
   * dateStyles: {
   *   monthYear: { month: "long", year: "numeric" },
   *   iso: { year: "numeric", month: "2-digit", day: "2-digit" }
   * }
   * // Usage: {d, date, monthYear}
   */
  dateStyles?: Record<string, Intl.DateTimeFormatOptions>

  /**
   * Custom time format styles.
   * Keys are style names used in messages, values are Intl.DateTimeFormat options.
   * @example
   * timeStyles: {
   *   precise: { hour: "2-digit", minute: "2-digit", second: "2-digit" },
   *   hourOnly: { hour: "numeric" }
   * }
   * // Usage: {t, time, precise}
   */
  timeStyles?: Record<string, Intl.DateTimeFormatOptions>

  /**
   * Custom list format styles.
   * Keys are style names used in messages, values are Intl.ListFormat options.
   * @example
   * listStyles: {
   *   narrow: { type: "conjunction", style: "narrow" },
   *   or: { type: "disjunction" }
   * }
   * // Usage: {items, list, narrow}
   */
  listStyles?: Record<string, Intl.ListFormatOptions>
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
  /** Custom format styles */
  customStyles: {
    number: Record<string, Intl.NumberFormatOptions>
    date: Record<string, Intl.DateTimeFormatOptions>
    time: Record<string, Intl.DateTimeFormatOptions>
    list: Record<string, Intl.ListFormatOptions>
  }
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
 * Built-in date format styles.
 * These provide common date formatting patterns.
 */
const BUILTIN_DATE_STYLES: Record<string, Intl.DateTimeFormatOptions> = {
  // Standard ICU styles (short, medium, long, full) handled separately

  // ISO-like formats
  iso: { year: "numeric", month: "2-digit", day: "2-digit" },
  isoDate: { year: "numeric", month: "2-digit", day: "2-digit" },

  // Component combinations
  weekday: { weekday: "long" },
  weekdayShort: { weekday: "short" },
  monthYear: { month: "long", year: "numeric" },
  monthYearShort: { month: "short", year: "numeric" },
  monthDay: { month: "short", day: "numeric" },
  monthDayLong: { month: "long", day: "numeric" },
  yearMonth: { year: "numeric", month: "2-digit" },
  dayMonth: { day: "numeric", month: "short" },
  dayMonthYear: { day: "numeric", month: "short", year: "numeric" },

  // With weekday
  weekdayMonthDay: { weekday: "long", month: "long", day: "numeric" },
  weekdayShortMonthDay: { weekday: "short", month: "short", day: "numeric" }
}

/**
 * Built-in time format styles.
 * These provide common time formatting patterns.
 */
const BUILTIN_TIME_STYLES: Record<string, Intl.DateTimeFormatOptions> = {
  // Standard ICU styles (short, medium, long, full) handled separately

  // Hour:Minute formats
  hourMinute: { hour: "2-digit", minute: "2-digit" },
  hourMinute12: { hour: "numeric", minute: "2-digit", hour12: true },
  hourMinute24: { hour: "2-digit", minute: "2-digit", hour12: false },

  // With seconds
  hourMinuteSecond: { hour: "2-digit", minute: "2-digit", second: "2-digit" },
  hourMinuteSecond12: { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true },
  hourMinuteSecond24: { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false },

  // Hour only
  hour: { hour: "numeric" },
  hour12: { hour: "numeric", hour12: true },
  hour24: { hour: "2-digit", hour12: false }
}

/**
 * Maps ICU date/time styles to Intl.DateTimeFormat options.
 */
function getDateTimeOptions(
  style: string | null,
  type: "date" | "time"
): Intl.DateTimeFormatOptions {
  const styleKey = type === "date" ? "dateStyle" : "timeStyle"

  // Standard ICU styles
  switch (style) {
    case "short":
    case "medium":
    case "long":
    case "full":
      return { [styleKey]: style }
    case null:
      return { [styleKey]: "medium" }
  }

  // Check built-in styles
  const builtinStyles = type === "date" ? BUILTIN_DATE_STYLES : BUILTIN_TIME_STYLES
  const builtin = builtinStyles[style]
  if (builtin) {
    return builtin
  }

  // Handle skeleton format (::yyyyMMdd)
  if (style.startsWith("::")) {
    // For now, fall back to medium - skeleton parsing is complex
    return { [styleKey]: "medium" }
  }

  return { [styleKey]: "medium" }
}

/**
 * Built-in number format styles.
 * These provide common formatting patterns without needing custom styles.
 */
const BUILTIN_NUMBER_STYLES: Record<string, Intl.NumberFormatOptions> = {
  // Standard ICU styles
  percent: { style: "percent" },
  integer: { maximumFractionDigits: 0 },

  // Compact notation (1K, 1M, 1B)
  compact: { notation: "compact" },
  compactLong: { notation: "compact", compactDisplay: "long" },

  // Precision control
  decimal1: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  decimal2: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  decimal3: { minimumFractionDigits: 3, maximumFractionDigits: 3 },

  // Sign display
  signAlways: { signDisplay: "always" },
  signExceptZero: { signDisplay: "exceptZero" },

  // Grouping
  noGrouping: { useGrouping: false },

  // File size units
  byte: { style: "unit", unit: "byte", unitDisplay: "narrow" },
  kilobyte: { style: "unit", unit: "kilobyte", unitDisplay: "short" },
  megabyte: { style: "unit", unit: "megabyte", unitDisplay: "short" },
  gigabyte: { style: "unit", unit: "gigabyte", unitDisplay: "short" },
  terabyte: { style: "unit", unit: "terabyte", unitDisplay: "short" },

  // Distance units
  meter: { style: "unit", unit: "meter" },
  kilometer: { style: "unit", unit: "kilometer" },
  mile: { style: "unit", unit: "mile" },

  // Temperature units
  celsius: { style: "unit", unit: "celsius" },
  fahrenheit: { style: "unit", unit: "fahrenheit" },

  // Weight units
  kilogram: { style: "unit", unit: "kilogram" },
  gram: { style: "unit", unit: "gram" },
  pound: { style: "unit", unit: "pound" },

  // Volume units
  liter: { style: "unit", unit: "liter" },
  milliliter: { style: "unit", unit: "milliliter" },

  // Duration units (for simple cases; use {x, duration} for complex)
  second: { style: "unit", unit: "second" },
  minute: { style: "unit", unit: "minute" },
  hour: { style: "unit", unit: "hour" },
  day: { style: "unit", unit: "day" },
  week: { style: "unit", unit: "week" },
  month: { style: "unit", unit: "month" },
  year: { style: "unit", unit: "year" }
}

/**
 * Maps ICU number styles to Intl.NumberFormat options.
 * Note: "currency" without skeleton is handled separately with runtime currency lookup.
 */
function getNumberOptions(style: string | null): Intl.NumberFormatOptions {
  if (style == null) {
    return {}
  }

  // Check built-in styles first
  const builtin = BUILTIN_NUMBER_STYLES[style]
  if (builtin) {
    return builtin
  }

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
 * Built-in list format styles.
 * These provide common list formatting patterns.
 */
const BUILTIN_LIST_STYLES: Record<string, Intl.ListFormatOptions> = {
  // Type variations
  conjunction: { type: "conjunction" },
  disjunction: { type: "disjunction" },
  or: { type: "disjunction" },
  unit: { type: "unit" },

  // Style variations (long is default)
  short: { type: "conjunction", style: "short" },
  narrow: { type: "conjunction", style: "narrow" },

  // Combined type + style
  orShort: { type: "disjunction", style: "short" },
  orNarrow: { type: "disjunction", style: "narrow" },
  unitShort: { type: "unit", style: "short" },
  unitNarrow: { type: "unit", style: "narrow" }
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
    const options = style ? BUILTIN_LIST_STYLES[style] : undefined
    formatter = new Intl.ListFormat(locale, options ?? { type: "conjunction" })
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
      // Check for custom style first
      const customNumberStyle = node.style ? ctx.customStyles.number[node.style] : undefined
      if (customNumberStyle) {
        const formatter = new Intl.NumberFormat(ctx.locale, customNumberStyle)
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

      // Special handling for "currency" style without skeleton:
      // Read currency code from values.currency at runtime
      if (node.style === "currency") {
        const currencyCache = new Map<string, Intl.NumberFormat>()
        return (values?: MessageValues) => {
          const val = values?.[node.value]
          if (typeof val !== "number") {
            if (val == null) {
              return `{${node.value}}`
            }
            return typeof val === "string" ? val : String(val as string | number | boolean)
          }
          const currency = typeof values?.currency === "string" ? values.currency : "USD"
          let formatter = currencyCache.get(currency)
          if (!formatter) {
            formatter = new Intl.NumberFormat(ctx.locale, { style: "currency", currency })
            currencyCache.set(currency, formatter)
          }
          return formatter.format(val)
        }
      }

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
      // Check for custom style first
      const customDateStyle = node.style ? ctx.customStyles.date[node.style] : undefined
      const formatter = customDateStyle
        ? new Intl.DateTimeFormat(ctx.locale, customDateStyle)
        : getDateTimeFormatter(ctx.formatters, ctx.locale, node.style, "date")
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
      // Check for custom style first
      const customTimeStyle = node.style ? ctx.customStyles.time[node.style] : undefined
      const formatter = customTimeStyle
        ? new Intl.DateTimeFormat(ctx.locale, customTimeStyle)
        : getDateTimeFormatter(ctx.formatters, ctx.locale, node.style, "time")
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
      // Check for custom style first
      const customListStyle = node.style ? ctx.customStyles.list[node.style] : undefined
      const formatter = customListStyle
        ? new Intl.ListFormat(ctx.locale, customListStyle)
        : getListFormatter(ctx.formatters, ctx.locale, node.style)
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
        // DurationFormat (Baseline 2025) - runtime check for older environments
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
/**
 * Creates the compilation context from options.
 */
function createCompileContext(options: CompileIcuOptions): CompileContext {
  const { locale, numberStyles, dateStyles, timeStyles, listStyles } = options
  return {
    locale,
    pluralFn: getPluralFunction(locale),
    pluralCategories: getPluralCategories(locale),
    pluralValue: null,
    pluralOffset: 0,
    formatters: createFormatterCache(),
    hasTags: false,
    customStyles: {
      number: numberStyles ?? {},
      date: dateStyles ?? {},
      time: timeStyles ?? {},
      list: listStyles ?? {}
    }
  }
}

/**
 * Creates the final message function from compiled parts.
 */
function createMessageFunction(parts: unknown[], ctx: CompileContext): CompiledMessageFunction {
  // If no dynamic parts, return static string
  if (parts.every((p) => typeof p === "string")) {
    const staticResult = parts.join("")
    return () => staticResult
  }

  // If tags were used, we might return an array
  if (ctx.hasTags) {
    return (values?: MessageValues) => {
      const result = resolveWithTags(parts, values)
      if (result.every((r) => typeof r === "string")) {
        return result.join("")
      }
      return result
    }
  }

  return createResolver(parts)
}

export function compileIcu(message: string, options: CompileIcuOptions): CompiledMessageFunction {
  const { strict = true } = options

  // Parse the ICU message
  const result = parseIcu(message)

  if (!result.success) {
    if (strict) {
      throw new Error(`Failed to parse ICU message: ${result.errors[0]?.message}`)
    }
    return () => message
  }

  // Create compilation context and compile
  const ctx = createCompileContext(options)
  const parts = compileNodes(result.ast, ctx)

  return createMessageFunction(parts, ctx)
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

/**
 * Creates a pre-configured ICU compiler with custom styles.
 *
 * Use this factory when you want to define format styles once and reuse them
 * across your application. This avoids passing the same options to every
 * `compileIcu` call.
 *
 * @example
 * // Define once in your i18n config
 * export const compile = createIcuCompiler({
 *   locale: "de",
 *   numberStyles: {
 *     bytes: { style: "unit", unit: "byte", unitDisplay: "narrow" },
 *     filesize: { style: "unit", unit: "kilobyte", unitDisplay: "short" }
 *   },
 *   dateStyles: {
 *     iso: { year: "numeric", month: "2-digit", day: "2-digit" }
 *   }
 * })
 *
 * // Use everywhere
 * const msg = compile("{size, number, bytes}")
 * msg({ size: 1024 }) // → "1,024B"
 */
export function createIcuCompiler(
  options: CompileIcuOptions
): (message: string) => CompiledMessageFunction {
  return (message: string) => compileIcu(message, options)
}
