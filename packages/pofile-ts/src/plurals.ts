/**
 * CLDR Plural Categories and Locale Mappings
 *
 * Uses native Intl.PluralRules for plural selection.
 *
 * @see https://cldr.unicode.org/index/cldr-spec/plural-rules
 * @see https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
 */

import type { ParsedPluralForms } from "./types"

/**
 * Parses the Plural-Forms header value from a PO file.
 * Example: "nplurals=2; plural=(n != 1);"
 *
 * Note: The plural expression is a legacy Gettext format.
 * For runtime plural selection, use `getPluralFunction(locale)` instead.
 */
export function parsePluralForms(pluralFormsString: string | undefined): ParsedPluralForms {
  const parts = (pluralFormsString ?? "").split(";")
  const results: Record<string, string> = {}

  for (const part of parts) {
    const trimmed = part.trim()
    const eqIndex = trimmed.indexOf("=")
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim()
      const value = trimmed.substring(eqIndex + 1).trim()
      results[key] = value
    }
  }

  return {
    nplurals: results.nplurals,
    plural: results.plural
  }
}

/**
 * Cache for Intl.PluralRules instances.
 */
const pluralRulesCache = new Map<string, Intl.PluralRules>()

/**
 * Normalizes locale string for Intl APIs.
 * Converts underscores to hyphens (pt_BR → pt-BR).
 */
function normalizeLocale(locale: string): string {
  return locale.replace(/_/g, "-")
}

/**
 * Gets or creates a cached Intl.PluralRules instance.
 */
function getPluralRules(locale: string): Intl.PluralRules {
  const normalized = normalizeLocale(locale)
  let pr = pluralRulesCache.get(normalized)
  if (!pr) {
    pr = new Intl.PluralRules(normalized)
    pluralRulesCache.set(normalized, pr)
  }
  return pr
}

/**
 * Returns the CLDR plural categories for a locale.
 * Uses native Intl.PluralRules for accurate, up-to-date CLDR data.
 *
 * @example
 * getPluralCategories("de")  // → ["one", "other"]
 * getPluralCategories("pl")  // → ["one", "few", "many", "other"]
 * getPluralCategories("ar")  // → ["zero", "one", "two", "few", "many", "other"]
 */
export function getPluralCategories(locale: string): readonly string[] {
  return getPluralRules(locale).resolvedOptions().pluralCategories
}

/**
 * Returns the number of plural forms for a locale.
 *
 * @example
 * getPluralCount("de")  // → 2
 * getPluralCount("pl")  // → 4
 * getPluralCount("ar")  // → 6
 */
export function getPluralCount(locale: string): number {
  return getPluralCategories(locale).length
}

/**
 * Returns the plural selector function for a locale.
 * Uses native Intl.PluralRules for CLDR-compliant selection.
 *
 * @example
 * const selectPlural = getPluralFunction("de")
 * selectPlural(1)  // → 0 (one)
 * selectPlural(5)  // → 1 (other)
 */
export function getPluralFunction(locale: string): (n: number) => number {
  const pr = getPluralRules(locale)
  const categories = pr.resolvedOptions().pluralCategories

  return (n: number): number => {
    const category = pr.select(n)
    const index = categories.indexOf(category)
    return index >= 0 ? index : categories.length - 1
  }
}
