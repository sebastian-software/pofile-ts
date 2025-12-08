import type { ItemOptions } from "./types"
import { formatKeyword, formatKeywordWithLineBreaks } from "./serialization"

/**
 * Represents a single translation entry in a PO file.
 *
 * Each item contains:
 * - Source string (msgid) and optional plural form (msgid_plural)
 * - Translated string(s) (msgstr)
 * - Optional context (msgctxt) for disambiguation
 * - Metadata: references, comments, flags
 */
export class Item {
  /** The source string to translate */
  msgid = ""

  /** Message context for disambiguation */
  msgctxt: string | null = null

  /** Source file references (e.g., "src/app.ts:42") */
  references: string[] = []

  /** Plural form of the source string */
  msgid_plural: string | null = null

  /** Translated string(s). Multiple entries for plural forms. */
  msgstr: string[] = []

  /** Translator comments (lines starting with #) */
  comments: string[] = []

  /** Automatically extracted comments (lines starting with #.) */
  extractedComments: string[] = []

  /** Flags like "fuzzy", "no-wrap", etc. */
  flags: Record<string, boolean> = {}

  /** Whether this entry is marked as obsolete (#~) */
  obsolete = false

  /** Number of plural forms for this item's language */
  nplurals: number

  constructor(options?: ItemOptions) {
    const npluralsValue = options?.nplurals
    const npluralsNumber = Number(npluralsValue)
    this.nplurals = isNaN(npluralsNumber) ? 2 : npluralsNumber
  }

  /** Serializes this item to PO file format */
  toString(): string {
    const lines: string[] = []
    const obsoletePrefix = this.obsolete ? "#~ " : ""

    // Comments (order: translator, extracted, references, flags)
    this.comments.forEach((c) => lines.push("# " + c))
    this.extractedComments.forEach((c) => lines.push("#. " + c))
    this.references.forEach((ref) => lines.push("#: " + ref))

    const activeFlags = Object.keys(this.flags).filter((f) => Boolean(this.flags[f]))
    if (activeFlags.length > 0) {
      lines.push("#, " + activeFlags.join(","))
    }

    // Message fields
    if (this.msgctxt != null) {
      this.appendKeyword(lines, "msgctxt", this.msgctxt, obsoletePrefix)
    }

    this.appendKeyword(lines, "msgid", this.msgid, obsoletePrefix)

    if (this.msgid_plural != null) {
      this.appendKeyword(lines, "msgid_plural", this.msgid_plural, obsoletePrefix)
    }

    this.appendMsgstr(lines, obsoletePrefix)

    return lines.join("\n")
  }

  /** Appends a single keyword line to the output */
  private appendKeyword(lines: string[], keyword: string, text: string, prefix: string): void {
    const formatted = formatKeywordWithLineBreaks(keyword, text)
    lines.push(prefix + formatted.join("\n" + prefix))
  }

  /** Appends msgstr line(s) to the output, handling plurals */
  private appendMsgstr(lines: string[], prefix: string): void {
    const hasTranslation = this.msgstr.some((t) => t)
    const hasPlural = this.msgid_plural != null

    if (this.msgstr.length > 1) {
      // Multiple msgstr entries (plurals with translations)
      this.msgstr.forEach((text, i) => {
        const formatted = formatKeywordWithLineBreaks("msgstr", text, i)
        lines.push(prefix + formatted.join("\n" + prefix))
      })
    } else if (hasPlural && !hasTranslation) {
      // Plural form but no translations yet - output empty msgstr[n] for each plural
      for (let i = 0; i < this.nplurals; i++) {
        const formatted = formatKeyword("msgstr", "", i)
        lines.push(prefix + formatted.join(""))
      }
    } else {
      // Single msgstr (possibly with index 0 for plurals)
      const index = hasPlural ? 0 : undefined
      const text = this.msgstr.join("")
      const formatted = formatKeywordWithLineBreaks("msgstr", text, index)
      lines.push(prefix + formatted.join("\n" + prefix))
    }
  }
}

