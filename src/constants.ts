import type { Headers } from "./types"

/**
 * Default headers for a new PO file
 */
export const DEFAULT_HEADERS: Headers = {
  "Project-Id-Version": "",
  "Report-Msgid-Bugs-To": "",
  "POT-Creation-Date": "",
  "PO-Revision-Date": "",
  "Last-Translator": "",
  Language: "",
  "Language-Team": "",
  "Content-Type": "",
  "Content-Transfer-Encoding": "",
  "Plural-Forms": ""
}

/**
 * Map of special characters to their escape sequences (for serialization)
 */
export const ESCAPE_MAP: Record<string, string> = {
  "\x07": "\\a",
  "\b": "\\b",
  "\t": "\\t",
  "\v": "\\v",
  "\f": "\\f",
  "\r": "\\r"
}

/**
 * Map of escape sequences to their actual characters (for parsing)
 */
export const UNESCAPE_MAP: Record<string, string> = {
  a: "\x07",
  b: "\b",
  t: "\t",
  n: "\n",
  v: "\v",
  f: "\f",
  r: "\r"
}

