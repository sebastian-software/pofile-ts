import type { ParserState, PoFile, PoItem } from "./types"
import { createItem } from "./Item"
import { trim, extractString } from "./utils"

/**
 * Splits PO file content into header section and body lines.
 */
export function splitHeaderAndBody(data: string): {
  headerSection: string
  bodyLines: string[]
} {
  const sections = data.split(/\n\n/)
  const headerParts: string[] = []

  // Collect sections until we find one with 'msgid ""'
  while (sections[0]) {
    const hasHeaderMsgid = headerParts.some((h) => h.includes('msgid ""'))
    if (hasHeaderMsgid) {
      break
    }

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
 * Parses the header section and populates the PO file.
 */
export function parseHeaders(headerSection: string, po: PoFile): void {
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
function parseHeaderLine(line: string, po: PoFile): void {
  const cleaned = line.trim().replace(/^"/, "").replace(/\\n"$/, "")
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
  po: PoFile,
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
  po: PoFile,
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
  po: PoFile,
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
function parseFlags(line: string, item: PoItem): void {
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
