/**
 * CLDR Plural Categories and Locale Mappings
 *
 * Uses native Intl.PluralRules for plural selection.
 * Data samples are stored for TMS preview and testing.
 *
 * ## Data Sources
 *
 * The plural rules and categories are derived from the browser's/Node's
 * built-in ICU/CLDR implementation via Intl.PluralRules.
 *
 * @see https://cldr.unicode.org/index/cldr-spec/plural-rules
 * @see https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
 */

import type { ParsedPluralForms } from "./types"

/**
 * Parses the Plural-Forms header value.
 * Example: "nplurals=2; plural=(n != 1);"
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
 * Default sample numbers for each plural category.
 * Used internally to map gettext msgstr indices to CLDR categories.
 *
 * These are representative values that trigger each category in most languages.
 * For locale-specific samples, use `getPluralSamples(locale)`.
 */
export const PLURAL_SAMPLES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  few: 3,
  many: 11,
  other: 100
}

/**
 * Returns the CLDR plural categories for a locale.
 * Uses native Intl.PluralRules for accurate, up-to-date CLDR data.
 *
 * @example
 * getPluralCategories("de")  // → ["one", "other"]
 * getPluralCategories("pl")  // → ["one", "few", "many", "other"]
 * getPluralCategories("ar")  // → ["zero", "one", "two", "few", "many", "other"]
 * getPluralCategories("zh")  // → ["other"]
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
 * Use this to determine which msgstr index to use for a given count.
 *
 * Uses native Intl.PluralRules for selection, then maps to category index.
 *
 * @example
 * const selectPlural = getPluralFunction("de")
 * selectPlural(1)  // → 0 (one)
 * selectPlural(5)  // → 1 (other)
 *
 * const selectPl = getPluralFunction("pl")
 * selectPl(1)   // → 0 (one)
 * selectPl(2)   // → 1 (few)
 * selectPl(5)   // → 2 (many)
 * selectPl(22)  // → 1 (few)
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

/**
 * Plural samples per category for common locales.
 * Used for TMS preview and testing.
 *
 * @see https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
 */
const PLURAL_SAMPLES_BY_LOCALE: Record<string, Record<string, readonly number[]>> = {
  // East Asian (1 form)
  ja: { other: [0, 1, 2, 5, 10, 100, 1000] },
  zh: { other: [0, 1, 2, 5, 10, 100, 1000] },
  ko: { other: [0, 1, 2, 5, 10, 100, 1000] },
  vi: { other: [0, 1, 2, 5, 10, 100, 1000] },
  th: { other: [0, 1, 2, 5, 10, 100, 1000] },
  id: { other: [0, 1, 2, 5, 10, 100, 1000] },

  // Germanic (2 forms)
  en: { one: [1], other: [0, 2, 3, 5, 10, 100, 1000] },
  de: { one: [1], other: [0, 2, 3, 5, 10, 100, 1000] },
  nl: { one: [1], other: [0, 2, 3, 5, 10, 100, 1000] },
  sv: { one: [1], other: [0, 2, 3, 5, 10, 100, 1000] },
  da: { one: [1], other: [0, 2, 3, 5, 10, 100, 1000] },

  // Romance (3 forms: one, many, other)
  fr: { one: [0, 1], many: [1000000, 2000000], other: [2, 3, 5, 10, 100, 1000] },
  es: { one: [1], many: [1000000], other: [0, 2, 3, 5, 10, 100, 1000] },
  pt: { one: [0, 1], many: [1000000], other: [2, 3, 5, 10, 100, 1000] },
  it: { one: [1], many: [1000000], other: [0, 2, 3, 5, 10, 100, 1000] },
  ca: { one: [1], many: [1000000], other: [0, 2, 3, 5, 10, 100, 1000] },

  // South Slavic (3 forms: one, few, other)
  hr: { one: [1, 21, 31], few: [2, 3, 4, 22, 23], other: [0, 5, 6, 10, 11, 20, 100] },
  sr: { one: [1, 21, 31], few: [2, 3, 4, 22, 23], other: [0, 5, 6, 10, 11, 20, 100] },
  bs: { one: [1, 21, 31], few: [2, 3, 4, 22, 23], other: [0, 5, 6, 10, 11, 20, 100] },

  // Slovenian (4 forms: one, two, few, other)
  sl: { one: [1, 101], two: [2, 102], few: [3, 4, 103, 104], other: [0, 5, 6, 10, 100] },

  // East Slavic (4 forms: one, few, many, other)
  ru: { one: [1, 21, 31], few: [2, 3, 4, 22, 23], many: [0, 5, 6, 10, 11, 100], other: [0.5, 1.5] },
  uk: { one: [1, 21, 31], few: [2, 3, 4, 22, 23], many: [0, 5, 6, 10, 11, 100], other: [0.5, 1.5] },
  be: { one: [1, 21, 31], few: [2, 3, 4, 22, 23], many: [0, 5, 6, 10, 11, 100], other: [0.5, 1.5] },

  // Polish (4 forms)
  pl: { one: [1], few: [2, 3, 4, 22, 23], many: [0, 5, 6, 10, 11, 100], other: [0.5, 1.5] },

  // Czech/Slovak (4 forms)
  cs: { one: [1], few: [2, 3, 4], many: [0.5, 1.5], other: [0, 5, 6, 10, 100] },
  sk: { one: [1], few: [2, 3, 4], many: [0.5, 1.5], other: [0, 5, 6, 10, 100] },

  // Lithuanian (4 forms)
  lt: { one: [1, 21, 31], few: [2, 3, 9, 22, 23], many: [0.5, 1.5], other: [0, 10, 11, 20, 100] },

  // Latvian (3 forms: zero, one, other)
  lv: { zero: [0, 10, 11, 20, 100], one: [1, 21, 31], other: [2, 3, 5, 22, 25] },

  // Scottish Gaelic (4 forms: one, two, few, other)
  // CLDR: one=1,11; two=2,12; few=3-10,13-19; other=0,20+
  gd: { one: [1, 11], two: [2, 12], few: [3, 4, 5, 10, 13, 19], other: [0, 20, 100] },

  // Cornish (different from gd)
  kw: { one: [1], two: [2], few: [3, 4, 5, 10], other: [0, 11, 20, 100] },

  // Irish (5 forms)
  ga: { one: [1], two: [2], few: [3, 4, 5, 6], many: [7, 8, 9, 10], other: [0, 11, 20, 100] },

  // Maltese (5 forms)
  mt: {
    one: [1],
    two: [2],
    few: [0, 3, 4, 10, 103],
    many: [11, 12, 19, 111],
    other: [20, 21, 100]
  },

  // Arabic (6 forms)
  ar: {
    zero: [0],
    one: [1],
    two: [2],
    few: [3, 4, 10, 103],
    many: [11, 12, 99, 111],
    other: [100, 101, 1000]
  },

  // Welsh (6 forms)
  cy: { zero: [0], one: [1], two: [2], few: [3], many: [6], other: [4, 5, 7, 100] }
}

/**
 * Returns sample numbers for each plural category of a locale.
 *
 * These samples are useful for:
 * - Testing plural rules
 * - Previewing translations in TMS tools
 * - Mapping between ICU plural categories and gettext msgstr indices
 *
 * @example
 * getPluralSamples("de")
 * // → { one: [1], other: [0, 2, 3, 5, 10, 100, 1000] }
 *
 * getPluralSamples("pl")
 * // → { one: [1], few: [2, 3, 4, 22...], many: [0, 5, 6...], other: [1.5, 2.5...] }
 */
export function getPluralSamples(locale: string): Record<string, readonly number[]> {
  // Try exact match
  const exact = PLURAL_SAMPLES_BY_LOCALE[locale]
  if (exact) {
    return exact
  }

  // Try base language
  const base = locale.split(/[-_]/)[0]
  if (base && PLURAL_SAMPLES_BY_LOCALE[base]) {
    return PLURAL_SAMPLES_BY_LOCALE[base]
  }

  // Generate from categories
  const categories = getPluralCategories(locale)
  const result: Record<string, readonly number[]> = {}

  for (const category of categories) {
    result[category] = PLURAL_SAMPLES[category] !== undefined ? [PLURAL_SAMPLES[category]] : [100]
  }

  return result
}

// ============================================================================
// Plural-Forms Header Generation and Parsing
// (For Gettext compatibility - uses static expressions)
// ============================================================================

/**
 * Plural expression strings for Gettext headers.
 * These are static expressions that match common CLDR patterns.
 */
const PLURAL_EXPRESSIONS: Record<string, { nplurals: number; expression: string }> = {
  // 1 form - East Asian
  ja: { nplurals: 1, expression: "0" },
  zh: { nplurals: 1, expression: "0" },
  ko: { nplurals: 1, expression: "0" },
  vi: { nplurals: 1, expression: "0" },
  th: { nplurals: 1, expression: "0" },
  id: { nplurals: 1, expression: "0" },

  // 2 forms - Germanic
  en: { nplurals: 2, expression: "(n != 1)" },
  de: { nplurals: 2, expression: "(n != 1)" },
  nl: { nplurals: 2, expression: "(n != 1)" },
  sv: { nplurals: 2, expression: "(n != 1)" },
  da: { nplurals: 2, expression: "(n != 1)" },

  // 3 forms - Romance (one, many, other)
  fr: { nplurals: 3, expression: "(n == 0 || n == 1 ? 0 : n != 0 && n % 1000000 == 0 ? 1 : 2)" },
  es: { nplurals: 3, expression: "(n == 1 ? 0 : n != 0 && n % 1000000 == 0 ? 1 : 2)" },
  pt: { nplurals: 3, expression: "(n == 0 || n == 1 ? 0 : n != 0 && n % 1000000 == 0 ? 1 : 2)" },
  it: { nplurals: 3, expression: "(n == 1 ? 0 : n != 0 && n % 1000000 == 0 ? 1 : 2)" },
  ca: { nplurals: 3, expression: "(n == 1 ? 0 : n != 0 && n % 1000000 == 0 ? 1 : 2)" },

  // 3 forms - South Slavic (one, few, other)
  hr: {
    nplurals: 3,
    expression: "(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<12 || n%100>14) ? 1 : 2)"
  },
  sr: {
    nplurals: 3,
    expression: "(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<12 || n%100>14) ? 1 : 2)"
  },
  bs: {
    nplurals: 3,
    expression: "(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<12 || n%100>14) ? 1 : 2)"
  },

  // 3 forms - Latvian (zero, one, other)
  lv: {
    nplurals: 3,
    expression: "(n%10==0 || (n%100>=11 && n%100<=19) ? 0 : n%10==1 && n%100!=11 ? 1 : 2)"
  },

  // 4 forms - Slovenian
  sl: { nplurals: 4, expression: "(n%100==1 ? 0 : n%100==2 ? 1 : n%100==3 || n%100==4 ? 2 : 3)" },

  // 4 forms - East Slavic
  ru: {
    nplurals: 4,
    expression: "(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<12 || n%100>14) ? 1 : 2)"
  },
  uk: {
    nplurals: 4,
    expression: "(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<12 || n%100>14) ? 1 : 2)"
  },
  be: {
    nplurals: 4,
    expression: "(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<12 || n%100>14) ? 1 : 2)"
  },

  // 4 forms - Polish
  pl: {
    nplurals: 4,
    expression: "(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<12 || n%100>14) ? 1 : 2)"
  },

  // 4 forms - Czech/Slovak
  cs: { nplurals: 4, expression: "(n==1 ? 0 : n>=2 && n<=4 ? 1 : 3)" },
  sk: { nplurals: 4, expression: "(n==1 ? 0 : n>=2 && n<=4 ? 1 : 3)" },

  // 4 forms - Lithuanian
  lt: {
    nplurals: 4,
    expression:
      "(n%10==1 && (n%100<11 || n%100>19) ? 0 : n%10>=2 && n%10<=9 && (n%100<11 || n%100>19) ? 1 : 3)"
  },

  // 4 forms - Scottish Gaelic (CLDR: one=1,11; two=2,12; few=3-10,13-19; other)
  gd: {
    nplurals: 4,
    expression:
      "((n==1 || n==11) ? 0 : (n==2 || n==12) ? 1 : (n>=3 && n<=10) || (n>=13 && n<=19) ? 2 : 3)"
  },

  // 4 forms - Cornish (simpler Celtic pattern)
  kw: { nplurals: 4, expression: "(n==1 ? 0 : n==2 ? 1 : n>=3 && n<=10 ? 2 : 3)" },

  // 5 forms - Irish
  ga: {
    nplurals: 5,
    expression: "(n==1 ? 0 : n==2 ? 1 : n>=3 && n<=6 ? 2 : n>=7 && n<=10 ? 3 : 4)"
  },

  // 5 forms - Maltese
  mt: {
    nplurals: 5,
    expression:
      "(n==1 ? 0 : n==2 ? 1 : n==0 || (n%100>=3 && n%100<=10) ? 2 : n%100>=11 && n%100<=19 ? 3 : 4)"
  },

  // 6 forms - Arabic
  ar: {
    nplurals: 6,
    expression: "(n==0 ? 0 : n==1 ? 1 : n==2 ? 2 : n%100>=3 && n%100<=10 ? 3 : n%100>=11 ? 4 : 5)"
  },

  // 6 forms - Welsh
  cy: { nplurals: 6, expression: "(n==0 ? 0 : n==1 ? 1 : n==2 ? 2 : n==3 ? 3 : n==6 ? 4 : 5)" }
}

/**
 * Returns a Gettext Plural-Forms header value for a locale.
 *
 * @example
 * getPluralFormsHeader("de")
 * // → "nplurals=2; plural=(n != 1);"
 *
 * getPluralFormsHeader("pl")
 * // → "nplurals=4; plural=(n==1 ? 0 : ...);"
 */
export function getPluralFormsHeader(locale: string): string {
  // Try exact match
  const exact = PLURAL_EXPRESSIONS[locale]
  if (exact) {
    return `nplurals=${exact.nplurals}; plural=${exact.expression};`
  }

  // Try base language
  const base = locale.split(/[-_]/)[0]
  if (base && PLURAL_EXPRESSIONS[base]) {
    const expr = PLURAL_EXPRESSIONS[base]
    return `nplurals=${expr.nplurals}; plural=${expr.expression};`
  }

  // Default to 2 forms (most common)
  return "nplurals=2; plural=(n != 1);"
}

// ============================================================================
// Plural-Forms Header Parsing
// (For reading PO files with custom expressions)
// ============================================================================

/**
 * Result of parsing and resolving a Plural-Forms header.
 */
export interface ParsedPluralFormsResult {
  /** Number of plural forms */
  nplurals: number

  /** The plural expression string (e.g., "(n != 1)") */
  expression: string

  /**
   * Function that returns the msgstr index for a given n.
   * This is a CSP-safe implementation that matches against known expressions.
   * Returns null if the expression couldn't be matched to a known pattern.
   */
  pluralFunc: ((n: number) => number) | null

  /**
   * The matched variant key if expression was recognized, null otherwise.
   * Useful for debugging.
   */
  matchedVariant: string | null
}

/**
 * Normalizes a plural expression for comparison.
 */
function normalizeExpression(expr: string): string {
  return expr
    .replace(/\s+/g, "")
    .replace(/\((\d+)\)/g, "$1")
    .replace(/;$/, "")
}

/**
 * Known expression patterns mapped to plural functions.
 * Used for CSP-safe parsing without eval().
 */
const EXPRESSION_MATCHERS: Array<{
  pattern: string
  variant: string
  fn: (n: number) => number
}> = [
  // 1 form
  { pattern: "0", variant: "A", fn: () => 0 },

  // 2 forms - Germanic
  { pattern: "(n!=1)", variant: "B", fn: (n) => (n !== 1 ? 1 : 0) },
  { pattern: "n!=1", variant: "B", fn: (n) => (n !== 1 ? 1 : 0) },
  { pattern: "(n==1?0:1)", variant: "B", fn: (n) => (n !== 1 ? 1 : 0) },

  // 3 forms - Romance
  {
    pattern: "(n==0||n==1?0:n!=0&&n%1000000==0?1:2)",
    variant: "C",
    fn: (n) =>
      n === 0 || n === 1 ? 0 : Number.isInteger(n) && n !== 0 && n % 1000000 === 0 ? 1 : 2
  },
  {
    pattern: "(n==1?0:n!=0&&n%1000000==0?1:2)",
    variant: "C2",
    fn: (n) => (n === 1 ? 0 : Number.isInteger(n) && n !== 0 && n % 1000000 === 0 ? 1 : 2)
  },

  // 3 forms - South Slavic
  {
    pattern: "(n%10==1&&n%100!=11?0:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?1:2)",
    variant: "D",
    fn: (n) =>
      n % 10 === 1 && n % 100 !== 11
        ? 0
        : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
          ? 1
          : 2
  },

  // 3 forms - Latvian
  {
    pattern: "(n%10==0||(n%100>=11&&n%100<=19)?0:n%10==1&&n%100!=11?1:2)",
    variant: "J",
    fn: (n) =>
      n % 10 === 0 || (n % 100 >= 11 && n % 100 <= 19) ? 0 : n % 10 === 1 && n % 100 !== 11 ? 1 : 2
  },

  // 4 forms - Slovenian
  {
    pattern: "(n%100==1?0:n%100==2?1:n%100==3||n%100==4?2:3)",
    variant: "E2",
    fn: (n) => (n % 100 === 1 ? 0 : n % 100 === 2 ? 1 : n % 100 === 3 || n % 100 === 4 ? 2 : 3)
  },

  // 4 forms - Polish
  {
    pattern: "(n==1?0:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?1:2)",
    variant: "G",
    fn: (n) => (n === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 1 : 2)
  },

  // 4 forms - Czech/Slovak
  {
    pattern: "(n==1?0:n>=2&&n<=4?1:3)",
    variant: "H",
    fn: (n) => (n === 1 ? 0 : n >= 2 && n <= 4 ? 1 : 3)
  },

  // 4 forms - Lithuanian
  {
    pattern: "(n%10==1&&(n%100<11||n%100>19)?0:n%10>=2&&n%10<=9&&(n%100<11||n%100>19)?1:3)",
    variant: "I",
    fn: (n) =>
      n % 10 === 1 && (n % 100 < 11 || n % 100 > 19)
        ? 0
        : n % 10 >= 2 && n % 10 <= 9 && (n % 100 < 11 || n % 100 > 19)
          ? 1
          : 3
  },

  // 4 forms - Scottish Gaelic (CLDR)
  {
    pattern: "((n==1||n==11)?0:(n==2||n==12)?1:(n>=3&&n<=10)||(n>=13&&n<=19)?2:3)",
    variant: "GD",
    fn: (n) =>
      n === 1 || n === 11
        ? 0
        : n === 2 || n === 12
          ? 1
          : (n >= 3 && n <= 10) || (n >= 13 && n <= 19)
            ? 2
            : 3
  },

  // 4 forms - Cornish (simple Celtic)
  {
    pattern: "(n==1?0:n==2?1:n>=3&&n<=10?2:3)",
    variant: "K",
    fn: (n) => (n === 1 ? 0 : n === 2 ? 1 : n >= 3 && n <= 10 ? 2 : 3)
  },

  // 5 forms - Irish
  {
    pattern: "(n==1?0:n==2?1:n>=3&&n<=6?2:n>=7&&n<=10?3:4)",
    variant: "L",
    fn: (n) => (n === 1 ? 0 : n === 2 ? 1 : n >= 3 && n <= 6 ? 2 : n >= 7 && n <= 10 ? 3 : 4)
  },

  // 5 forms - Maltese
  {
    pattern: "(n==1?0:n==2?1:n==0||(n%100>=3&&n%100<=10)?2:n%100>=11&&n%100<=19?3:4)",
    variant: "L2",
    fn: (n) =>
      n === 1
        ? 0
        : n === 2
          ? 1
          : n === 0 || (n % 100 >= 3 && n % 100 <= 10)
            ? 2
            : n % 100 >= 11 && n % 100 <= 19
              ? 3
              : 4
  },

  // 6 forms - Arabic
  {
    pattern: "(n==0?0:n==1?1:n==2?2:n%100>=3&&n%100<=10?3:n%100>=11?4:5)",
    variant: "N",
    fn: (n) =>
      n === 0
        ? 0
        : n === 1
          ? 1
          : n === 2
            ? 2
            : n % 100 >= 3 && n % 100 <= 10
              ? 3
              : n % 100 >= 11
                ? 4
                : 5
  },

  // 6 forms - Welsh
  {
    pattern: "(n==0?0:n==1?1:n==2?2:n==3?3:n==6?4:5)",
    variant: "CY",
    fn: (n) => (n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : n === 6 ? 4 : 5)
  }
]

/**
 * Parses a Plural-Forms header and returns a resolved result with a plural function.
 *
 * This function is CSP-safe: it matches the expression against known patterns
 * instead of using eval() or new Function().
 *
 * @example
 * const result = parsePluralFormsHeader("nplurals=2; plural=(n != 1);")
 * result.pluralFunc(0)  // → 1 (other)
 * result.pluralFunc(1)  // → 0 (one)
 */
export function parsePluralFormsHeader(header: string): ParsedPluralFormsResult | null {
  const parts = header.split(";")
  let nplurals: number | null = null
  let expression: string | null = null

  for (const part of parts) {
    const trimmed = part.trim()
    const eqIndex = trimmed.indexOf("=")
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim().toLowerCase()
      const value = trimmed.substring(eqIndex + 1).trim()

      if (key === "nplurals") {
        nplurals = parseInt(value, 10)
      } else if (key === "plural") {
        expression = value
      }
    }
  }

  if (nplurals === null || !expression || isNaN(nplurals)) {
    return null
  }

  // Try to match expression
  const normalized = normalizeExpression(expression)
  const matcher = EXPRESSION_MATCHERS.find((m) => normalizeExpression(m.pattern) === normalized)

  return {
    nplurals,
    expression,
    pluralFunc: matcher?.fn ?? null,
    matchedVariant: matcher?.variant ?? null
  }
}
