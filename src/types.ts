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
export interface ItemOptions {
  nplurals?: number | string
}

/**
 * Internal parser state during PO file parsing
 */
export interface ParserState {
  item: import("./Item").Item
  context: "msgid" | "msgid_plural" | "msgstr" | "msgctxt" | null
  plural: number
  obsoleteCount: number
  noCommentLineCount: number
}
