import type { ParsedPluralForms, PoFile, SerializeOptions } from "./types"
import { DEFAULT_HEADERS } from "./constants"
import { stringifyItem } from "./Item"
import { splitHeaderAndBody, parseHeaders, parseItems } from "./parser"

/**
 * Parses the Plural-Forms header value.
 * Example: "nplurals=2; plural=(n != 1);"
 */
export function parsePluralForms(pluralFormsString: string | undefined): ParsedPluralForms {
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
 * Creates a new empty PO file structure with default headers.
 */
export function createPoFile(): PoFile {
  return {
    comments: [],
    extractedComments: [],
    headers: { ...DEFAULT_HEADERS },
    headerOrder: [],
    items: []
  }
}

/**
 * Parses a PO file string into a PoFile structure.
 */
export function parsePo(data: string): PoFile {
  // Normalize line endings (Windows CRLF to Unix LF)
  if (data.includes("\r\n")) {
    data = data.replaceAll("\r\n", "\n")
  }

  const po = createPoFile()
  const { headerSection, bodyLines } = splitHeaderAndBody(data)

  // Parse headers
  parseHeaders(headerSection, po)

  // Parse items
  const nplurals = parsePluralForms(po.headers["Plural-Forms"]).nplurals
  parseItems(bodyLines, po, nplurals)

  return po
}

/**
 * Serializes a PoFile structure to a string.
 *
 * @param po - The PO file structure to serialize
 * @param options - Serialization options for controlling output format
 *
 * @example
 * // Default: compact format, 80 char fold length (Crowdin-compatible)
 * const output = stringifyPo(po)
 *
 * @example
 * // GNU gettext traditional format
 * const output = stringifyPo(po, { compactMultiline: false })
 *
 * @example
 * // No line folding
 * const output = stringifyPo(po, { foldLength: 0 })
 */
export function stringifyPo(po: PoFile, options?: SerializeOptions): string {
  const lines: string[] = []

  // File-level comments
  for (const comment of po.comments) {
    lines.push(("# " + comment).trim())
  }
  for (const comment of po.extractedComments) {
    lines.push(("#. " + comment).trim())
  }

  // Empty msgid/msgstr for headers
  lines.push('msgid ""')
  lines.push('msgstr ""')

  // Headers (preserve order, then add any new ones)
  const orderedKeys = getOrderedHeaderKeys(po)
  for (const key of orderedKeys) {
    lines.push(`"${key}: ${po.headers[key] ?? ""}\\n"`)
  }

  lines.push("")

  // Items
  for (const item of po.items) {
    lines.push(stringifyItem(item, options))
    lines.push("")
  }

  return lines.join("\n")
}

/** Returns header keys in the correct order */
function getOrderedHeaderKeys(po: PoFile): string[] {
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
