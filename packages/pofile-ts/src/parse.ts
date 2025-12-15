import type { PoFile } from "./types"
import { DEFAULT_HEADERS } from "./internal/constants"
import { splitHeaderAndBody, parseHeaders, parseItems } from "./internal/parser"
import { parsePluralForms } from "./plurals"

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
