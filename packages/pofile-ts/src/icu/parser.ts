/**
 * ICU MessageFormat v1 Parser.
 *
 * A minimal, zero-dependency parser for ICU MessageFormat strings.
 * Optimized for small bundle size (~3kb gzipped).
 *
 * Supported syntax:
 * - Simple arguments: {name}
 * - Formatted: {n, number}, {d, date, short}, {t, time, medium}
 * - Skeletons: {n, number, ::currency/EUR} (as opaque string)
 * - Plural: {n, plural, offset:1 =0 {...} one {...} other {...}}
 * - Select: {gender, select, male {...} female {...} other {...}}
 * - Selectordinal: {n, selectordinal, one {#st} two {#nd} ...}
 * - Tags: <b>bold</b>, <0>numbered</0>
 * - Escaping: '' → literal ', '{text}' → literal text
 *
 * Trade-offs for bundle size / complexity:
 * - Modern JS only (no IE11 polyfills)
 * - No location tracking (typical messages are single-line anyway)
 * - Styles/skeletons stored as opaque strings (runtime handles interpretation)
 * - Quoting only escapes ICU special chars ({, }, <, >, #), not arbitrary text
 *
 * @see https://unicode-org.github.io/icu/userguide/format_parse/messages/
 */

import type {
  IcuNode,
  IcuLiteralNode,
  IcuNumberNode,
  IcuDateNode,
  IcuTimeNode,
  IcuSelectNode,
  IcuPluralNode,
  IcuTagNode,
  IcuPluralOption,
  IcuSelectOption,
  IcuParserOptions,
  IcuParseResult
} from "./types"

// Character classification helpers (clearer than inline regex)
// Accept undefined for safe indexed access (returns false for undefined)
function isWhitespace(ch: string | undefined): ch is string {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r"
}

function isAlpha(ch: string | undefined): ch is string {
  return ch != null && ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z"))
}

function isDigit(ch: string | undefined): ch is string {
  return ch != null && ch >= "0" && ch <= "9"
}

function isIdentifierChar(ch: string | undefined): ch is string {
  // Everything except: whitespace, {, }, #, <, >, comma, :
  return (
    ch != null &&
    ch > " " &&
    ch !== "{" &&
    ch !== "}" &&
    ch !== "#" &&
    ch !== "<" &&
    ch !== ">" &&
    ch !== "," &&
    ch !== ":"
  )
}

function isTagChar(ch: string | undefined): boolean {
  if (ch == null) {
    return false
  }
  return isAlpha(ch) || isDigit(ch) || ch === "-" || ch === "." || ch === ":" || ch === "_"
}

type ArgType = "plural" | "selectordinal" | ""

/**
 * ICU syntax error thrown during parsing.
 */
export class IcuSyntaxError extends Error {
  constructor(
    message: string,
    public readonly offset: number
  ) {
    super(`ICU syntax error at position ${offset}: ${message}`)
    this.name = "IcuSyntaxError"
  }
}

/**
 * ICU MessageFormat Parser.
 */
export class IcuParser {
  private pos = 0
  private readonly msg: string
  private readonly ignoreTag: boolean
  private readonly requiresOther: boolean

  constructor(message: string, options: IcuParserOptions = {}) {
    this.msg = message
    this.ignoreTag = options.ignoreTag ?? false
    this.requiresOther = options.requiresOtherClause ?? true
  }

  parse(): IcuNode[] {
    const result = this.parseMessage(0, "")
    if (this.pos < this.msg.length) {
      this.error("Unexpected character")
    }
    return result
  }

  // eslint-disable-next-line complexity -- parser dispatch logic
  private parseMessage(depth: number, parentArg: ArgType): IcuNode[] {
    const nodes: IcuNode[] = []
    const inPlural = parentArg === "plural" || parentArg === "selectordinal"

    while (this.pos < this.msg.length) {
      const ch = this.msg[this.pos]

      if (ch === "{") {
        nodes.push(this.parseArgument(depth))
      } else if (ch === "}" && depth > 0) {
        break
      } else if (ch === "#" && inPlural) {
        this.pos++
        nodes.push({ type: "pound" })
      } else if (ch === "<" && !this.ignoreTag) {
        const next = this.msg[this.pos + 1]
        // Support both alphabetic tags (<b>, <link>) and numeric tags (<0>, <1> - Lingui style)
        if (next && (isAlpha(next) || isDigit(next))) {
          nodes.push(this.parseTag(depth, parentArg))
        } else if (next === "/") {
          break // Closing tag - handled by parseTag
        } else {
          nodes.push(this.parseLiteral(depth, inPlural))
        }
      } else {
        nodes.push(this.parseLiteral(depth, inPlural))
      }
    }

    return nodes
  }

  // eslint-disable-next-line complexity -- argument type dispatch logic
  private parseArgument(depth: number): IcuNode {
    const start = this.pos
    this.pos++ // skip {
    this.skipWhitespace()

    if (this.msg[this.pos] === "}") {
      this.error("Empty argument", start)
    }

    const name = this.parseIdentifier()
    if (!name) {
      this.error("Expected argument name", start)
    }

    this.skipWhitespace()

    // Simple argument: {name}
    if (this.msg[this.pos] === "}") {
      this.pos++
      return { type: "argument", value: name }
    }

    // Formatted: {name, type, ...}
    if (this.msg[this.pos] !== ",") {
      this.error("Expected ',' or '}'", start)
    }
    this.pos++ // skip ,
    this.skipWhitespace()

    const argType = this.parseIdentifier()
    if (!argType) {
      this.error("Expected argument type", start)
    }

    // ICU keywords are case-insensitive per spec
    const argTypeLower = argType.toLowerCase()

    switch (argTypeLower) {
      case "number":
      case "date":
      case "time":
        return this.parseFormattedArg(argTypeLower, name, start)
      case "plural":
      case "selectordinal":
        return this.parsePlural(argTypeLower, name, depth, start)
      case "select":
        return this.parseSelect(name, depth, start)
      default:
        this.error(`Invalid argument type: ${argType}`, start)
    }
  }

  private parseFormattedArg(
    argType: "number" | "date" | "time",
    name: string,
    start: number
  ): IcuNumberNode | IcuDateNode | IcuTimeNode {
    this.skipWhitespace()
    let style: string | null = null

    if (this.msg[this.pos] === ",") {
      this.pos++
      this.skipWhitespace()
      style = this.parseStyle()
      if (!style) {
        this.error("Expected style", start)
      }
    }

    this.expectChar("}", start)

    return { type: argType, value: name, style } as IcuNumberNode | IcuDateNode | IcuTimeNode
  }

  private parsePlural(
    argType: "plural" | "selectordinal",
    name: string,
    depth: number,
    start: number
  ): IcuPluralNode {
    this.skipWhitespace()
    this.expectChar(",", start)
    this.skipWhitespace()

    let offset = 0

    // Check for offset:N
    const maybeOffset = this.parseIdentifier()
    if (maybeOffset === "offset") {
      this.expectChar(":", start)
      this.skipWhitespace()
      offset = this.parseInteger()
      this.skipWhitespace()
    } else if (maybeOffset) {
      // Not offset, rewind
      this.pos -= maybeOffset.length
    }

    const options = this.parsePluralOptions(depth, argType)
    this.expectChar("}", start)

    return {
      type: "plural",
      value: name,
      options,
      offset,
      pluralType: argType === "plural" ? "cardinal" : "ordinal"
    }
  }

  private parseSelect(name: string, depth: number, start: number): IcuSelectNode {
    this.skipWhitespace()
    this.expectChar(",", start)
    this.skipWhitespace()

    const options = this.parseSelectOptions(depth)
    this.expectChar("}", start)

    return { type: "select", value: name, options }
  }

  private parsePluralOptions(depth: number, parentArg: ArgType): Record<string, IcuPluralOption> {
    const options: Record<string, IcuPluralOption> = {}
    const seen = new Set<string>()

    while (this.pos < this.msg.length && this.msg[this.pos] !== "}") {
      this.skipWhitespace()

      // Parse selector: one, other, =0, =1, etc.
      let selector: string
      if (this.msg[this.pos] === "=") {
        this.pos++
        const num = this.parseInteger()
        selector = `=${num}`
      } else {
        selector = this.parseIdentifier()
        if (!selector) {
          break
        }
      }

      if (seen.has(selector)) {
        this.error(`Duplicate selector: ${selector}`)
      }
      seen.add(selector)

      this.skipWhitespace()
      this.expectChar("{")
      const value = this.parseMessage(depth + 1, parentArg)
      this.expectChar("}")

      options[selector] = { value }
      this.skipWhitespace()
    }

    if (Object.keys(options).length === 0) {
      this.error("Expected at least one plural option")
    }
    if (this.requiresOther && !("other" in options)) {
      this.error("Missing 'other' clause")
    }

    return options
  }

  private parseSelectOptions(depth: number): Record<string, IcuSelectOption> {
    const options: Record<string, IcuSelectOption> = {}
    const seen = new Set<string>()

    while (this.pos < this.msg.length && this.msg[this.pos] !== "}") {
      this.skipWhitespace()

      const selector = this.parseIdentifier()
      if (!selector) {
        break
      }

      if (seen.has(selector)) {
        this.error(`Duplicate selector: ${selector}`)
      }
      seen.add(selector)

      this.skipWhitespace()
      this.expectChar("{")
      const value = this.parseMessage(depth + 1, "")
      this.expectChar("}")

      options[selector] = { value }
      this.skipWhitespace()
    }

    if (Object.keys(options).length === 0) {
      this.error("Expected at least one select option")
    }
    if (this.requiresOther && !("other" in options)) {
      this.error("Missing 'other' clause")
    }

    return options
  }

  private parseTag(depth: number, parentArg: ArgType): IcuTagNode | IcuLiteralNode {
    const start = this.pos
    this.pos++ // skip <

    const tagName = this.parseTagName()
    this.skipWhitespace()

    // Self-closing: <br/>
    if (this.msg.slice(this.pos, this.pos + 2) === "/>") {
      this.pos += 2
      return { type: "literal", value: `<${tagName}/>` }
    }

    // Opening tag: <b>
    this.expectChar(">", start)

    const children = this.parseMessage(depth + 1, parentArg)

    // Closing tag: </b>
    if (this.msg.slice(this.pos, this.pos + 2) !== "</") {
      this.error("Unclosed tag", start)
    }
    this.pos += 2

    const closingName = this.parseTagName()
    if (closingName !== tagName) {
      this.error(`Mismatched tag: expected </${tagName}>, got </${closingName}>`, start)
    }

    this.skipWhitespace()
    this.expectChar(">", start)

    return { type: "tag", value: tagName, children }
  }

  // eslint-disable-next-line complexity -- quote escaping state machine
  private parseLiteral(depth: number, inPlural: boolean): IcuLiteralNode {
    let value = ""

    while (this.pos < this.msg.length) {
      const ch = this.msg[this.pos]
      if (ch == null) {
        break
      }

      // End of literal
      if (ch === "{" || (ch === "}" && depth > 0)) {
        break
      }
      if (ch === "#" && inPlural) {
        break
      }
      if (ch === "<" && !this.ignoreTag) {
        const next = this.msg[this.pos + 1]
        // Support both alphabetic tags (<b>, <link>) and numeric tags (<0>, <1> - Lingui style)
        if ((next && (isAlpha(next) || isDigit(next))) || next === "/") {
          break
        }
      }

      // Quoting: '' → ' or '{...}' → {...}
      if (ch === "'") {
        const next = this.msg[this.pos + 1]
        if (next === "'") {
          // '' → '
          value += "'"
          this.pos += 2
        } else if (
          next === "{" ||
          next === "}" ||
          next === "<" ||
          next === ">" ||
          (next === "#" && inPlural)
        ) {
          // '{...}' or '<...>' etc. → literal until closing '
          this.pos++ // skip opening '
          while (this.pos < this.msg.length) {
            const quoted = this.msg[this.pos]
            if (quoted == null) {
              break
            }
            if (quoted === "'") {
              if (this.msg[this.pos + 1] === "'") {
                value += "'"
                this.pos += 2
              } else {
                this.pos++ // skip closing '
                break
              }
            } else {
              value += quoted
              this.pos++
            }
          }
        } else {
          value += ch
          this.pos++
        }
      } else {
        value += ch
        this.pos++
      }
    }

    return { type: "literal", value }
  }

  private parseStyle(): string {
    const start = this.pos
    let braceDepth = 0

    while (this.pos < this.msg.length) {
      const ch = this.msg[this.pos]
      if (ch === "'") {
        // Skip quoted content
        this.pos++
        while (this.pos < this.msg.length && this.msg[this.pos] !== "'") {
          this.pos++
        }
        if (this.pos < this.msg.length) {
          this.pos++
        }
      } else if (ch === "{") {
        braceDepth++
        this.pos++
      } else if (ch === "}") {
        if (braceDepth === 0) {
          break
        }
        braceDepth--
        this.pos++
      } else {
        this.pos++
      }
    }

    return this.msg.slice(start, this.pos).trim()
  }

  private parseIdentifier(): string {
    const start = this.pos
    while (this.pos < this.msg.length && isIdentifierChar(this.msg[this.pos])) {
      this.pos++
    }
    return this.msg.slice(start, this.pos)
  }

  private parseTagName(): string {
    const start = this.pos
    while (this.pos < this.msg.length) {
      const ch = this.msg[this.pos]
      if (!isTagChar(ch)) {
        break
      }
      this.pos++
    }
    return this.msg.slice(start, this.pos)
  }

  private parseInteger(): number {
    const start = this.pos
    let sign = 1
    if (this.msg[this.pos] === "-") {
      sign = -1
      this.pos++
    } else if (this.msg[this.pos] === "+") {
      this.pos++
    }

    const numStart = this.pos
    while (this.pos < this.msg.length && isDigit(this.msg[this.pos])) {
      this.pos++
    }

    if (this.pos === numStart) {
      this.error("Expected integer", start)
    }

    return sign * parseInt(this.msg.slice(numStart, this.pos), 10)
  }

  private skipWhitespace(): void {
    while (this.pos < this.msg.length && isWhitespace(this.msg[this.pos])) {
      this.pos++
    }
  }

  private expectChar(ch: string, errorPos?: number): void {
    if (this.msg[this.pos] !== ch) {
      this.error(`Expected '${ch}'`, errorPos)
    }
    this.pos++
  }

  private error(message: string, pos?: number): never {
    throw new IcuSyntaxError(message, pos ?? this.pos)
  }
}

/**
 * Parse an ICU MessageFormat string.
 *
 * @example
 * const result = parseIcu("Hello {name}!")
 * if (result.success) {
 *   console.log(result.ast)
 * }
 *
 * @example
 * const result = parseIcu("{count, plural, one {# item} other {# items}}")
 */
export function parseIcu(message: string, options?: IcuParserOptions): IcuParseResult {
  try {
    const ast = new IcuParser(message, options).parse()
    return { success: true, ast, errors: [] }
  } catch (e) {
    if (e instanceof IcuSyntaxError) {
      return {
        success: false,
        ast: null,
        errors: [
          {
            kind: "SYNTAX_ERROR",
            message: e.message,
            location: {
              start: { offset: e.offset, line: 1, column: e.offset + 1 },
              end: { offset: e.offset, line: 1, column: e.offset + 1 }
            }
          }
        ]
      }
    }
    throw e
  }
}
