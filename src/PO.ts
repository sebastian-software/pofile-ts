import type { ParsedPluralForms, PoFile } from "./types"
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
  // Normalize line endings
  data = data.replace(/\r\n/g, "\n")

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
 */
export function stringifyPo(po: PoFile): string {
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
    lines.push(stringifyItem(item))
    lines.push("")
  }

  return lines.join("\n")
}

/** Returns header keys in the correct order */
function getOrderedHeaderKeys(po: PoFile): string[] {
  const result: string[] = []

  // First, add keys from headerOrder that still exist
  for (const key of po.headerOrder) {
    if (key in po.headers) {
      result.push(key)
    }
  }

  // Then add any new keys not in headerOrder
  for (const key of Object.keys(po.headers)) {
    if (!result.includes(key)) {
      result.push(key)
    }
  }

  return result
}
