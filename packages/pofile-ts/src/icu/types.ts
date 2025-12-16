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
