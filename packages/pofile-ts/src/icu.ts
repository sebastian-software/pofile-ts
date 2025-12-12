/**
 * ICU MessageFormat conversion utilities.
 *
 * Converts between Gettext plural format and ICU MessageFormat.
 */

import type { PoItem, PoFile } from "./types"
import { getPluralCategories, PLURAL_SAMPLES } from "./plurals"

/**
 * Options for Gettext to ICU conversion.
 */
export interface GettextToIcuOptions {
  /**
   * Target locale for determining plural categories.
   * Required to map msgstr indices to ICU plural keywords.
   */
  locale: string

  /**
   * Variable name to use in the ICU plural expression.
   * @default "count"
   */
  pluralVariable?: string
}

/**
 * Options for converting an entire PO file to ICU format.
 */
export interface NormalizeToIcuOptions extends GettextToIcuOptions {
  /**
   * Whether to modify items in-place or return copies.
   * @default false
   */
  inPlace?: boolean
}

/**
 * Evaluates a Gettext plural expression for a given n.
 * Returns the msgstr index.
 */
function evaluatePluralExpression(expression: string, n: number): number {
  // Extract the expression part after "plural="
  const pluralRegex = /plural\s*=\s*(.+?);?\s*$/
  const match = pluralRegex.exec(expression)
  if (!match?.[1]) {
    return n === 1 ? 0 : 1
  }

  try {
    // Dynamic evaluation is necessary here to support arbitrary Gettext plural expressions
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function("n", `return (${match[1]});`) as (n: number) => boolean | number
    const result = fn(n)
    // Handle boolean results (some expressions return true/false)
    if (typeof result === "boolean") {
      return result ? 1 : 0
    }
    return result
  } catch {
    return n === 1 ? 0 : 1
  }
}

/**
 * Maps msgstr indices to CLDR plural categories for a given locale.
 * Uses the Plural-Forms header to determine the mapping.
 */
function getMsgstrToCategory(locale: string, pluralFormsHeader?: string): string[] {
  const categories = getPluralCategories(locale)

  if (!pluralFormsHeader) {
    // Without header, assume standard order
    return [...categories]
  }

  // Evaluate the plural expression for each category's sample number
  const mapping: string[] = []

  for (const category of categories) {
    const sample = PLURAL_SAMPLES[category] ?? 100
    const index = evaluatePluralExpression(pluralFormsHeader, sample)
    mapping[index] = category
  }

  // Fill any gaps with remaining categories
  let catIndex = 0
  for (let i = 0; i < categories.length; i++) {
    if (!mapping[i]) {
      let cat = categories[catIndex]
      while (cat && mapping.includes(cat)) {
        catIndex++
        cat = categories[catIndex]
      }
      mapping[i] = cat ?? "other"
      catIndex++
    }
  }

  return mapping
}

/**
 * Converts a Gettext plural item to ICU MessageFormat.
 *
 * @example
 * const item = {
 *   msgid: "One item",
 *   msgid_plural: "{count} items",
 *   msgstr: ["Ein Artikel", "{count} Artikel"]
 * }
 *
 * gettextToIcu(item, { locale: "de" })
 * // → "{count, plural, one {Ein Artikel} other {{count} Artikel}}"
 *
 * @example
 * // Polish with 4 plural forms
 * const plItem = {
 *   msgid: "One file",
 *   msgid_plural: "{count} files",
 *   msgstr: ["plik", "pliki", "plików", "pliki"]
 * }
 *
 * gettextToIcu(plItem, { locale: "pl" })
 * // → "{count, plural, one {plik} few {pliki} many {plików} other {pliki}}"
 */
export function gettextToIcu(
  item: PoItem,
  options: GettextToIcuOptions,
  pluralFormsHeader?: string
): string | null {
  const { locale, pluralVariable = "count" } = options

  // Not a plural item
  if (!item.msgid_plural || item.msgstr.length <= 1) {
    return null
  }

  // Get the category mapping for this locale
  const categories = getMsgstrToCategory(locale, pluralFormsHeader)

  // Build ICU plural clauses
  const clauses = item.msgstr
    .map((translation, index) => {
      const category = categories[index] ?? "other"
      return `${category} {${translation}}`
    })
    .join(" ")

  return `{${pluralVariable}, plural, ${clauses}}`
}

/**
 * Checks if an item is a plural item (has msgid_plural).
 */
export function isPluralItem(item: PoItem): boolean {
  return !!item.msgid_plural && item.msgstr.length > 1
}

/**
 * Normalizes a plural item to ICU format in-place.
 * The ICU string is stored in msgstr[0], and msgid_plural is cleared.
 *
 * @returns true if the item was converted, false otherwise
 */
export function normalizeItemToIcu(
  item: PoItem,
  options: GettextToIcuOptions,
  pluralFormsHeader?: string
): boolean {
  const icu = gettextToIcu(item, options, pluralFormsHeader)

  if (icu) {
    item.msgstr = [icu]
    item.msgid_plural = ""
    return true
  }

  return false
}

/**
 * Normalizes all plural items in a PO file to ICU format.
 *
 * @example
 * const po = parsePo(content)
 * const normalized = normalizeToIcu(po, { locale: "de" })
 *
 * // All plural items now have ICU in msgstr[0]
 * normalized.items[0].msgstr[0]
 * // → "{count, plural, one {Ein Artikel} other {{count} Artikel}}"
 */
export function normalizeToIcu(po: PoFile, options: NormalizeToIcuOptions): PoFile {
  const { inPlace = false, ...gettextOptions } = options
  const pluralFormsHeader = po.headers["Plural-Forms"]

  const result = inPlace
    ? po
    : {
        ...po,
        headers: { ...po.headers },
        items: po.items.map((item) => ({
          ...item,
          msgstr: [...item.msgstr],
          flags: { ...item.flags }
        }))
      }

  for (const item of result.items) {
    normalizeItemToIcu(item, gettextOptions, pluralFormsHeader)
  }

  return result
}

/**
 * Converts ICU plural back to source msgid/msgid_plural.
 * Extracts the first and last plural cases.
 *
 * @example
 * const icu = "{count, plural, one {# item} other {# items}}"
 * icuToGettextSource(icu)
 * // → { msgid: "# item", msgid_plural: "# items", pluralVariable: "count" }
 */
export function icuToGettextSource(icu: string): {
  msgid: string
  msgid_plural: string
  pluralVariable: string
} | null {
  // Simple regex-based extraction (no full ICU parser needed)
  const icuPluralRegex = /^\{(\w+),\s*plural,\s*(.+)\}$/s
  const match = icuPluralRegex.exec(icu)

  if (!match) {
    return null
  }

  const pluralVariable = match[1]
  const casesStr = match[2]

  if (!pluralVariable || !casesStr) {
    return null
  }

  // Extract individual cases: "one {text} other {text}"
  const caseRegex = /(\w+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g
  const cases: { category: string; text: string }[] = []

  let caseMatch: RegExpExecArray | null
  while ((caseMatch = caseRegex.exec(casesStr)) !== null) {
    const category = caseMatch[1]
    const text = caseMatch[2]
    if (category && text !== undefined) {
      cases.push({ category, text })
    }
  }

  if (cases.length < 2) {
    return null
  }

  const first = cases[0]
  const last = cases[cases.length - 1]

  if (!first || !last) {
    return null
  }

  // Use first case as msgid, last as msgid_plural
  return {
    msgid: first.text,
    msgid_plural: last.text,
    pluralVariable
  }
}
