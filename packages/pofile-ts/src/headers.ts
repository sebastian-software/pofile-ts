/**
 * Default headers helper for creating PO files.
 */

import { getPluralCount } from "./plurals"
import type { Headers } from "./types"

/**
 * Options for creating default PO file headers.
 */
export interface CreateHeadersOptions {
  /**
   * Target language code (e.g., "de", "fr", "en-US")
   */
  language?: string

  /**
   * Generator tool name
   * @default "pofile-ts"
   */
  generator?: string

  /**
   * Project name and version
   * @default ""
   */
  projectIdVersion?: string

  /**
   * Email for reporting msgid bugs
   * @default ""
   */
  reportBugsTo?: string

  /**
   * Translator name and email
   * @default ""
   */
  lastTranslator?: string

  /**
   * Translation team name
   * @default ""
   */
  languageTeam?: string

  /**
   * Plural forms expression (e.g., "nplurals=2; plural=(n != 1);")
   * If not provided but language is set, auto-generates from CLDR.
   * Set to `false` to explicitly omit the header.
   */
  pluralForms?: string | false

  /**
   * Custom headers to add or override
   */
  custom?: Record<string, string>
}

/**
 * Formats a date in PO file format: "YYYY-MM-DD HH:MM+ZZZZ"
 *
 * @example
 * formatPoDate(new Date("2025-12-11T14:30:00+01:00"))
 * // → "2025-12-11 14:30+0100"
 */
export function formatPoDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")

  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? "+" : "-"
  const offsetHours = pad(Math.floor(Math.abs(offset) / 60))
  const offsetMins = pad(Math.abs(offset) % 60)

  return `${year}-${month}-${day} ${hours}:${minutes}${sign}${offsetHours}${offsetMins}`
}

/** Builds the base headers object */
function buildBaseHeaders(options: CreateHeadersOptions, now: string): Partial<Headers> {
  return {
    "Project-Id-Version": options.projectIdVersion ?? "",
    "Report-Msgid-Bugs-To": options.reportBugsTo ?? "",
    "POT-Creation-Date": now,
    "PO-Revision-Date": now,
    "Last-Translator": options.lastTranslator ?? "",
    Language: options.language ?? "",
    "Language-Team": options.languageTeam ?? "",
    "MIME-Version": "1.0",
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Transfer-Encoding": "8bit",
    "X-Generator": options.generator ?? "pofile-ts"
  }
}

/**
 * Generates a minimal Plural-Forms header from CLDR data.
 * Only includes nplurals - plural expression is a simple fallback.
 */
function generatePluralFormsHeader(language: string): string {
  const nplurals = getPluralCount(language)
  // Simple expression that works for 1-2 forms
  // For 3+ forms, tools should use their own CLDR data
  const plural = nplurals === 1 ? "0" : "(n != 1)"
  return `nplurals=${nplurals}; plural=${plural};`
}

/**
 * Creates default PO file headers with sensible defaults.
 *
 * If `language` is provided and `pluralForms` is not explicitly set,
 * automatically generates Plural-Forms from CLDR data.
 *
 * @example
 * const headers = createDefaultHeaders({
 *   language: "de",
 *   generator: "my-tool",
 * })
 * // → includes "Plural-Forms: nplurals=2; plural=(n != 1);"
 */
export function createDefaultHeaders(options: CreateHeadersOptions = {}): Partial<Headers> {
  const now = formatPoDate(new Date())
  const headers = buildBaseHeaders(options, now)

  // Handle Plural-Forms: explicit string, auto-generate, or omit
  if (typeof options.pluralForms === "string") {
    headers["Plural-Forms"] = options.pluralForms
  } else if (options.pluralForms !== false && options.language) {
    headers["Plural-Forms"] = generatePluralFormsHeader(options.language)
  }

  // Apply custom headers (can override defaults)
  return { ...headers, ...options.custom }
}
