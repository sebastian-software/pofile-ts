import type { Headers } from "./types"

// =============================================================================
// Pre-compiled regex patterns for parser performance
// =============================================================================

/** Matches reference comments: #: */
export const RE_REFERENCE = /^#:/

/** Matches flag comments: #, */
export const RE_FLAGS = /^#,/

/** Matches translator comments: # or #  */
export const RE_COMMENT = /^#($|\s+)/

/** Matches extracted comments: #. */
export const RE_EXTRACTED = /^#\./

/** Matches obsolete markers: #~ */
export const RE_OBSOLETE = /^#~/

/** Matches msgid_plural keyword */
export const RE_MSGID_PLURAL = /^msgid_plural/

/** Matches msgid keyword */
export const RE_MSGID = /^msgid/

/** Matches msgstr keyword with optional plural index */
export const RE_MSGSTR = /^msgstr/

/** Extracts plural index from msgstr[n] */
export const RE_MSGSTR_INDEX = /^msgstr\[(\d+)\]/

/** Matches msgctxt keyword */
export const RE_MSGCTXT = /^msgctxt/

/** Matches header msgid "" line */
export const RE_HEADER_MSGID = /msgid\s+"[^"]/

/** Matches quoted header line */
export const RE_QUOTED_LINE = /^"/

/** Matches header line without trailing \n */
export const RE_HEADER_CONTINUATION = /^".*"$/

/** Matches header line with trailing \n */
export const RE_HEADER_COMPLETE = /^".*\\n"$/

/** Matches escape sequences for unescaping */
export const RE_UNESCAPE = /\\([abtnvfr'"\\?]|([0-7]{1,3})|x([0-9a-fA-F]{2}))/g

/** Matches characters that need escaping */
// eslint-disable-next-line no-control-regex
export const RE_ESCAPE = /[\x07\b\t\v\f\r"\\]/g

// =============================================================================
// Default headers
// =============================================================================

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
  "\r": "\\r",
  '"': '\\"',
  "\\": "\\\\"
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
