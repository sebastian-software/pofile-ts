import type { CreateItemOptions, PoItem, SerializeOptions } from "./types"
import { formatKeyword, DEFAULT_SERIALIZE_OPTIONS } from "./serialization"
import { escapeString } from "./utils"

/**
 * Creates a new translation item with default values.
 */
export function createItem(options?: CreateItemOptions): PoItem {
  const npluralsValue = options?.nplurals
  const npluralsNumber = Number(npluralsValue)

  return {
    msgid: "",
    msgctxt: null,
    references: [],
    msgid_plural: null,
    msgstr: [],
    comments: [],
    extractedComments: [],
    flags: {},
    obsolete: false,
    nplurals: isNaN(npluralsNumber) ? 2 : npluralsNumber
  }
}

/**
 * Serializes an item to PO file format.
 *
 * @param item - The translation item to serialize
 * @param options - Serialization options for controlling output format
 */
// eslint-disable-next-line complexity -- optimized for performance
export function stringifyItem(item: PoItem, options?: SerializeOptions): string {
  const lines: string[] = []
  const obsoletePrefix = item.obsolete ? "#~ " : ""

  // Comments (order: translator, extracted, references, flags)
  for (const c of item.comments) {
    lines.push(c ? "# " + c : "#")
  }
  for (const c of item.extractedComments) {
    lines.push(c ? "#. " + c : "#.")
  }
  for (const ref of item.references) {
    lines.push("#: " + ref)
  }

  // Collect active flags without creating intermediate arrays
  let flagStr = ""
  for (const flag in item.flags) {
    if (item.flags[flag]) {
      flagStr += (flagStr ? "," : "") + flag
    }
  }
  if (flagStr) {
    lines.push("#, " + flagStr)
  }

  // Message fields
  if (item.msgctxt != null) {
    appendKeyword(lines, "msgctxt", item.msgctxt, obsoletePrefix, options)
  }

  appendKeyword(lines, "msgid", item.msgid, obsoletePrefix, options)

  if (item.msgid_plural != null) {
    appendKeyword(lines, "msgid_plural", item.msgid_plural, obsoletePrefix, options)
  }

  appendMsgstr(lines, item, obsoletePrefix, options)

  return lines.join("\n")
}

/** Appends a single keyword line to the output */
function appendKeyword(
  lines: string[],
  keyword: string,
  text: string,
  prefix: string,
  options?: SerializeOptions
): void {
  const formatted = formatKeyword(keyword, text, undefined, options)
  lines.push(prefix + formatted.join("\n" + prefix))
}

/** Appends msgstr line(s) to the output, handling plurals */
function appendMsgstr(
  lines: string[],
  item: PoItem,
  prefix: string,
  options?: SerializeOptions
): void {
  const hasPlural = item.msgid_plural != null
  const msgstrLen = item.msgstr.length

  if (msgstrLen > 1) {
    appendMultipleMsgstr(lines, item.msgstr, prefix, options)
  } else if (hasPlural && (msgstrLen === 0 || !item.msgstr[0])) {
    appendEmptyMsgstr(lines, item.nplurals, prefix)
  } else {
    appendSingleMsgstr(lines, item, hasPlural, prefix, options)
  }
}

/** Handles multiple msgstr entries (plurals with translations) */
function appendMultipleMsgstr(
  lines: string[],
  msgstr: string[],
  prefix: string,
  options?: SerializeOptions
): void {
  const foldLength = options?.foldLength ?? DEFAULT_SERIALIZE_OPTIONS.foldLength
  // msgstr[0] " = 10 chars + content + closing quote
  const maxLen = foldLength > 0 ? foldLength - 12 : Infinity
  const len = msgstr.length

  // Try fast path: build all lines in one pass, bail to slow path if needed
  for (let i = 0; i < len; i++) {
    const text = msgstr[i] ?? ""

    // Check if we need the slow path (newlines or too long)
    if (text.length > maxLen || text.includes("\n")) {
      // Slow path: use formatKeyword for remaining entries
      appendMsgstrSlow(lines, msgstr, i, prefix, options)
      return
    }

    // Fast path: direct string construction
    lines.push(prefix + "msgstr[" + String(i) + '] "' + escapeString(text) + '"')
  }
}

/** Slow path for msgstr with complex content (starting from index) */
function appendMsgstrSlow(
  lines: string[],
  msgstr: string[],
  startIndex: number,
  prefix: string,
  options?: SerializeOptions
): void {
  for (let i = startIndex; i < msgstr.length; i++) {
    const formatted = formatKeyword("msgstr", msgstr[i] ?? "", i, options)
    lines.push(prefix + formatted.join("\n" + prefix))
  }
}

/** Handles single msgstr (possibly with index 0 for plurals) */
function appendSingleMsgstr(
  lines: string[],
  item: PoItem,
  hasPlural: boolean,
  prefix: string,
  options?: SerializeOptions
): void {
  const index = hasPlural ? 0 : undefined
  const text = item.msgstr.length === 1 ? (item.msgstr[0] ?? "") : item.msgstr.join("")
  const formatted = formatKeyword("msgstr", text, index, options)
  lines.push(prefix + formatted.join("\n" + prefix))
}

/** Appends empty msgstr[n] lines for untranslated plurals */
function appendEmptyMsgstr(lines: string[], nplurals: number, prefix: string): void {
  for (let i = 0; i < nplurals; i++) {
    lines.push(prefix + "msgstr[" + String(i) + '] ""')
  }
}
