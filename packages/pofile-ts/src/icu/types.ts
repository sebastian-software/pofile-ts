/**
 * ICU MessageFormat AST types.
 */

// ============================================================================
// Style types for extended format nodes (aligned with Intl APIs)
// ============================================================================

/**
 * List format type (Intl.ListFormatType).
 * - conjunction: "A, B, and C"
 * - disjunction: "A, B, or C"
 * - unit: "A, B, C"
 */
export type IcuListType = "conjunction" | "disjunction" | "unit"

/**
 * Duration format style.
 * Note: Intl.DurationFormat is still a stage 3 proposal.
 */
export type IcuDurationStyle = "long" | "short" | "narrow" | "digital"

/**
 * Relative time unit (Intl.RelativeTimeFormatUnit).
 */
export type IcuRelativeTimeUnit =
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year"

/**
 * Relative time format style (Intl.RelativeTimeFormatStyle).
 */
export type IcuRelativeTimeStyle = "long" | "short" | "narrow"

/**
 * Display names type (Intl.DisplayNamesType).
 */
export type IcuDisplayNamesType =
  | "language"
  | "region"
  | "script"
  | "currency"
  | "calendar"
  | "dateTimeField"

// ============================================================================
// Node types
// ============================================================================

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
  | "ago"
  | "name"
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
 * List format: {items, list} or {items, list, type}
 *
 * Formats arrays using Intl.ListFormat.
 *
 * @example
 * {items, list} → "Alice, Bob, and Charlie"
 * {items, list, disjunction} → "Alice, Bob, or Charlie"
 * {items, list, unit} → "Alice, Bob, Charlie"
 */
export interface IcuListNode extends IcuNodeBase {
  type: "list"
  value: string
  /** List format type. Default: "conjunction" */
  style: IcuListType | null
}

/**
 * Duration format: {d, duration} or {d, duration, style}
 *
 * Formats duration objects using Intl.DurationFormat.
 *
 * @example
 * {time, duration} → "2 hours, 30 minutes"
 * {time, duration, short} → "2 hr, 30 min"
 * {time, duration, narrow} → "2h 30m"
 */
export interface IcuDurationNode extends IcuNodeBase {
  type: "duration"
  value: string
  /** Duration format style. Default: "long" */
  style: IcuDurationStyle | null
}

/**
 * Relative time format: {val, ago, unit} or {val, ago, unit style}
 *
 * Formats relative time using Intl.RelativeTimeFormat.
 *
 * @example
 * {days, ago, day} → "in 3 days" or "3 days ago"
 * {hours, ago, hour short} → "in 2 hr."
 */
export interface IcuAgoNode extends IcuNodeBase {
  type: "ago"
  value: string
  /** Unit and optional style, e.g. "day", "hour short" */
  style: IcuAgoStyle | null
}

/**
 * Combined unit and style for ago format.
 * Format: "unit" or "unit style" (e.g. "day", "hour short")
 */
export type IcuAgoStyle =
  | `${IcuRelativeTimeUnit}`
  | `${IcuRelativeTimeUnit} ${IcuRelativeTimeStyle}`

/**
 * Display names format: {code, name, type}
 *
 * Formats codes to localized display names using Intl.DisplayNames.
 *
 * @example
 * {lang, name, language} → "English" (for "en")
 * {country, name, region} → "Germany" (for "DE")
 * {cur, name, currency} → "Euro" (for "EUR")
 */
export interface IcuNameNode extends IcuNodeBase {
  type: "name"
  value: string
  /** Display names type. Default: "language" */
  style: IcuDisplayNamesType | null
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
  | IcuAgoNode
  | IcuNameNode
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
