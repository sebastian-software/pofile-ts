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

  /**
   * Custom metadata as key-value pairs.
   *
   * Useful for tool integration, tracking translation sources, timestamps, etc.
   * Serialized as `#@ key: value` comments in PO files.
   *
   * @example
   * metadata: {
   *   origin: "LLM",
   *   modified: "2024-01-15",
   *   confidence: "0.95"
   * }
   */
  metadata: Record<string, string>

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

/**
 * Tracks which Intl formatters are used during compilation.
 * Used for generating formatter declarations in static code output.
 */
export interface FormatterUsage {
  number: Set<string>
  date: Set<string>
  time: Set<string>
  list: Set<string>
  ago: Set<string>
  name: Set<string>
}

/**
 * Options for serializing PO files.
 *
 * These options control the output format when converting a PoFile object
 * back to a string. The defaults are optimized for compatibility with
 * translation platforms like Crowdin.
 */
export interface SerializeOptions {
  /**
   * Maximum line width before folding long strings.
   *
   * When a string exceeds this length, it will be split across multiple lines.
   * Set to 0 to disable folding (strings will only break on actual newlines).
   *
   * @default 80
   *
   * @example
   * // With foldLength: 40
   * msgid "This is a long string that will be "
   * "folded across multiple lines"
   *
   * // With foldLength: 0
   * msgid "This is a long string that stays on one line"
   */
  foldLength?: number

  /**
   * Use compact format for multiline strings.
   *
   * When true (default), multiline strings start with content on the first line:
   * ```po
   * msgid "First line\n"
   * "Second line"
   * ```
   *
   * When false, uses GNU gettext's traditional format with an empty first line:
   * ```po
   * msgid ""
   * "First line\n"
   * "Second line"
   * ```
   *
   * The compact format is recommended as it's compatible with translation
   * platforms like Crowdin that may strip empty first lines, avoiding
   * unnecessary diffs. Both formats are valid PO syntax.
   *
   * @default true
   *
   * @see https://github.com/lingui/js-lingui/issues/2235
   */
  compactMultiline?: boolean
}
