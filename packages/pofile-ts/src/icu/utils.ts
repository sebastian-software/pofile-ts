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

function extractVariablesFromAst(nodes: IcuNode[]): string[] {
  const variables = new Set<string>()

  // eslint-disable-next-line complexity -- node type switch
  function visit(node: IcuNode) {
    switch (node.type) {
      case "argument":
      case "number":
      case "date":
      case "time":
        variables.add(node.value)
        break

      case "plural":
      case "select":
        variables.add(node.value)
        // Visit nested options
        for (const option of Object.values(node.options)) {
          for (const child of option.value) {
            visit(child)
          }
        }
        break

      case "tag":
        for (const child of node.children) {
          visit(child)
        }
        break
    }
  }

  for (const node of nodes) {
    visit(node)
  }

  return [...variables]
}

function extractVariableInfoFromAst(nodes: IcuNode[]): IcuVariable[] {
  const variables: IcuVariable[] = []
  const seen = new Set<string>()

  // eslint-disable-next-line complexity -- node type switch with type inference
  function visit(node: IcuNode) {
    switch (node.type) {
      case "argument":
        if (!seen.has(node.value)) {
          seen.add(node.value)
          variables.push({ name: node.value, type: "argument" })
        }
        break

      case "number":
        if (!seen.has(node.value)) {
          seen.add(node.value)
          variables.push({ name: node.value, type: "number", style: node.style ?? undefined })
        }
        break

      case "date":
        if (!seen.has(node.value)) {
          seen.add(node.value)
          variables.push({ name: node.value, type: "date", style: node.style ?? undefined })
        }
        break

      case "time":
        if (!seen.has(node.value)) {
          seen.add(node.value)
          variables.push({ name: node.value, type: "time", style: node.style ?? undefined })
        }
        break

      case "plural":
        if (!seen.has(node.value)) {
          seen.add(node.value)
          variables.push({ name: node.value, type: "plural" })
        }
        // Visit nested options
        for (const option of Object.values(node.options)) {
          for (const child of option.value) {
            visit(child)
          }
        }
        break

      case "select":
        if (!seen.has(node.value)) {
          seen.add(node.value)
          variables.push({ name: node.value, type: "select" })
        }
        // Visit nested options
        for (const option of Object.values(node.options)) {
          for (const child of option.value) {
            visit(child)
          }
        }
        break

      case "tag":
        for (const child of node.children) {
          visit(child)
        }
        break
    }
  }

  for (const node of nodes) {
    visit(node)
  }

  return variables
}

function containsNodeType(nodes: IcuNode[], type: IcuNodeType): boolean {
  function check(node: IcuNode): boolean {
    if (node.type === type) {
      return true
    }

    switch (node.type) {
      case "plural":
      case "select":
        for (const option of Object.values(node.options)) {
          for (const child of option.value) {
            if (check(child)) {
              return true
            }
          }
        }
        break

      case "tag":
        for (const child of node.children) {
          if (check(child)) {
            return true
          }
        }
        break
    }

    return false
  }

  return nodes.some(check)
}

function containsOrdinalPlural(nodes: IcuNode[]): boolean {
  // eslint-disable-next-line complexity
  function check(node: IcuNode): boolean {
    if (node.type === "plural" && node.pluralType === "ordinal") {
      return true
    }

    switch (node.type) {
      case "plural":
      case "select":
        for (const option of Object.values(node.options)) {
          for (const child of option.value) {
            if (check(child)) {
              return true
            }
          }
        }
        break

      case "tag":
        for (const child of node.children) {
          if (check(child)) {
            return true
          }
        }
        break
    }

    return false
  }

  return nodes.some(check)
}
