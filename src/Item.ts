import type { CreateItemOptions, PoItem, SerializeOptions } from "./types"
import { formatKeyword } from "./serialization"

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
export function stringifyItem(item: PoItem, options?: SerializeOptions): string {
  const lines: string[] = []
  const obsoletePrefix = item.obsolete ? "#~ " : ""

  // Comments (order: translator, extracted, references, flags)
  for (const c of item.comments) {
    lines.push("# " + c)
  }
  for (const c of item.extractedComments) {
    lines.push("#. " + c)
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

  if (item.msgstr.length > 1) {
    // Multiple msgstr entries (plurals with translations)
    for (let i = 0; i < item.msgstr.length; i++) {
      const formatted = formatKeyword("msgstr", item.msgstr[i] ?? "", i, options)
      lines.push(prefix + formatted.join("\n" + prefix))
    }
  } else if (hasPlural && !item.msgstr.some((t) => t)) {
    // Plural form but no translations yet - output empty msgstr[n] for each plural
    for (let i = 0; i < item.nplurals; i++) {
      const formatted = formatKeyword("msgstr", "", i, options)
      lines.push(prefix + formatted.join(""))
    }
  } else {
    // Single msgstr (possibly with index 0 for plurals)
    const index = hasPlural ? 0 : undefined
    const text = item.msgstr.join("")
    const formatted = formatKeyword("msgstr", text, index, options)
    lines.push(prefix + formatted.join("\n" + prefix))
  }
}
