import * as fs from "node:fs"

// ============================================================================
// Types
// ============================================================================

export interface Headers {
  "Project-Id-Version": string
  "Report-Msgid-Bugs-To": string
  "POT-Creation-Date": string
  "PO-Revision-Date": string
  "Last-Translator": string
  Language: string
  "Language-Team": string
  "Content-Type": string
  "Content-Transfer-Encoding": string
  "Plural-Forms": string
  [name: string]: string
}

export interface ParsedPluralForms {
  nplurals: string | undefined
  plural: string | undefined
}

export interface ItemOptions {
  nplurals?: number | string
}

// ============================================================================
// Constants
// ============================================================================

/** Default headers for a new PO file */
const DEFAULT_HEADERS: Headers = {
  "Project-Id-Version": "",
  "Report-Msgid-Bugs-To": "",
  "POT-Creation-Date": "",
  "PO-Revision-Date": "",
  "Last-Translator": "",
  Language: "",
  "Language-Team": "",
  "Content-Type": "",
  "Content-Transfer-Encoding": "",
  "Plural-Forms": ""
}

/** Map of escape sequences for C-string encoding */
const ESCAPE_MAP: Record<string, string> = {
  "\x07": "\\a",
  "\b": "\\b",
  "\t": "\\t",
  "\v": "\\v",
  "\f": "\\f",
  "\r": "\\r"
}

/** Map of escape sequences for C-string decoding */
const UNESCAPE_MAP: Record<string, string> = {
  a: "\x07",
  b: "\b",
  t: "\t",
  n: "\n",
  v: "\v",
  f: "\f",
  r: "\r"
}

// ============================================================================
// String Utilities
// ============================================================================

/** Trims whitespace from both ends of a string */
function trim(str: string): string {
  return str.replace(/^\s+|\s+$/g, "")
}

/**
 * Escapes special characters in a string for PO file format.
 * Handles bell, backspace, tab, vertical tab, form feed, carriage return,
 * double quotes, and backslashes.
 */
function escapeString(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x07\b\t\v\f\r"\\]/g, (match) => {
    return ESCAPE_MAP[match] ?? "\\" + match
  })
}

/**
 * Unescapes C-style escape sequences in a string.
 * Handles: \a \b \t \n \v \f \r \' \" \\ \? and octal/hex escapes.
 */
function unescapeString(str: string): string {
  return str.replace(
    /\\([abtnvfr'"\\?]|([0-7]{3})|x([0-9a-fA-F]{2}))/g,
    (_, esc: string, oct: string | undefined, hex: string | undefined) => {
      if (oct) {
        return String.fromCharCode(parseInt(oct, 8))
      }
      if (hex) {
        return String.fromCharCode(parseInt(hex, 16))
      }
      return UNESCAPE_MAP[esc] ?? esc
    }
  )
}

/**
 * Extracts the string value from a PO line.
 * Removes the keyword prefix and surrounding quotes, then unescapes.
 */
function extractString(line: string): string {
  let str = trim(line)
  str = str.replace(/^[^"]*"|"$/g, "")
  return unescapeString(str)
}

// ============================================================================
// Serialization Helpers
// ============================================================================

/**
 * Formats a keyword and text into PO file lines.
 * Handles multi-line strings by splitting on newlines.
 */
function formatKeyword(keyword: string, text: string, index?: number): string[] {
  const lines: string[] = []
  const parts = text.split(/\n/)
  const indexStr = typeof index !== "undefined" ? `[${index}]` : ""

  if (parts.length > 1) {
    lines.push(`${keyword}${indexStr} ""`)
    for (const part of parts) {
      lines.push(`"${escapeString(part)}"`)
    }
  } else {
    lines.push(`${keyword}${indexStr} "${escapeString(text)}"`)
  }

  return lines
}

/**
 * Formats a keyword and text, adding \n to multi-line strings.
 */
function formatKeywordWithLineBreaks(keyword: string, text: string, index?: number): string[] {
  const lines = formatKeyword(keyword, text, index)

  // Add \n to all lines except first and last
  for (let i = 1; i < lines.length - 1; i++) {
    const current = lines[i]
    if (current) {
      lines[i] = current.slice(0, -1) + '\\n"'
    }
  }

  return lines
}

// ============================================================================
// Item Class
// ============================================================================

/**
 * Represents a single translation entry in a PO file.
 *
 * Each item contains:
 * - Source string (msgid) and optional plural form (msgid_plural)
 * - Translated string(s) (msgstr)
 * - Optional context (msgctxt) for disambiguation
 * - Metadata: references, comments, flags
 */
export class Item {
  /** The source string to translate */
  msgid = ""

  /** Message context for disambiguation */
  msgctxt: string | null = null

  /** Source file references (e.g., "src/app.ts:42") */
  references: string[] = []

  /** Plural form of the source string */
  msgid_plural: string | null = null

  /** Translated string(s). Multiple entries for plural forms. */
  msgstr: string[] = []

  /** Translator comments (lines starting with #) */
  comments: string[] = []

  /** Automatically extracted comments (lines starting with #.) */
  extractedComments: string[] = []

  /** Flags like "fuzzy", "no-wrap", etc. */
  flags: Record<string, boolean> = {}

  /** Whether this entry is marked as obsolete (#~) */
  obsolete = false

  /** Number of plural forms for this item's language */
  nplurals: number

  constructor(options?: ItemOptions) {
    const npluralsValue = options?.nplurals
    const npluralsNumber = Number(npluralsValue)
    this.nplurals = isNaN(npluralsNumber) ? 2 : npluralsNumber
  }

  /** Serializes this item to PO file format */
  toString(): string {
    const lines: string[] = []
    const obsoletePrefix = this.obsolete ? "#~ " : ""

    // Comments (order: translator, extracted, references, flags)
    this.comments.forEach((c) => lines.push("# " + c))
    this.extractedComments.forEach((c) => lines.push("#. " + c))
    this.references.forEach((ref) => lines.push("#: " + ref))

    const activeFlags = Object.keys(this.flags).filter((f) => Boolean(this.flags[f]))
    if (activeFlags.length > 0) {
      lines.push("#, " + activeFlags.join(","))
    }

    // Message fields
    if (this.msgctxt != null) {
      this.appendKeyword(lines, "msgctxt", this.msgctxt, obsoletePrefix)
    }

    this.appendKeyword(lines, "msgid", this.msgid, obsoletePrefix)

    if (this.msgid_plural != null) {
      this.appendKeyword(lines, "msgid_plural", this.msgid_plural, obsoletePrefix)
    }

    this.appendMsgstr(lines, obsoletePrefix)

    return lines.join("\n")
  }

  /** Appends a single keyword line to the output */
  private appendKeyword(lines: string[], keyword: string, text: string, prefix: string): void {
    const formatted = formatKeywordWithLineBreaks(keyword, text)
    lines.push(prefix + formatted.join("\n" + prefix))
  }

  /** Appends msgstr line(s) to the output, handling plurals */
  private appendMsgstr(lines: string[], prefix: string): void {
    const hasTranslation = this.msgstr.some((t) => t)
    const hasPlural = this.msgid_plural != null

    if (this.msgstr.length > 1) {
      // Multiple msgstr entries (plurals with translations)
      this.msgstr.forEach((text, i) => {
        const formatted = formatKeywordWithLineBreaks("msgstr", text, i)
        lines.push(prefix + formatted.join("\n" + prefix))
      })
    } else if (hasPlural && !hasTranslation) {
      // Plural form but no translations yet - output empty msgstr[n] for each plural
      for (let i = 0; i < this.nplurals; i++) {
        const formatted = formatKeyword("msgstr", "", i)
        lines.push(prefix + formatted.join(""))
      }
    } else {
      // Single msgstr (possibly with index 0 for plurals)
      const index = hasPlural ? 0 : undefined
      const text = this.msgstr.join("")
      const formatted = formatKeywordWithLineBreaks("msgstr", text, index)
      lines.push(prefix + formatted.join("\n" + prefix))
    }
  }
}

// ============================================================================
// Parser State
// ============================================================================

interface ParserState {
  item: Item
  context: "msgid" | "msgid_plural" | "msgstr" | "msgctxt" | null
  plural: number
  obsoleteCount: number
  noCommentLineCount: number
}

// ============================================================================
// PO Class
// ============================================================================

/**
 * Represents a complete PO (Portable Object) file.
 *
 * A PO file consists of:
 * - File-level comments and headers
 * - A list of translation items
 */
export class PO {
  /** Translator comments at the top of the file */
  comments: string[] = []

  /** Extracted comments at the top of the file */
  extractedComments: string[] = []

  /** PO file headers (Content-Type, Language, etc.) */
  headers: Partial<Headers> = {}

  /** Order of headers as they appeared in the source file */
  headerOrder: string[] = []

  /** Translation entries */
  items: Item[] = []

  /** Reference to the Item class for creating new items */
  static Item = Item

  /**
   * Parses the Plural-Forms header value.
   * Example: "nplurals=2; plural=(n != 1);"
   */
  static parsePluralForms(pluralFormsString: string | undefined): ParsedPluralForms {
    const parts = (pluralFormsString ?? "").split(";")
    const results: Record<string, string> = {}

    for (const part of parts) {
      const trimmed = part.trim()
      const eqIndex = trimmed.indexOf("=")
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim()
        const value = trimmed.substring(eqIndex + 1).trim()
        results[key] = value
      }
    }

    return {
      nplurals: results.nplurals,
      plural: results.plural
    }
  }

  /**
   * Parses a PO file string.
   */
  static parse(data: string): PO {
    // Normalize line endings
    data = data.replace(/\r\n/g, "\n")

    const po = new PO()
    const { headerSection, bodyLines } = splitHeaderAndBody(data)

    // Parse headers
    po.headers = { ...DEFAULT_HEADERS }
    parseHeaders(headerSection, po)

    // Parse items
    const nplurals = PO.parsePluralForms(po.headers["Plural-Forms"]).nplurals
    parseItems(bodyLines, po, nplurals)

    return po
  }

  /**
   * Loads a PO file from disk (Node.js only).
   */
  static load(
    filename: string,
    callback: (err: NodeJS.ErrnoException | null, po?: PO) => void
  ): void {
    fs.readFile(filename, "utf-8", (err, data) => {
      if (err) {
        callback(err)
        return
      }
      const po = PO.parse(data)
      callback(null, po)
    })
  }

  /**
   * Saves this PO file to disk (Node.js only).
   */
  save(filename: string, callback: (err: NodeJS.ErrnoException | null) => void): void {
    fs.writeFile(filename, this.toString(), callback)
  }

  /**
   * Serializes this PO file to a string.
   */
  toString(): string {
    const lines: string[] = []

    // File-level comments
    this.comments.forEach((c) => lines.push(("# " + c).trim()))
    this.extractedComments.forEach((c) => lines.push(("#. " + c).trim()))

    // Empty msgid/msgstr for headers
    lines.push('msgid ""')
    lines.push('msgstr ""')

    // Headers (preserve order, then add any new ones)
    const orderedKeys = this.getOrderedHeaderKeys()
    for (const key of orderedKeys) {
      lines.push(`"${key}: ${this.headers[key] ?? ""}\\n"`)
    }

    lines.push("")

    // Items
    for (const item of this.items) {
      lines.push(item.toString())
      lines.push("")
    }

    return lines.join("\n")
  }

  /** Returns header keys in the correct order */
  private getOrderedHeaderKeys(): string[] {
    const result: string[] = []

    // First, add keys from headerOrder that still exist
    for (const key of this.headerOrder) {
      if (key in this.headers) {
        result.push(key)
      }
    }

    // Then add any new keys not in headerOrder
    for (const key of Object.keys(this.headers)) {
      if (!result.includes(key)) {
        result.push(key)
      }
    }

    return result
  }
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Splits PO file content into header section and body lines.
 */
function splitHeaderAndBody(data: string): { headerSection: string; bodyLines: string[] } {
  const sections = data.split(/\n\n/)
  const headerParts: string[] = []

  // Collect sections until we find one with 'msgid ""'
  while (sections[0]) {
    const hasHeaderMsgid = headerParts.some((h) => h.includes('msgid ""'))
    if (hasHeaderMsgid) break

    if (/msgid\s+"[^"]/.exec(sections[0])) {
      // Found first real msgid, add dummy header marker
      headerParts.push('msgid ""')
    } else {
      const shifted = sections.shift()
      if (shifted !== undefined) {
        headerParts.push(shifted)
      }
    }
  }

  return {
    headerSection: headerParts.join("\n"),
    bodyLines: sections.join("\n").split(/\n/)
  }
}

/**
 * Parses the header section and populates the PO object.
 */
function parseHeaders(headerSection: string, po: PO): void {
  const lines = mergeMultilineHeaders(headerSection.split(/\n/))

  for (const line of lines) {
    if (/^#\./.exec(line)) {
      po.extractedComments.push(line.replace(/^#\.\s*/, ""))
    } else if (/^#/.exec(line)) {
      po.comments.push(line.replace(/^#\s*/, ""))
    } else if (/^"/.exec(line)) {
      parseHeaderLine(line, po)
    }
  }
}

/**
 * Merges multi-line header strings that don't end with \n.
 */
function mergeMultilineHeaders(lines: string[]): string[] {
  const result: string[] = []
  let pendingMerge = false

  for (let line of lines) {
    if (pendingMerge && result.length > 0) {
      const prev = result.pop()
      if (prev !== undefined) {
        line = prev.slice(0, -1) + line.slice(1)
      }
      pendingMerge = false
    }

    if (/^".*"$/.test(line) && !/^".*\\n"$/.test(line)) {
      pendingMerge = true
    }

    result.push(line)
  }

  return result
}

/**
 * Parses a single header line like "Content-Type: text/plain\n"
 */
function parseHeaderLine(line: string, po: PO): void {
  const cleaned = line.trim().replace(/^"/, "").replace(/\\n"$/, "")
  const colonIndex = cleaned.indexOf(":")
  if (colonIndex === -1) return

  const name = cleaned.substring(0, colonIndex).trim()
  const value = cleaned.substring(colonIndex + 1).trim()

  po.headers[name] = value
  po.headerOrder.push(name)
}

/**
 * Parses item lines and populates the PO object.
 */
function parseItems(lines: string[], po: PO, nplurals: string | undefined): void {
  const state: ParserState = {
    item: new Item({ nplurals }),
    context: null,
    plural: 0,
    obsoleteCount: 0,
    noCommentLineCount: 0
  }

  for (const rawLine of lines) {
    const { line, isObsolete } = preprocessLine(rawLine)
    parseLine(line, state, po, nplurals)

    if (isObsolete) {
      state.obsoleteCount++
    }
  }

  // Finish last item
  finishItem(state, po, nplurals)
}

/**
 * Preprocesses a line, handling obsolete markers.
 */
function preprocessLine(rawLine: string): { line: string; isObsolete: boolean } {
  let line = trim(rawLine)
  let isObsolete = false

  if (/^#~/.exec(line)) {
    line = trim(line.substring(2))
    isObsolete = true
  }

  return { line, isObsolete }
}

/**
 * Parses a single line and updates parser state.
 */
function parseLine(
  line: string,
  state: ParserState,
  po: PO,
  nplurals: string | undefined
): void {
  // Try parsing as comment first
  if (parseCommentLine(line, state, po, nplurals)) {
    return
  }

  // Then try parsing as keyword
  if (parseKeywordLine(line, state, po, nplurals)) {
    return
  }

  // Otherwise it's a continuation line
  if (line.length > 0) {
    appendMultilineValue(line, state)
  }
}

/**
 * Parses comment lines (#: #, # #.)
 * Returns true if line was handled.
 */
function parseCommentLine(
  line: string,
  state: ParserState,
  po: PO,
  nplurals: string | undefined
): boolean {
  if (/^#:/.exec(line)) {
    finishItem(state, po, nplurals)
    state.item.references.push(trim(line.replace(/^#:/, "")))
    return true
  }
  if (/^#,/.exec(line)) {
    finishItem(state, po, nplurals)
    parseFlags(line, state.item)
    return true
  }
  if (/^#($|\s+)/.exec(line)) {
    finishItem(state, po, nplurals)
    state.item.comments.push(trim(line.replace(/^#($|\s+)/, "")))
    return true
  }
  if (/^#\./.exec(line)) {
    finishItem(state, po, nplurals)
    state.item.extractedComments.push(trim(line.replace(/^#\./, "")))
    return true
  }
  return false
}

/**
 * Parses keyword lines (msgid, msgstr, etc.)
 * Returns true if line was handled.
 */
function parseKeywordLine(
  line: string,
  state: ParserState,
  po: PO,
  nplurals: string | undefined
): boolean {
  if (/^msgid_plural/.exec(line)) {
    state.item.msgid_plural = extractString(line)
    state.context = "msgid_plural"
    state.noCommentLineCount++
    return true
  }
  if (/^msgid/.exec(line)) {
    finishItem(state, po, nplurals)
    state.item.msgid = extractString(line)
    state.context = "msgid"
    state.noCommentLineCount++
    return true
  }
  if (/^msgstr/.exec(line)) {
    const match = /^msgstr\[(\d+)\]/.exec(line)
    state.plural = match?.[1] ? parseInt(match[1], 10) : 0
    state.item.msgstr[state.plural] = extractString(line)
    state.context = "msgstr"
    state.noCommentLineCount++
    return true
  }
  if (/^msgctxt/.exec(line)) {
    finishItem(state, po, nplurals)
    state.item.msgctxt = extractString(line)
    state.context = "msgctxt"
    state.noCommentLineCount++
    return true
  }
  return false
}

/**
 * Parses flag line and adds flags to item.
 */
function parseFlags(line: string, item: Item): void {
  const flags = trim(line.replace(/^#,/, "")).split(",")
  for (const flag of flags) {
    item.flags[flag.trim()] = true
  }
}

/**
 * Appends a continuation line to the current context.
 */
function appendMultilineValue(line: string, state: ParserState): void {
  state.noCommentLineCount++
  const value = extractString(line)

  switch (state.context) {
    case "msgstr":
      state.item.msgstr[state.plural] = (state.item.msgstr[state.plural] ?? "") + value
      break
    case "msgid":
      state.item.msgid += value
      break
    case "msgid_plural":
      state.item.msgid_plural = (state.item.msgid_plural ?? "") + value
      break
    case "msgctxt":
      state.item.msgctxt = (state.item.msgctxt ?? "") + value
      break
  }
}

/**
 * Finishes the current item and prepares for the next one.
 */
function finishItem(state: ParserState, po: PO, nplurals: string | undefined): void {
  if (state.item.msgid.length === 0) return

  if (state.obsoleteCount >= state.noCommentLineCount) {
    state.item.obsolete = true
  }

  po.items.push(state.item)

  // Reset state for next item
  state.item = new Item({ nplurals })
  state.context = null
  state.plural = 0
  state.obsoleteCount = 0
  state.noCommentLineCount = 0
}

export default PO
