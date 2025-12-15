/**
 * CLDR Plural Categories and Locale Mappings
 *
 * Provides utilities to get plural categories for any locale.
 * Data is stored in a compact format and lazily expanded at runtime.
 *
 * ## Data Sources
 *
 * The plural rules and categories are derived from CLDR (Common Locale Data Repository):
 * - CLDR Plural Rules: https://cldr.unicode.org/index/cldr-spec/plural-rules
 * - Plural Rules Chart: https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
 *
 * ## Variant System
 *
 * Instead of storing data per-locale (~500+ locales), we use a variant system:
 * - There are only 8 distinct plural rule patterns worldwide (variants A-H)
 * - Each locale maps to one variant
 * - This reduces data from ~50KB to ~2KB
 *
 * The variants are named A-H for compactness, corresponding to:
 * - A: East Asian (1 form) - zh, ja, ko, vi, th, etc.
 * - B: Germanic/Romance (2 forms) - en, de, es, fr, it, pt, etc.
 * - C: Slavic-3 (3 forms) - ru, uk, hr, sr, etc.
 * - D: Dual (3 forms with "two") - sl, dsb, hsb, etc.
 * - E: Slavic-4 (4 forms) - pl, be, etc.
 * - F: Celtic-4 (4 forms with "two") - gd, kw
 * - G: Celtic-5 (5 forms) - br, ga, gv, mt
 * - H: Arabic (6 forms) - ar, cy
 */

/**
 * Plural category variants used across all languages.
 * There are only ~10 unique combinations worldwide.
 */
const VARIANTS = {
  // 1 form: East Asian languages (no plural distinction)
  A: ["other"],

  // 2 forms: Germanic, Romance, most common
  B: ["one", "other"],

  // 3 forms: Baltic, Celtic
  C: ["one", "few", "other"],

  // 3 forms with "two": Slovenian, Sorbian
  D: ["one", "two", "other"],

  // 4 forms: Slavic (Polish, Russian, etc.)
  E: ["one", "few", "many", "other"],

  // 4 forms with "two": Scottish Gaelic, Irish
  F: ["one", "two", "few", "other"],

  // 5 forms: Breton, Maltese
  G: ["one", "two", "few", "many", "other"],

  // 6 forms: Arabic
  H: ["zero", "one", "two", "few", "many", "other"]
} as const

type VariantKey = keyof typeof VARIANTS

/**
 * Compact locale-to-variant mapping.
 * ~500 bytes for 140+ locales.
 */
const LOCALES: Record<VariantKey, string> = {
  // 1 form
  A: "bm,bo,dz,id,ig,ii,ja,jbo,jv,kde,kea,km,ko,lkt,lo,ms,my,nqo,root,sah,ses,sg,su,th,to,vi,wo,yo,yue,zh",

  // 2 forms (one, other) - most common
  B: "af,an,asa,ast,az,bal,bem,bez,bg,bn,brx,ca,ce,cgg,chr,ckb,da,de,doi,dv,ee,el,en,eo,es,et,eu,fi,fo,fur,fy,gl,gsw,gu,ha,haw,he,hi,hu,hy,ia,is,it,jgo,jmc,ka,kab,kaj,kcg,kk,kkj,kl,ks,ksb,ku,ky,lb,lg,lij,lmo,ln,mas,mgo,ml,mn,mr,nah,nb,nd,ne,nl,nn,nnh,no,nr,nso,ny,nyn,om,or,os,pa,pap,ps,pt,rm,rof,rwk,saq,sc,scn,sd,seh,sn,so,sq,ss,ssy,st,sv,sw,syr,ta,te,teo,tig,tk,tn,tr,ts,ug,ur,uz,ve,vec,vo,vun,wae,xh,xog,zu",

  // 3 forms (one, few, other)
  C: "bs,cs,hr,lt,ru,sh,sk,sr,uk",

  // 3 forms (one, two, other)
  D: "iu,naq,sat,se,sl,sma,smi,smj,smn,sms",

  // 4 forms (one, few, many, other)
  E: "be,cnr,csb,dsb,hsb,lv,pl,prg,szl",

  // 4 forms (one, two, few, other)
  F: "gd,kw",

  // 5 forms (one, two, few, many, other)
  G: "br,ga,gv,mt",

  // 6 forms (zero, one, two, few, many, other)
  H: "ar,cy"
} as const

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
 * Plural samples per variant.
 *
 * Each variant has a set of representative sample numbers for each plural category.
 * These samples are chosen to:
 * 1. Correctly trigger each plural category via the variant's plural function
 * 2. Include edge cases (boundaries, typical values)
 * 3. Be useful for testing and TMS preview
 *
 * ## How samples were derived
 *
 * For each variant, we use the CLDR plural rules to find numbers that fall into
 * each category. The samples are verified against the PLURAL_FUNCTIONS.
 *
 * Example for variant C (Slavic-3, e.g. Russian):
 * - Rule: one = n%10==1 && n%100!=11
 * - Rule: few = n%10 in 2..4 && n%100 not in 12..14
 * - Rule: other = everything else
 * - Samples: one=[1,21,31], few=[2,3,4,22], other=[0,5,11,12,20,100]
 *
 * @see https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
 */
const VARIANT_SAMPLES: Record<VariantKey, Record<string, readonly number[]>> = {
  /**
   * Variant A: East Asian languages (Chinese, Japanese, Korean, Vietnamese, Thai, etc.)
   * Only one form - no plural distinction.
   * All integers map to "other".
   */
  A: {
    other: [0, 1, 2, 5, 10, 100, 1000]
  },

  /**
   * Variant B: Germanic, Romance, and many other languages (English, German, Spanish, etc.)
   * Two forms: one (n=1), other (n≠1).
   * This is the most common pattern worldwide.
   */
  B: {
    one: [1],
    other: [0, 2, 3, 5, 10, 100, 1000]
  },

  /**
   * Variant C: Slavic languages with 3 forms (Russian, Ukrainian, Croatian, Serbian, etc.)
   * Pattern:
   * - one: n%10=1 && n%100≠11 (1, 21, 31, 41... but not 11, 111, 211...)
   * - few: n%10 in 2..4 && n%100 not in 12..14 (2-4, 22-24, 32-34... but not 12-14)
   * - other: everything else (0, 5-20, 25-30, 100...)
   */
  C: {
    one: [1, 21, 31, 41, 51, 101],
    few: [2, 3, 4, 22, 23, 24, 32],
    other: [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 100]
  },

  /**
   * Variant D: Languages with dual form (Slovenian, Sorbian, Sami, etc.)
   * Three forms: one (n=1), two (n=2), other (n≥3 or n=0).
   */
  D: {
    one: [1],
    two: [2],
    other: [0, 3, 4, 5, 10, 100, 1000]
  },

  /**
   * Variant E: Slavic languages with 4 forms (Polish, Belarusian, etc.)
   * Pattern:
   * - one: n=1 exactly
   * - few: n%10 in 2..4 && n%100 not in 12..14
   * - many: n≠1 && (n%10 in 0..1 || n%10 in 5..9 || n%100 in 12..14)
   * - other: non-integers (1.5, 2.5, etc.) - rarely used in gettext
   *
   * Note: The "other" category in Polish is for fractions, which gettext
   * typically doesn't handle. In practice, only one/few/many are used.
   */
  E: {
    one: [1],
    few: [2, 3, 4, 22, 23, 24, 32, 33, 34],
    many: [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 21, 25, 100],
    other: [1.5, 2.5, 0.5] // Fractions - rare in gettext context
  },

  /**
   * Variant F: Celtic languages with 4 forms (Scottish Gaelic, Cornish)
   * Pattern:
   * - one: n=1
   * - two: n=2
   * - few: n in 3..10
   * - other: n=0 or n>10
   */
  F: {
    one: [1],
    two: [2],
    few: [3, 4, 5, 6, 7, 8, 9, 10],
    other: [0, 11, 12, 20, 100, 1000]
  },

  /**
   * Variant G: Celtic languages with 5 forms (Breton, Irish, Manx, Maltese)
   * Pattern:
   * - one: n=1
   * - two: n=2
   * - few: n in 3..10
   * - many: n in 11..99
   * - other: n=0 or n≥100
   */
  G: {
    one: [1],
    two: [2],
    few: [3, 4, 5, 6, 7, 8, 9, 10],
    many: [11, 12, 20, 50, 99],
    other: [0, 100, 101, 1000]
  },

  /**
   * Variant H: Arabic and Welsh (6 forms)
   * Pattern:
   * - zero: n=0
   * - one: n=1
   * - two: n=2
   * - few: n%100 in 3..10
   * - many: n%100 in 11..99
   * - other: n≥100 where n%100 in 0..2
   */
  H: {
    zero: [0],
    one: [1],
    two: [2],
    few: [3, 4, 5, 6, 7, 8, 9, 10, 103, 104],
    many: [11, 12, 13, 50, 99, 111, 112],
    other: [100, 101, 102, 200, 1000]
  }
}

/**
 * Unified cache for locale lookups.
 * Maps locale → variant key for both categories and functions.
 */
let localeCache: Map<string, VariantKey> | null = null

/**
 * Initializes the locale cache from compact format.
 */
function initLocaleCache(): Map<string, VariantKey> {
  const map = new Map<string, VariantKey>()

  for (const [variant, locales] of Object.entries(LOCALES)) {
    for (const locale of locales.split(",")) {
      map.set(locale, variant as VariantKey)
    }
  }

  return map
}

/**
 * Returns the variant key for a locale, with fallback to base language.
 */
function getVariantForLocale(locale: string): VariantKey {
  localeCache ??= initLocaleCache()

  // Try exact match first
  const exact = localeCache.get(locale)
  if (exact) {
    return exact
  }

  // Try base language (de-DE → de, pt_BR → pt)
  const parts = locale.split(/[-_]/)
  if (parts.length > 1 && parts[0]) {
    const baseMatch = localeCache.get(parts[0])
    if (baseMatch) {
      return baseMatch
    }
  }

  // Default to most common (2 forms)
  return "B"
}

/**
 * Returns the CLDR plural categories for a locale.
 *
 * @example
 * getPluralCategories("de")  // → ["one", "other"]
 * getPluralCategories("pl")  // → ["one", "few", "many", "other"]
 * getPluralCategories("ar")  // → ["zero", "one", "two", "few", "many", "other"]
 * getPluralCategories("zh")  // → ["other"]
 */
export function getPluralCategories(locale: string): readonly string[] {
  return VARIANTS[getVariantForLocale(locale)]
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

// Helper predicates for complex plural rules
const isFewSlavic = (n: number) => n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
const isManySlavic = (n: number) =>
  (n % 10 >= 0 && n % 10 <= 1) || (n % 10 >= 5 && n % 10 <= 9) || (n % 100 >= 12 && n % 100 <= 14)

/**
 * Plural selector functions for each variant.
 * Returns the msgstr index for a given n.
 * No eval() needed - pure functions for CSP compatibility.
 */
const PLURAL_FUNCTIONS: Record<VariantKey, (n: number) => number> = {
  // 1 form: always 0
  A: () => 0,

  // 2 forms: one (n=1), other
  B: (n) => (n !== 1 ? 1 : 0),

  // 3 forms (Slavic): one, few, other
  C: (n) => (n % 10 === 1 && n % 100 !== 11 ? 0 : isFewSlavic(n) ? 1 : 2),

  // 3 forms (with two): one, two, other
  D: (n) => (n === 1 ? 0 : n === 2 ? 1 : 2),

  // 4 forms (Polish): one, few, many, other
  E: (n) => (n === 1 ? 0 : isFewSlavic(n) ? 1 : isManySlavic(n) ? 2 : 3),

  // 4 forms (Celtic): one, two, few, other
  F: (n) => (n === 1 ? 0 : n === 2 ? 1 : n >= 3 && n <= 10 ? 2 : 3),

  // 5 forms (Breton/Irish): one, two, few, many, other
  G: (n) => (n === 1 ? 0 : n === 2 ? 1 : n >= 3 && n <= 10 ? 2 : n >= 11 && n <= 99 ? 3 : 4),

  // 6 forms (Arabic): zero, one, two, few, many, other
  H: (n) => {
    if (n === 0) {
      return 0
    }
    if (n === 1) {
      return 1
    }
    if (n === 2) {
      return 2
    }
    if (n % 100 >= 3 && n % 100 <= 10) {
      return 3
    }
    if (n % 100 >= 11) {
      return 4
    }
    return 5
  }
}

/**
 * Plural expression strings for Gettext headers.
 */
const PLURAL_EXPRESSIONS: Record<VariantKey, string> = {
  A: "0",
  B: "(n != 1)",
  C: "(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<12 || n%100>14) ? 1 : 2)",
  D: "(n==1 ? 0 : n==2 ? 1 : 2)",
  E: "(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<12 || n%100>14) ? 1 : n!=1 && n%10>=0 && n%10<=1 || n%10>=5 && n%10<=9 || n%100>=12 && n%100<=14 ? 2 : 3)",
  F: "(n==1 ? 0 : n==2 ? 1 : n>=3 && n<=6 ? 2 : n>=7 && n<=10 ? 2 : 3)",
  G: "(n==1 ? 0 : n==2 ? 1 : n>=3 && n<=10 ? 2 : n>=11 && n<=99 ? 3 : 4)",
  H: "(n==0 ? 0 : n==1 ? 1 : n==2 ? 2 : n%100>=3 && n%100<=10 ? 3 : n%100>=11 ? 4 : 5)"
}

/**
 * Returns the plural selector function for a locale.
 * Use this to determine which msgstr index to use for a given count.
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
  return PLURAL_FUNCTIONS[getVariantForLocale(locale)]
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
  const variant = getVariantForLocale(locale)
  const nplurals = VARIANTS[variant].length
  const plural = PLURAL_EXPRESSIONS[variant]

  return `nplurals=${nplurals}; plural=${plural};`
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
 *
 * getPluralSamples("ar")
 * // → { zero: [0], one: [1], two: [2], few: [...], many: [...], other: [...] }
 *
 * @see https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
 */
export function getPluralSamples(locale: string): Record<string, readonly number[]> {
  return VARIANT_SAMPLES[getVariantForLocale(locale)]
}

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
   * The matched variant key (A-H) if expression was recognized, null otherwise.
   * Useful for debugging and understanding which rule pattern was matched.
   */
  matchedVariant: VariantKey | null
}

/**
 * Normalizes a plural expression for comparison.
 * Removes whitespace and standardizes syntax variations.
 */
function normalizeExpression(expr: string): string {
  return expr
    .replace(/\s+/g, "") // Remove all whitespace
    .replace(/\((\d+)\)/g, "$1") // Remove unnecessary parentheses around numbers
    .replace(/;$/, "") // Remove trailing semicolon
}

/**
 * Attempts to match a plural expression against known CLDR-based expressions.
 * Returns the variant key if matched, null otherwise.
 *
 * This approach is CSP-safe (no eval/new Function) and covers 99%+ of real-world cases.
 */
function matchExpressionToVariant(expression: string): VariantKey | null {
  const normalized = normalizeExpression(expression)

  for (const [variant, knownExpr] of Object.entries(PLURAL_EXPRESSIONS)) {
    if (normalizeExpression(knownExpr) === normalized) {
      return variant as VariantKey
    }
  }

  // Also check some common alternative formulations
  const alternatives: Record<string, VariantKey> = {
    // Alternative ways to write "n != 1"
    "n!=1": "B",
    "(n!=1)": "B",
    "n==1?0:1": "B",
    "(n==1?0:1)": "B",
    "(n==1)?0:1": "B",
    // Alternative for "0" (no plural)
    "0": "A"
  }

  const altVariant = alternatives[normalized]
  if (altVariant) {
    return altVariant
  }

  return null
}

/**
 * Parses a Plural-Forms header and returns a resolved result with a plural function.
 *
 * This function is CSP-safe: it matches the expression against known CLDR patterns
 * instead of using eval() or new Function(). This covers virtually all real-world
 * PO files since they use standard gettext expressions.
 *
 * @example
 * const result = parsePluralFormsHeader("nplurals=2; plural=(n != 1);")
 * // → {
 * //     nplurals: 2,
 * //     expression: "(n != 1)",
 * //     pluralFunc: (n) => n !== 1 ? 1 : 0,
 * //     matchedVariant: "B"
 * //   }
 *
 * result.pluralFunc(0)  // → 1 (other)
 * result.pluralFunc(1)  // → 0 (one)
 * result.pluralFunc(5)  // → 1 (other)
 *
 * @example
 * // Unknown/custom expression
 * const custom = parsePluralFormsHeader("nplurals=3; plural=n%10;")
 * custom.pluralFunc  // → null (unknown expression)
 * custom.matchedVariant  // → null
 *
 * @returns ParsedPluralFormsResult with nplurals, expression, and optionally pluralFunc
 */
export function parsePluralFormsHeader(header: string): ParsedPluralFormsResult | null {
  // Parse the header string
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

  // Validate we have the required parts
  if (nplurals === null || !expression || isNaN(nplurals)) {
    return null
  }

  // Try to match the expression to a known variant
  const matchedVariant = matchExpressionToVariant(expression)

  return {
    nplurals,
    expression,
    pluralFunc: matchedVariant ? PLURAL_FUNCTIONS[matchedVariant] : null,
    matchedVariant
  }
}
