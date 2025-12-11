import type { ParserState, PoFile, PoItem } from "./types"
import { createItem } from "./Item"
import { extractString } from "./utils"
import { RE_HEADER_MSGID, RE_HEADER_CONTINUATION, RE_HEADER_COMPLETE } from "./constants"

/**
 * Splits PO file content into header section and body lines.
 */
export function splitHeaderAndBody(data: string): {
  headerSection: string
  bodyLines: string[]
} {
  const sections = data.split("\n\n")
  const headerParts: string[] = []
  let foundHeaderMsgid = false

  // Collect sections until we find one with 'msgid ""'
  while (sections[0]) {
    if (foundHeaderMsgid) {
      break
    }

    if (RE_HEADER_MSGID.test(sections[0])) {
      // Found first real msgid, add dummy header marker
      headerParts.push('msgid ""')
      foundHeaderMsgid = true
    } else {
      const shifted = sections.shift()
      if (shifted !== undefined) {
        headerParts.push(shifted)
        if (shifted.includes('msgid ""')) {
          foundHeaderMsgid = true
        }
      }
    }
  }

  // Flatten remaining sections into lines without intermediate join
  const bodyLines: string[] = []
  for (const section of sections) {
    const lines = section.split("\n")
    for (const line of lines) {
      bodyLines.push(line)
    }
  }

  return {
    headerSection: headerParts.join("\n"),
    bodyLines
  }
}

/**
 * Parses the header section and populates the PO file.
 */
export function parseHeaders(headerSection: string, po: PoFile): void {
  const lines = mergeMultilineHeaders(headerSection.split("\n"))

  for (const line of lines) {
    if (line.startsWith("#.")) {
      po.extractedComments.push(line.slice(2).trim())
    } else if (line.startsWith("#")) {
      po.comments.push(line.slice(1).trim())
    } else if (line.startsWith('"')) {
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

    if (RE_HEADER_CONTINUATION.test(line) && !RE_HEADER_COMPLETE.test(line)) {
      pendingMerge = true
    }

    result.push(line)
  }

  return result
}

/**
 * Parses a single header line like "Content-Type: text/plain\n"
 */
function parseHeaderLine(line: string, po: PoFile): void {
  // Line format: "Header-Name: value\n" - extract content between quotes
  const trimmed = line.trim()
  // Skip opening quote, remove trailing \n" (3 chars: \, n, ")
  const endOffset = trimmed.endsWith('\\n"') ? 3 : 1
  const cleaned = trimmed.substring(1, trimmed.length - endOffset)

  const colonIndex = cleaned.indexOf(":")
  if (colonIndex === -1) {
    return
  }

  const name = cleaned.substring(0, colonIndex).trim()
  const value = cleaned.substring(colonIndex + 1).trim()

  po.headers[name] = value
  po.headerOrder.push(name)
}

/**
 * Parses item lines and populates the PO file.
 */
export function parseItems(lines: string[], po: PoFile, nplurals: string | undefined): void {
  const state: ParserState = {
    item: createItem({ nplurals }),
    context: null,
    plural: 0,
    obsoleteCount: 0,
    noCommentLineCount: 0
  }

  for (const rawLine of lines) {
    let line = rawLine.trim()

    // Handle obsolete markers inline to avoid object allocation
    if (line.startsWith("#~")) {
      line = line.substring(2).trim()
      state.obsoleteCount++
    }

    parseLine(line, state, po, nplurals)
  }

  // Finish last item
  finishItem(state, po, nplurals)
}

/**
 * Parses a single line and updates parser state.
 */
function parseLine(
  line: string,
  state: ParserState,
  po: PoFile,
  nplurals: string | undefined
): void {
  if (line.length === 0) {
    return
  }

  const firstChar = line[0]

  // Continuation line (starts with quote)
  if (firstChar === '"') {
    appendMultilineValue(line, state)
    return
  }

  // Comment line (starts with #)
  if (firstChar === "#") {
    parseCommentLine(line, state, po, nplurals)
    return
  }

  // Keyword line (starts with m for msgid/msgstr/msgctxt)
  if (firstChar === "m") {
    parseKeywordLine(line, state, po, nplurals)
  }
}

/**
 * Parses comment lines (#: #, # #.)
 * Assumes line starts with '#' (checked by caller).
 */
function parseCommentLine(
  line: string,
  state: ParserState,
  po: PoFile,
  nplurals: string | undefined
): void {
  const secondChar = line[1]

  if (secondChar === ":") {
    // Reference comment: #:
    finishItem(state, po, nplurals)
    state.item.references.push(line.slice(2).trim())
  } else if (secondChar === ",") {
    // Flags comment: #,
    finishItem(state, po, nplurals)
    parseFlags(line, state.item)
  } else if (secondChar === ".") {
    // Extracted comment: #.
    finishItem(state, po, nplurals)
    state.item.extractedComments.push(line.slice(2).trim())
  } else if (secondChar === undefined || secondChar === " ") {
    // Translator comment: # or #<space>
    finishItem(state, po, nplurals)
    state.item.comments.push(line.slice(1).trim())
  }
}

/**
 * Parses keyword lines (msgid, msgstr, etc.)
 * Assumes line starts with 'm' (checked by caller).
 */
function parseKeywordLine(
  line: string,
  state: ParserState,
  po: PoFile,
  nplurals: string | undefined
): void {
  // Check msgid_plural before msgid (longer match first)
  if (line.startsWith("msgid_plural")) {
    state.item.msgid_plural = extractString(line)
    state.context = "msgid_plural"
    state.noCommentLineCount++
  } else if (line.startsWith("msgid")) {
    finishItem(state, po, nplurals)
    state.item.msgid = extractString(line)
    state.context = "msgid"
    state.noCommentLineCount++
  } else if (line.startsWith("msgstr")) {
    // Fast path: check for plural index only if bracket present
    if (line[6] === "[") {
      const closeBracket = line.indexOf("]", 7)
      state.plural = closeBracket > 7 ? parseInt(line.substring(7, closeBracket), 10) : 0
    } else {
      state.plural = 0
    }
    state.item.msgstr[state.plural] = extractString(line)
    state.context = "msgstr"
    state.noCommentLineCount++
  } else if (line.startsWith("msgctxt")) {
    finishItem(state, po, nplurals)
    state.item.msgctxt = extractString(line)
    state.context = "msgctxt"
    state.noCommentLineCount++
  }
}

/**
 * Parses flag line and adds flags to item.
 */
function parseFlags(line: string, item: PoItem): void {
  const flags = line.slice(2).trim().split(",")
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
function finishItem(state: ParserState, po: PoFile, nplurals: string | undefined): void {
  if (state.item.msgid.length === 0) {
    return
  }

  if (state.obsoleteCount >= state.noCommentLineCount) {
    state.item.obsolete = true
  }

  po.items.push(state.item)

  // Reset state for next item
  state.item = createItem({ nplurals })
  state.context = null
  state.plural = 0
  state.obsoleteCount = 0
  state.noCommentLineCount = 0
}
