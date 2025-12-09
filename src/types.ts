/**
 * Standard PO file headers
 */
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

/**
 * Result of parsing the Plural-Forms header
 */
export interface ParsedPluralForms {
  nplurals: string | undefined
  plural: string | undefined
}

/**
 * Options for creating a new Item
 */
export interface CreateItemOptions {
  nplurals?: number | string
}

/**
 * Represents a single translation entry in a PO file.
 */
export interface PoItem {
  /** The source string to translate */
  msgid: string

  /** Message context for disambiguation */
  msgctxt: string | null

  /** Source file references (e.g., "src/app.ts:42") */
  references: string[]

  /** Plural form of the source string */
  msgid_plural: string | null

  /** Translated string(s). Multiple entries for plural forms. */
  msgstr: string[]

  /** Translator comments (lines starting with #) */
  comments: string[]

  /** Automatically extracted comments (lines starting with #.) */
  extractedComments: string[]

  /** Flags like "fuzzy", "no-wrap", etc. */
  flags: Record<string, boolean>

  /** Whether this entry is marked as obsolete (#~) */
  obsolete: boolean

  /** Number of plural forms for this item's language */
  nplurals: number
}

/**
 * Represents a complete PO (Portable Object) file.
 */
export interface PoFile {
  /** Translator comments at the top of the file */
  comments: string[]

  /** Extracted comments at the top of the file */
  extractedComments: string[]

  /** PO file headers (Content-Type, Language, etc.) */
  headers: Partial<Headers>

  /** Order of headers as they appeared in the source file */
  headerOrder: string[]

  /** Translation entries */
  items: PoItem[]
}

/**
 * Internal parser state during PO file parsing
 */
export interface ParserState {
  item: PoItem
  context: "msgid" | "msgid_plural" | "msgstr" | "msgctxt" | null
  plural: number
  obsoleteCount: number
  noCommentLineCount: number
}
