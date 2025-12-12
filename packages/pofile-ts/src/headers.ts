/**
 * Default headers helper for creating PO files.
 */

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
   */
  pluralForms?: string

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
 * Creates default PO file headers with sensible defaults.
 *
 * @example
 * const headers = createDefaultHeaders({
 *   language: "de",
 *   generator: "my-tool",
 * })
 */
export function createDefaultHeaders(options: CreateHeadersOptions = {}): Partial<Headers> {
  const now = formatPoDate(new Date())
  const headers = buildBaseHeaders(options, now)

  if (options.pluralForms) {
    headers["Plural-Forms"] = options.pluralForms
  }

  // Apply custom headers (can override defaults)
  return { ...headers, ...options.custom }
}
