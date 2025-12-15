/**
 * ICU MessageFormat AST types.
 *
 * Compatible with @formatjs/icu-messageformat-parser output structure,
 * but simplified for our use case.
 */

/**
 * Node types in the ICU MessageFormat AST.
 */
export const IcuNodeType = {
  /** Raw text */
  literal: 0,
  /** Simple variable: {name} */
  argument: 1,
  /** Number format: {n, number} or {n, number, currency} */
  number: 2,
  /** Date format: {d, date} or {d, date, short} */
  date: 3,
  /** Time format: {t, time} or {t, time, medium} */
  time: 4,
  /** Select: {gender, select, male {...} female {...} other {...}} */
  select: 5,
  /** Plural/selectordinal: {n, plural, one {...} other {...}} */
  plural: 6,
  /** The # symbol inside plural, replaced with the count */
  pound: 7,
  /** XML-like tag: <b>...</b> */
  tag: 8
} as const

export type IcuNodeType = (typeof IcuNodeType)[keyof typeof IcuNodeType]

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
  type: typeof IcuNodeType.literal
  value: string
}

/**
 * Simple argument: {name}
 */
export interface IcuArgumentNode extends IcuNodeBase {
  type: typeof IcuNodeType.argument
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
  type: typeof IcuNodeType.number
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
  type: typeof IcuNodeType.date
  value: string
  style: string | null
}

/**
 * Time format: {t, time} or {t, time, style}
 *
 * Style can be a named format or skeleton. The parser treats both as opaque strings.
 */
export interface IcuTimeNode extends IcuNodeBase {
  type: typeof IcuNodeType.time
  value: string
  style: string | null
}

/**
 * Plural or selectordinal argument.
 */
export interface IcuPluralNode extends IcuNodeBase {
  type: typeof IcuNodeType.plural
  value: string
  options: Record<string, IcuPluralOption>
  offset: number
  pluralType: "cardinal" | "ordinal"
}

/**
 * Select argument.
 */
export interface IcuSelectNode extends IcuNodeBase {
  type: typeof IcuNodeType.select
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
  type: typeof IcuNodeType.pound
}

/**
 * XML-like tag: <b>content</b>
 */
export interface IcuTagNode extends IcuNodeBase {
  type: typeof IcuNodeType.tag
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
export const IcuErrorKind = {
  /** Generic syntax error */
  SYNTAX_ERROR: "SYNTAX_ERROR"
} as const

export type IcuErrorKind = (typeof IcuErrorKind)[keyof typeof IcuErrorKind]

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
