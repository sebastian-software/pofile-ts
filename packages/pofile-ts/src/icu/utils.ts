/**
 * ICU MessageFormat utility functions.
 *
 * Convenience APIs for working with ICU messages.
 */

import type { IcuNode, IcuNodeType, IcuParseError, IcuParserOptions } from "./types"
import { parseIcu } from "./parser"

/**
 * Information about a variable in an ICU message.
 */
export interface IcuVariable {
  /** Variable name */
  name: string
  /** Variable type: argument, number, date, time, plural, select */
  type: "argument" | "number" | "date" | "time" | "plural" | "select"
  /** Format style (for number/date/time) */
  style?: string
}

/**
 * Validation result for an ICU message.
 */
export interface IcuValidationResult {
  /** Whether the message is valid */
  valid: boolean
  /** Validation errors (if any) */
  errors: IcuParseError[]
}

/**
 * Comparison result between source and translation variables.
 */
export interface IcuVariableComparison {
  /** Variables in source but missing in translation */
  missing: string[]
  /** Variables in translation but not in source */
  extra: string[]
  /** Whether the variables match exactly */
  isMatch: boolean
}

/**
 * Extract all variable names from an ICU message.
 *
 * @example
 * extractVariables("Hello {name}, you have {count, plural, one {# msg} other {# msgs}}")
 * // → ["name", "count"]
 *
 * @example
 * extractVariables("{date, date, short} at {time, time}")
 * // → ["date", "time"]
 */
export function extractVariables(message: string): string[] {
  const result = parseIcu(message, { requiresOtherClause: false })
  if (!result.success) {
    return []
  }
  return extractVariablesFromAst(result.ast)
}

/**
 * Extract variable information from an ICU message.
 * Returns detailed info about each variable including type and style.
 *
 * @example
 * extractVariableInfo("{price, number, currency}")
 * // → [{ name: "price", type: "number", style: "currency" }]
 */
export function extractVariableInfo(message: string): IcuVariable[] {
  const result = parseIcu(message, { requiresOtherClause: false })
  if (!result.success) {
    return []
  }
  return extractVariableInfoFromAst(result.ast)
}

/**
 * Validate an ICU message string.
 *
 * @example
 * validateIcu("{count, plural, one {#} other {#}}")
 * // → { valid: true, errors: [] }
 *
 * @example
 * validateIcu("{unclosed")
 * // → { valid: false, errors: [{ kind: "EXPECT_ARGUMENT_CLOSING_BRACE", ... }] }
 */
export function validateIcu(message: string, options?: IcuParserOptions): IcuValidationResult {
  const result = parseIcu(message, options)
  return {
    valid: result.success,
    errors: result.success ? [] : result.errors
  }
}

/**
 * Compare variables between source and translation messages.
 * Useful for detecting missing or extra placeholders in translations.
 *
 * @example
 * compareVariables(
 *   "Hello {name}, you have {count} messages",
 *   "Hallo {name}, du hast {count} Nachrichten"
 * )
 * // → { missing: [], extra: [], isMatch: true }
 *
 * @example
 * compareVariables(
 *   "Hello {name}",
 *   "Hallo {userName}"
 * )
 * // → { missing: ["name"], extra: ["userName"], isMatch: false }
 */
export function compareVariables(source: string, translation: string): IcuVariableComparison {
  const sourceVars = new Set(extractVariables(source))
  const translationVars = new Set(extractVariables(translation))

  const missing = [...sourceVars].filter((v) => !translationVars.has(v))
  const extra = [...translationVars].filter((v) => !sourceVars.has(v))

  return {
    missing,
    extra,
    isMatch: missing.length === 0 && extra.length === 0
  }
}

/**
 * Check if a message contains ICU plural syntax (cardinal or ordinal).
 */
export function hasPlural(message: string): boolean {
  const result = parseIcu(message, { requiresOtherClause: false })
  if (!result.success) {
    return false
  }
  return containsNodeType(result.ast, "plural")
}

/**
 * Check if a message contains ICU selectordinal syntax.
 * Note: selectordinal is internally stored as a plural node with pluralType: "ordinal".
 */
export function hasSelectOrdinal(message: string): boolean {
  const result = parseIcu(message, { requiresOtherClause: false })
  if (!result.success) {
    return false
  }
  return containsOrdinalPlural(result.ast)
}

/**
 * Check if a message contains ICU select syntax.
 */
export function hasSelect(message: string): boolean {
  const result = parseIcu(message, { requiresOtherClause: false })
  if (!result.success) {
    return false
  }
  return containsNodeType(result.ast, "select")
}

/**
 * Check if a message contains any ICU syntax (variables, plural, select, etc.).
 * Returns false for plain text.
 */
export function hasIcuSyntax(message: string): boolean {
  const result = parseIcu(message, { requiresOtherClause: false, ignoreTag: true })
  if (!result.success) {
    return false
  }
  return result.ast.some((node) => node.type !== "literal")
}

// --- Internal helpers ---

/** Node types that have a variable name in the `value` field */
const VARIABLE_NODE_TYPES = new Set([
  "argument",
  "number",
  "date",
  "time",
  "list",
  "duration",
  "ago",
  "name",
  "plural",
  "select"
])

/** Checks if a node type has a variable name */
function hasVariableName(node: IcuNode): node is IcuNode & { value: string } {
  return VARIABLE_NODE_TYPES.has(node.type) && "value" in node && typeof node.value === "string"
}

/** Recursively visits all nodes and calls the callback */
function forEachNode(nodes: IcuNode[], callback: (node: IcuNode) => void): void {
  for (const node of nodes) {
    callback(node)
    forEachNode(getChildNodes(node), callback)
  }
}

function extractVariablesFromAst(nodes: IcuNode[]): string[] {
  const variables = new Set<string>()

  forEachNode(nodes, (node) => {
    if (hasVariableName(node)) {
      variables.add(node.value)
    }
  })

  return [...variables]
}

/** Maps node types to their variable type */
const NODE_TYPE_TO_VARIABLE_TYPE: Record<string, IcuVariable["type"] | undefined> = {
  argument: "argument",
  number: "number",
  date: "date",
  time: "time",
  list: "argument",
  duration: "argument",
  ago: "argument",
  name: "argument",
  plural: "plural",
  select: "select"
}

/** Node types that have a style property */
const STYLED_NODE_TYPES = new Set(["number", "date", "time", "list", "duration", "ago", "name"])

/** Extracts variable info from a single node */
function nodeToVariable(node: IcuNode): IcuVariable | null {
  const variableType = NODE_TYPE_TO_VARIABLE_TYPE[node.type]
  if (!variableType || !hasVariableName(node)) {
    return null
  }

  const style =
    STYLED_NODE_TYPES.has(node.type) && "style" in node ? (node.style ?? undefined) : undefined
  return { name: node.value, type: variableType, style }
}

function extractVariableInfoFromAst(nodes: IcuNode[]): IcuVariable[] {
  const variables: IcuVariable[] = []
  const seen = new Set<string>()

  forEachNode(nodes, (node) => {
    const variable = nodeToVariable(node)
    if (variable && !seen.has(variable.name)) {
      seen.add(variable.name)
      variables.push(variable)
    }
  })

  return variables
}

/** Gets child nodes from a node for recursive traversal */
function getChildNodes(node: IcuNode): IcuNode[] {
  switch (node.type) {
    case "plural":
    case "select":
      return Object.values(node.options).flatMap((opt) => opt.value)
    case "tag":
      return node.children
    default:
      return []
  }
}

/** Recursively checks if any node matches the predicate */
function someNode(nodes: IcuNode[], predicate: (node: IcuNode) => boolean): boolean {
  for (const node of nodes) {
    if (predicate(node)) {
      return true
    }
    if (someNode(getChildNodes(node), predicate)) {
      return true
    }
  }
  return false
}

function containsNodeType(nodes: IcuNode[], type: IcuNodeType): boolean {
  return someNode(nodes, (node) => node.type === type)
}

function containsOrdinalPlural(nodes: IcuNode[]): boolean {
  return someNode(nodes, (node) => node.type === "plural" && node.pluralType === "ordinal")
}
