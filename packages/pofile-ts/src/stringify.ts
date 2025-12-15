import type { Headers, PoFile, SerializeOptions } from "./types"
import { stringifyItem } from "./Item"

/** Appends file-level comments to lines array */
function appendFileComments(lines: string[], po: Partial<PoFile>): void {
  for (const comment of po.comments ?? []) {
    lines.push(comment ? "# " + comment : "#")
  }
  for (const comment of po.extractedComments ?? []) {
    lines.push(comment ? "#. " + comment : "#.")
  }
}

/** Appends header section to lines array */
function appendHeaders(lines: string[], po: Partial<PoFile>): void {
  lines.push('msgid ""')
  lines.push('msgstr ""')

  const headers = po.headers ?? {}
  const orderedKeys = getOrderedHeaderKeys({
    headers,
    headerOrder: po.headerOrder ?? []
  })
  for (const key of orderedKeys) {
    lines.push(`"${key}: ${headers[key] ?? ""}\\n"`)
  }
  lines.push("")
}

/**
 * Serializes a PoFile structure to a string.
 *
 * Accepts partial input - missing fields default to empty arrays/objects.
 *
 * @param po - The PO file structure to serialize (can be partial)
 * @param options - Serialization options for controlling output format
 *
 * @example
 * // Default: compact format, 80 char fold length (Crowdin-compatible)
 * const output = stringifyPo(po)
 *
 * @example
 * // Partial input - only headers and items required
 * const output = stringifyPo({ headers: myHeaders, items: myItems })
 *
 * @example
 * // GNU gettext traditional format
 * const output = stringifyPo(po, { compactMultiline: false })
 *
 * @example
 * // No line folding
 * const output = stringifyPo(po, { foldLength: 0 })
 */
export function stringifyPo(po: Partial<PoFile>, options?: SerializeOptions): string {
  const lines: string[] = []

  appendFileComments(lines, po)
  appendHeaders(lines, po)

  for (const item of po.items ?? []) {
    lines.push(stringifyItem(item, options))
    lines.push("")
  }

  return lines.join("\n")
}

/** Returns header keys in the correct order */
function getOrderedHeaderKeys(po: { headers: Partial<Headers>; headerOrder: string[] }): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  // First, add keys from headerOrder that still exist
  for (const key of po.headerOrder) {
    if (key in po.headers) {
      result.push(key)
      seen.add(key)
    }
  }

  // Then add any new keys not in headerOrder
  for (const key of Object.keys(po.headers)) {
    if (!seen.has(key)) {
      result.push(key)
    }
  }

  return result
}
