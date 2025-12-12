/**
 * ICU MessageFormat conversion utilities.
 *
 * Converts between Gettext plural format and ICU MessageFormat.
 */

import type { PoItem, PoFile } from "./types"
import { getPluralCategories, getPluralFunction, PLURAL_SAMPLES } from "./plurals"

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

  /**
   * Replace `#` with the explicit variable reference `{varname}`.
   * Makes translations more readable in TMS tools.
   * @default true
   */
  expandOctothorpe?: boolean
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
 * Maps msgstr indices to CLDR plural categories for a given locale.
 * Uses the locale's plural function to determine the mapping.
 */
function getMsgstrToCategory(locale: string): string[] {
  const categories = getPluralCategories(locale)
  const pluralFn = getPluralFunction(locale)

  // Map each category to its msgstr index using sample values
  // Process in order and don't overwrite existing mappings
  const mapping: string[] = []
  const usedIndices = new Set<number>()

  for (const category of categories) {
    const sample = PLURAL_SAMPLES[category] ?? 100
    const index = pluralFn(sample)

    // Only use this index if not already taken
    if (!usedIndices.has(index)) {
      mapping[index] = category
      usedIndices.add(index)
    }
  }

  // Assign remaining categories to remaining slots
  let nextSlot = 0
  for (const category of categories) {
    if (!mapping.includes(category)) {
      // Find next available slot
      while (usedIndices.has(nextSlot)) {
        nextSlot++
      }
      mapping[nextSlot] = category
      usedIndices.add(nextSlot)
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
export function gettextToIcu(item: PoItem, options: GettextToIcuOptions): string | null {
  const { locale, pluralVariable = "count", expandOctothorpe = true } = options

  // Not a plural item
  if (!item.msgid_plural || item.msgstr.length <= 1) {
    return null
  }

  // Get the category mapping for this locale
  const categories = getMsgstrToCategory(locale)

  // Build ICU plural clauses
  const clauses = item.msgstr
    .map((translation, index) => {
      const category = categories[index] ?? "other"
      // Replace # with explicit variable reference for better TMS readability
      const text = expandOctothorpe ? translation.replace(/#/g, `{${pluralVariable}}`) : translation
      return `${category} {${text}}`
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
export function normalizeItemToIcu(item: PoItem, options: GettextToIcuOptions): boolean {
  const icu = gettextToIcu(item, options)

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
    normalizeItemToIcu(item, gettextOptions)
  }

  return result
}

export interface IcuToGettextOptions {
  /**
   * Replace `#` with the explicit variable reference `{varname}`.
   * Makes source strings more readable.
   * @default true
   */
  expandOctothorpe?: boolean
}

interface PluralCase {
  category: string
  text: string
}

/**
 * Extracts plural cases from ICU case string.
 */
function extractPluralCases(casesStr: string): PluralCase[] {
  const caseRegex = /(\w+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g
  const cases: PluralCase[] = []

  let match: RegExpExecArray | null
  while ((match = caseRegex.exec(casesStr)) !== null) {
    const category = match[1]
    const text = match[2]
    if (category && text !== undefined) {
      cases.push({ category, text })
    }
  }

  return cases
}

/**
 * Converts ICU plural back to source msgid/msgid_plural.
 * Extracts the first and last plural cases.
 *
 * @example
 * const icu = "{count, plural, one {# item} other {# items}}"
 * icuToGettextSource(icu)
 * // → { msgid: "{count} item", msgid_plural: "{count} items", pluralVariable: "count" }
 *
 * icuToGettextSource(icu, { expandOctothorpe: false })
 * // → { msgid: "# item", msgid_plural: "# items", pluralVariable: "count" }
 */
export function icuToGettextSource(
  icu: string,
  options: IcuToGettextOptions = {}
): {
  msgid: string
  msgid_plural: string
  pluralVariable: string
} | null {
  const { expandOctothorpe = true } = options

  // Simple regex-based extraction (no full ICU parser needed)
  const icuPluralRegex = /^\{(\w+),\s*plural,\s*(.+)\}$/s
  const match = icuPluralRegex.exec(icu)

  if (!match?.[1] || !match[2]) {
    return null
  }

  const pluralVariable = match[1]
  const cases = extractPluralCases(match[2])

  if (cases.length < 2) {
    return null
  }

  const first = cases[0]
  const last = cases[cases.length - 1]

  if (!first || !last) {
    return null
  }

  // Replace # with explicit variable reference for better readability
  const expand = (text: string) =>
    expandOctothorpe ? text.replace(/#/g, `{${pluralVariable}}`) : text

  return {
    msgid: expand(first.text),
    msgid_plural: expand(last.text),
    pluralVariable
  }
}
