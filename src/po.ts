import * as fs from "node:fs"
import type { Headers, ParsedPluralForms } from "./types"
import { DEFAULT_HEADERS } from "./constants"
import { Item } from "./Item"
import { splitHeaderAndBody, parseHeaders, parseItems } from "./parser"

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
