/**
 * ICU MessageFormat AST types.
 */

/**
 * Node types in the ICU MessageFormat AST.
 */
export type IcuNodeType =
  | "literal"
  | "argument"
  | "number"
  | "date"
  | "time"
  | "list"
  | "duration"
  | "relativeTime"
  | "displayNames"
  | "select"
  | "plural"
  | "pound"
  | "tag"

/**
 * Source location in the message string.
 */
export interface IcuLocation {
  start: IcuPosition
  end: IcuPosition
}

export interface IcuPosition {
  /** Offset in UTF-16 code units */
  offset: number
  /** 1-based line number */
  line: number
  /** 1-based column (in Unicode code points) */
  column: number
}

/**
 * Base interface for all AST nodes.
 */
interface IcuNodeBase {
  type: IcuNodeType
}

/**
 * Literal text node.
 */
export interface IcuLiteralNode extends IcuNodeBase {
  type: "literal"
  value: string
}

/**
 * Simple argument: {name}
 */
export interface IcuArgumentNode extends IcuNodeBase {
  type: "argument"
  value: string
}

/**
 * Number format: {n, number} or {n, number, style}
 *
 * Style can be a named format (e.g. "currency", "percent") or a skeleton
 * (e.g. "::currency/EUR"). The parser treats both as opaque strings -
 * interpretation is up to the runtime.
 */
export interface IcuNumberNode extends IcuNodeBase {
  type: "number"
  value: string
  style: string | null
}

/**
 * Date format: {d, date} or {d, date, style}
 *
 * Style can be a named format (e.g. "short", "medium", "tablecell") or
 * a skeleton (e.g. "::yyyyMMdd"). The parser treats both as opaque strings.
 */
export interface IcuDateNode extends IcuNodeBase {
  type: "date"
  value: string
  style: string | null
}

/**
 * Time format: {t, time} or {t, time, style}
 *
 * Style can be a named format or skeleton. The parser treats both as opaque strings.
 */
export interface IcuTimeNode extends IcuNodeBase {
  type: "time"
  value: string
  style: string | null
}

/**
 * List format: {items, list} or {items, list, style}
 *
 * Formats arrays using Intl.ListFormat.
 * Style can be: conjunction (default), disjunction, unit
 *
 * @example
 * {items, list} → "Alice, Bob, and Charlie"
 * {items, list, disjunction} → "Alice, Bob, or Charlie"
 * {items, list, unit} → "Alice, Bob, Charlie"
 */
export interface IcuListNode extends IcuNodeBase {
  type: "list"
  value: string
  style: string | null
}

/**
 * Duration format: {d, duration} or {d, duration, style}
 *
 * Formats duration objects using Intl.DurationFormat.
 * Style can be: long, short, narrow, digital
 *
 * @example
 * {time, duration} → "2 hours, 30 minutes"
 * {time, duration, short} → "2 hr, 30 min"
 * {time, duration, narrow} → "2h 30m"
 */
export interface IcuDurationNode extends IcuNodeBase {
  type: "duration"
  value: string
  style: string | null
}

/**
 * Relative time format: {val, relativeTime, unit}
 *
 * Formats relative time using Intl.RelativeTimeFormat.
 * Unit is required: second, minute, hour, day, week, month, quarter, year
 * Style can be appended after unit: day long, day short, day narrow
 *
 * @example
 * {days, relativeTime, day} → "in 3 days" or "3 days ago"
 * {hours, relativeTime, hour short} → "in 2 hr."
 */
export interface IcuRelativeTimeNode extends IcuNodeBase {
  type: "relativeTime"
  value: string
  /** The time unit and optional style, e.g. "day", "hour short" */
  style: string | null
}

/**
 * Display names format: {code, displayNames, type}
 *
 * Formats codes to localized display names using Intl.DisplayNames.
 * Type is required: language, region, script, currency, calendar, dateTimeField
 *
 * @example
 * {lang, displayNames, language} → "English" (for "en")
 * {country, displayNames, region} → "Germany" (for "DE")
 * {cur, displayNames, currency} → "Euro" (for "EUR")
 */
export interface IcuDisplayNamesNode extends IcuNodeBase {
  type: "displayNames"
  value: string
  /** The display names type, e.g. "language", "region", "currency" */
  style: string | null
}

/**
 * Plural or selectordinal argument.
 */
export interface IcuPluralNode extends IcuNodeBase {
  type: "plural"
  value: string
  options: Record<string, IcuPluralOption>
  offset: number
  pluralType: "cardinal" | "ordinal"
}

/**
 * Select argument.
 */
export interface IcuSelectNode extends IcuNodeBase {
  type: "select"
  value: string
  options: Record<string, IcuSelectOption>
}

/**
 * Option in a plural/select.
 */
export interface IcuPluralOption {
  value: IcuNode[]
}

export interface IcuSelectOption {
  value: IcuNode[]
}

/**
 * The # symbol in plural, replaced with the count.
 */
export interface IcuPoundNode extends IcuNodeBase {
  type: "pound"
}

/**
 * XML-like tag: <b>content</b>
 */
export interface IcuTagNode extends IcuNodeBase {
  type: "tag"
  value: string
  children: IcuNode[]
}

/**
 * Union of all ICU AST node types.
 */
export type IcuNode =
  | IcuLiteralNode
  | IcuArgumentNode
  | IcuNumberNode
  | IcuDateNode
  | IcuTimeNode
  | IcuListNode
  | IcuDurationNode
  | IcuRelativeTimeNode
  | IcuDisplayNamesNode
  | IcuSelectNode
  | IcuPluralNode
  | IcuPoundNode
  | IcuTagNode

/**
 * Parser options.
 */
export interface IcuParserOptions {
  /**
   * Whether to treat HTML/XML tags as literal text.
   * When true, `<b>text</b>` is parsed as a literal string.
   * When false (default), it's parsed as a tag node.
   * @default false
   */
  ignoreTag?: boolean

  /**
   * Whether select/plural must have an 'other' clause.
   * @default true
   */
  requiresOtherClause?: boolean
}

/**
 * Parser error kinds.
 */
export type IcuErrorKind = "SYNTAX_ERROR"

/**
 * Parser error.
 */
export interface IcuParseError {
  kind: IcuErrorKind
  message: string
  location: IcuLocation
}

/**
 * Parser result - either success with AST or error.
 */
export type IcuParseResult =
  | { success: true; ast: IcuNode[]; errors: [] }
  | { success: false; ast: null; errors: IcuParseError[] }
