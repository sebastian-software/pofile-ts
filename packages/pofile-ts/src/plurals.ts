/**
 * CLDR Plural Categories and Locale Mappings
 *
 * Provides utilities to get plural categories for any locale.
 * Data is stored in a compact format and lazily expanded at runtime.
 *
 * ## Data Sources
 *
 * The plural rules and categories are derived from CLDR 48 (Common Locale Data Repository):
 * - CLDR Plural Rules: https://cldr.unicode.org/index/cldr-spec/plural-rules
 * - Plural Rules Chart: https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
 *
 * ## Variant System
 *
 * Instead of storing data per-locale (~500+ locales), we use a variant system
 * with 14 distinct patterns covering 140+ locales.
 *
 * ## Known Limitations
 *
 * ### Decimal Numbers (v operand)
 * CLDR distinguishes integers (v=0) from decimals (v!=0), e.g.:
 * - Russian "many" applies to integers 0, 5-19, 100...
 * - Russian "other" applies to decimals like 0.5, 1.5, 10.0...
 *
 * JavaScript cannot distinguish 10 from 10.0 (they are identical numbers).
 * Therefore, values like 10.0 are treated as integers. This matches practical
 * usage since gettext/PO files work with integer counts.
 *
 * True non-integer decimals (0.5, 1.5, etc.) are handled correctly.
 *
 * ### Approximate Support
 * Some locales use simplified rules:
 * - Romance (fr, es, pt, it, ca): "many" only for exact millions (n % 1000000 = 0)
 *   CLDR also uses "many" for compact notation which we don't support.
 * - Scottish Gaelic (gd): Uses 4 categories, but CLDR rules are more complex
 *   (one=1,11; two=2,12; few=3-10,13-19)
 * - Breton (br): Uses 4 categories as approximation; CLDR defines 5 with
 *   complex n%10/n%100 patterns.
 * - Welsh (cy): Uses Arabic-like 6 categories; CLDR has specific integer rules
 *   (few=3, many=6 only).
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
 * Plural category variants used across all languages.
 * Based on CLDR 45+ plural rules.
 *
 * @see https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
 */
const VARIANTS = {
  // A: 1 form - East Asian languages (no plural distinction)
  // zh, ja, ko, vi, th, id, etc.
  A: ["other"],

  // B: 2 forms - Germanic and others without "many"
  // en, de, nl, sv, etc.
  B: ["one", "other"],

  // C: 3 forms - Romance languages with "many" for exact millions
  // fr, es, pt, it, ca - many = i != 0 && i % 1000000 = 0
  C: ["one", "many", "other"],

  // D: 3 forms - South Slavic (no "many" category)
  // hr, sr, bs - one/few/other
  D: ["one", "few", "other"],

  // E: 3 forms - Dual languages (simple)
  // se, smi, etc. - one/two/other
  E: ["one", "two", "other"],

  // E2: 4 forms - Slovenian (dual with few)
  // sl - one/two/few/other based on i % 100
  E2: ["one", "two", "few", "other"],

  // F: 4 forms - East Slavic with "many"
  // ru, uk, be - many = 0, 5-19, 100, etc.
  F: ["one", "few", "many", "other"],

  // G: 4 forms - West Slavic (Polish type)
  // pl, csb, szl - many for integers, other for fractions
  G: ["one", "few", "many", "other"],

  // H: 4 forms - Czech/Slovak type
  // cs, sk - many = fractions only
  H: ["one", "few", "many", "other"],

  // I: 4 forms - Lithuanian
  // lt - one/few/many/other with different rules
  I: ["one", "few", "many", "other"],

  // J: 3 forms - Latvian (zero, one, other)
  // lv, prg
  J: ["zero", "one", "other"],

  // K: 4 forms - Celtic without "many"
  // gd, kw - one/two/few/other
  K: ["one", "two", "few", "other"],

  // L: 5 forms - Irish (specific ranges)
  // ga - one=1, two=2, few=3-6, many=7-10, other=rest
  L: ["one", "two", "few", "many", "other"],

  // L2: 5 forms - Maltese
  // mt - one=1, two=2, few=0/3-10, many=11-19, other=rest
  L2: ["one", "two", "few", "many", "other"],

  // N: 6 forms - Arabic, Welsh
  // ar, cy - zero/one/two/few/many/other
  N: ["zero", "one", "two", "few", "many", "other"]
} as const

type VariantKey = keyof typeof VARIANTS

/**
 * Compact locale-to-variant mapping.
 * Based on CLDR 45+ plural rules.
 */
const LOCALES: Record<VariantKey, string> = {
  // A: 1 form (other only)
  A: "bm,bo,dz,id,ig,ii,ja,jbo,jv,kde,kea,km,ko,lkt,lo,ms,my,nqo,root,sah,ses,sg,su,th,to,vi,wo,yo,yue,zh",

  // B: 2 forms (one, other) - Germanic, etc.
  B: "af,an,asa,ast,az,bal,bem,bez,bg,bn,brx,ce,cgg,chr,ckb,da,de,doi,dv,ee,el,en,eo,et,eu,fi,fo,fur,fy,gl,gsw,gu,ha,haw,he,hi,hu,hy,ia,is,jgo,jmc,ka,kab,kaj,kcg,kk,kkj,kl,ks,ksb,ku,ky,lb,lg,lij,lmo,ln,mas,mgo,ml,mn,mr,nah,nb,nd,ne,nl,nn,nnh,no,nr,nso,ny,nyn,om,or,os,pa,pap,ps,rm,rof,rwk,saq,sc,scn,sd,seh,sn,so,sq,ss,ssy,st,sv,sw,syr,ta,te,teo,tig,tk,tn,tr,ts,ug,ur,uz,ve,vec,vo,vun,wae,xh,xog,zu",

  // C: 3 forms (one, many, other) - Romance with "many" for millions
  C: "ca,es,fr,it,pt",

  // D: 3 forms (one, few, other) - South Slavic without "many"
  D: "bs,cnr,hr,sh,sr",

  // E: 3 forms (one, two, other) - Dual languages (simple)
  E: "dsb,hsb,iu,naq,sat,se,sma,smi,smj,smn,sms",

  // E2: 4 forms (one, two, few, other) - Slovenian
  E2: "sl",

  // F: 4 forms (one, few, many, other) - East Slavic
  F: "be,ru,uk",

  // G: 4 forms (one, few, many, other) - Polish type
  G: "csb,pl,szl",

  // H: 4 forms (one, few, many, other) - Czech/Slovak
  H: "cs,sk",

  // I: 4 forms (one, few, many, other) - Lithuanian
  I: "lt",

  // J: 3 forms (zero, one, other) - Latvian
  J: "lv,prg",

  // K: 4 forms (one, two, few, other) - Celtic without "many"
  // Note: br, gd have more complex CLDR rules, K is an approximation
  K: "br,gd,kw",

  // L: 5 forms (one, two, few, many, other) - Irish
  L: "ga,gv",

  // L2: 5 forms (one, two, few, many, other) - Maltese
  L2: "mt",

  // Note: br (Breton) and gd (Scottish Gaelic) use K as approximation
  // Their CLDR rules are more complex but K provides reasonable coverage

  // N: 6 forms (zero, one, two, few, many, other) - Arabic, Welsh
  N: "ar,cy"
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
 * @see https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
 */
const VARIANT_SAMPLES: Record<VariantKey, Record<string, readonly number[]>> = {
  /**
   * Variant A: East Asian languages (Chinese, Japanese, Korean, Vietnamese, Thai, etc.)
   * Only one form - no plural distinction.
   */
  A: {
    other: [0, 1, 2, 5, 10, 100, 1000]
  },

  /**
   * Variant B: Germanic and many other languages (English, German, etc.)
   * Two forms: one (n=1), other (n≠1).
   */
  B: {
    one: [1],
    other: [0, 2, 3, 5, 10, 100, 1000]
  },

  /**
   * Variant C: Romance languages (French, Spanish, Portuguese, Italian, Catalan)
   * Three forms: one (i=0,1), many (exact millions), other (everything else).
   * Note: "many" only triggers for i % 1000000 = 0 (very rare in practice).
   */
  C: {
    one: [0, 1],
    many: [1000000, 2000000],
    other: [2, 3, 5, 10, 100, 1000, 1000001]
  },

  /**
   * Variant D: South Slavic without "many" (Croatian, Serbian, Bosnian)
   * Three forms: one, few, other.
   */
  D: {
    one: [1, 21, 31, 41, 51, 101],
    few: [2, 3, 4, 22, 23, 24, 32],
    other: [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 100]
  },

  /**
   * Variant E: Simple dual languages (Sorbian, Sami, etc.)
   * Three forms: one (n=1), two (n=2), other (n≥3 or n=0).
   */
  E: {
    one: [1],
    two: [2],
    other: [0, 3, 4, 5, 10, 100, 1000]
  },

  /**
   * Variant E2: Slovenian
   * Four forms based on i % 100:
   * - one: i % 100 = 1
   * - two: i % 100 = 2
   * - few: i % 100 = 3..4
   * - other: everything else
   */
  E2: {
    one: [1, 101, 201, 301],
    two: [2, 102, 202, 302],
    few: [3, 4, 103, 104],
    other: [0, 5, 6, 10, 11, 100, 1000]
  },

  /**
   * Variant F: East Slavic (Russian, Ukrainian, Belarusian)
   * Four forms: one, few, many, other (fractions).
   * - one: i%10=1 && i%100≠11
   * - few: i%10 in 2..4 && i%100 not in 12..14
   * - many: i%10=0 || i%10 in 5..9 || i%100 in 11..14
   * - other: fractions only
   */
  F: {
    one: [1, 21, 31, 41, 51, 101],
    few: [2, 3, 4, 22, 23, 24, 32],
    many: [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 100],
    other: [0.5, 1.5, 2.5] // Fractions
  },

  /**
   * Variant G: Polish type (Polish, Kashubian, Silesian)
   * Four forms: one, few, many, other (fractions).
   * - one: i=1 && v=0
   * - few: i%10 in 2..4 && i%100 not in 12..14
   * - many: i≠1 && (i%10 in 0..1 || i%10 in 5..9 || i%100 in 12..14)
   * - other: fractions
   */
  G: {
    one: [1],
    few: [2, 3, 4, 22, 23, 24, 32, 33, 34],
    many: [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 21, 25, 100],
    other: [0.5, 1.5, 2.5] // Fractions
  },

  /**
   * Variant H: Czech/Slovak
   * Four forms: one, few, many (fractions), other.
   * - one: i=1 && v=0
   * - few: i in 2..4 && v=0
   * - many: v≠0 (fractions)
   * - other: 0, 5+ integers
   */
  H: {
    one: [1],
    few: [2, 3, 4],
    many: [0.5, 1.5, 2.5], // Fractions
    other: [0, 5, 6, 7, 8, 9, 10, 11, 100, 1000]
  },

  /**
   * Variant I: Lithuanian
   * Four forms: one, few, many (fractions), other.
   * - one: n%10=1 && n%100 not in 11..19
   * - few: n%10 in 2..9 && n%100 not in 11..19
   * - many: f≠0 (fractions)
   * - other: 0, 10-19, etc.
   */
  I: {
    one: [1, 21, 31, 41, 51, 101],
    few: [2, 3, 4, 5, 6, 7, 8, 9, 22, 23],
    many: [0.5, 1.5, 2.5], // Fractions
    other: [0, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 100]
  },

  /**
   * Variant J: Latvian
   * Three forms: zero, one, other.
   * - zero: n%10=0 || n%100 in 11..19
   * - one: n%10=1 && n%100≠11
   * - other: everything else
   */
  J: {
    zero: [0, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 100],
    one: [1, 21, 31, 41, 51, 101],
    other: [2, 3, 4, 5, 6, 7, 8, 9, 22, 23, 24, 25]
  },

  /**
   * Variant K: Celtic without "many" (Scottish Gaelic, Cornish)
   * Four forms: one, two, few, other.
   */
  K: {
    one: [1],
    two: [2],
    few: [3, 4, 5, 6, 7, 8, 9, 10],
    other: [0, 11, 12, 20, 100, 1000]
  },

  /**
   * Variant L: Irish (ga, gv)
   * Five forms with specific integer ranges:
   * - one: n = 1
   * - two: n = 2
   * - few: n = 3..6
   * - many: n = 7..10
   * - other: everything else
   */
  L: {
    one: [1],
    two: [2],
    few: [3, 4, 5, 6],
    many: [7, 8, 9, 10],
    other: [0, 11, 12, 20, 100, 1000]
  },

  /**
   * Variant L2: Maltese
   * Five forms: one, two, few, many, other.
   * - one: n = 1
   * - two: n = 2
   * - few: n = 0 || n % 100 = 3..10
   * - many: n % 100 = 11..19
   * - other: everything else
   */
  L2: {
    one: [1],
    two: [2],
    few: [0, 3, 4, 5, 6, 7, 8, 9, 10, 103, 104],
    many: [11, 12, 13, 14, 15, 16, 17, 18, 19, 111, 112],
    other: [20, 21, 30, 40, 100, 101, 1000]
  },

  /**
   * Variant N: Arabic and Welsh
   * Six forms: zero, one, two, few, many, other.
   */
  N: {
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
const isInteger = (n: number) => Number.isInteger(n)

/**
 * Plural selector functions for each variant.
 * Returns the msgstr index for a given n.
 * No eval() needed - pure functions for CSP compatibility.
 */
const PLURAL_FUNCTIONS: Record<VariantKey, (n: number) => number> = {
  // A: 1 form - always 0
  A: () => 0,

  // B: 2 forms - one (n=1), other
  B: (n) => (n !== 1 ? 1 : 0),

  // C: 3 forms - Romance (one, many, other)
  // one: i = 0, 1
  // many: i != 0 && i % 1000000 = 0 (exact millions)
  // other: everything else
  C: (n) => {
    if (n === 0 || n === 1) {
      return 0
    } // one
    if (isInteger(n) && n !== 0 && n % 1000000 === 0) {
      return 1
    } // many
    return 2 // other
  },

  // D: 3 forms - South Slavic (one, few, other)
  D: (n) => (n % 10 === 1 && n % 100 !== 11 ? 0 : isFewSlavic(n) ? 1 : 2),

  // E: 3 forms - Simple dual (one, two, other)
  E: (n) => (n === 1 ? 0 : n === 2 ? 1 : 2),

  // E2: 4 forms - Slovenian (one, two, few, other)
  // Based on i % 100
  E2: (n) => {
    const i100 = n % 100
    if (i100 === 1) {
      return 0
    } // one
    if (i100 === 2) {
      return 1
    } // two
    if (i100 === 3 || i100 === 4) {
      return 2
    } // few
    return 3 // other
  },

  // F: 4 forms - East Slavic (one, few, many, other)
  // other is for fractions only
  F: (n) => {
    if (!isInteger(n)) {
      return 3
    } // other (fractions)
    if (n % 10 === 1 && n % 100 !== 11) {
      return 0
    } // one
    if (isFewSlavic(n)) {
      return 1
    } // few
    return 2 // many
  },

  // G: 4 forms - Polish type (one, few, many, other)
  // other is for fractions only
  G: (n) => {
    if (!isInteger(n)) {
      return 3
    } // other (fractions)
    if (n === 1) {
      return 0
    } // one
    if (isFewSlavic(n)) {
      return 1
    } // few
    return 2 // many
  },

  // H: 4 forms - Czech/Slovak (one, few, many, other)
  // many is for fractions, other is for 0, 5+
  H: (n) => {
    if (!isInteger(n)) {
      return 2
    } // many (fractions)
    if (n === 1) {
      return 0
    } // one
    if (n >= 2 && n <= 4) {
      return 1
    } // few
    return 3 // other (0, 5+)
  },

  // I: 4 forms - Lithuanian (one, few, many, other)
  // many is for fractions
  I: (n) => {
    if (!isInteger(n)) {
      return 2
    } // many (fractions)
    if (n % 10 === 1 && !(n % 100 >= 11 && n % 100 <= 19)) {
      return 0
    } // one
    if (n % 10 >= 2 && n % 10 <= 9 && !(n % 100 >= 11 && n % 100 <= 19)) {
      return 1
    } // few
    return 3 // other (0, 10-19, etc.)
  },

  // J: 3 forms - Latvian (zero, one, other)
  J: (n) => {
    if (n % 10 === 0 || (n % 100 >= 11 && n % 100 <= 19)) {
      return 0
    } // zero
    if (n % 10 === 1 && n % 100 !== 11) {
      return 1
    } // one
    return 2 // other
  },

  // K: 4 forms - Celtic without "many" (one, two, few, other)
  K: (n) => (n === 1 ? 0 : n === 2 ? 1 : n >= 3 && n <= 10 ? 2 : 3),

  // L: 5 forms - Irish (one, two, few, many, other)
  // Specific integer ranges
  L: (n) => {
    if (n === 1) {
      return 0
    } // one
    if (n === 2) {
      return 1
    } // two
    if (n >= 3 && n <= 6) {
      return 2
    } // few
    if (n >= 7 && n <= 10) {
      return 3
    } // many
    return 4 // other
  },

  // L2: 5 forms - Maltese (one, two, few, many, other)
  L2: (n) => {
    if (n === 1) {
      return 0
    } // one
    if (n === 2) {
      return 1
    } // two
    if (n === 0 || (n % 100 >= 3 && n % 100 <= 10)) {
      return 2
    } // few
    if (n % 100 >= 11 && n % 100 <= 19) {
      return 3
    } // many
    return 4 // other
  },

  // N: 6 forms - Arabic (zero, one, two, few, many, other)
  N: (n) => {
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
  // A: 1 form
  A: "0",

  // B: 2 forms (one, other)
  B: "(n != 1)",

  // C: 3 forms - Romance (one, many, other)
  C: "(n == 0 || n == 1 ? 0 : n != 0 && n % 1000000 == 0 ? 1 : 2)",

  // D: 3 forms - South Slavic (one, few, other)
  D: "(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<12 || n%100>14) ? 1 : 2)",

  // E: 3 forms - Simple dual (one, two, other)
  E: "(n==1 ? 0 : n==2 ? 1 : 2)",

  // E2: 4 forms - Slovenian (one, two, few, other)
  E2: "(n%100==1 ? 0 : n%100==2 ? 1 : n%100==3 || n%100==4 ? 2 : 3)",

  // F: 4 forms - East Slavic (one, few, many, other)
  F: "(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<12 || n%100>14) ? 1 : 2)",

  // G: 4 forms - Polish type (one, few, many, other)
  G: "(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<12 || n%100>14) ? 1 : 2)",

  // H: 4 forms - Czech/Slovak (one, few, many, other)
  H: "(n==1 ? 0 : n>=2 && n<=4 ? 1 : 3)",

  // I: 4 forms - Lithuanian (one, few, many, other)
  I: "(n%10==1 && (n%100<11 || n%100>19) ? 0 : n%10>=2 && n%10<=9 && (n%100<11 || n%100>19) ? 1 : 3)",

  // J: 3 forms - Latvian (zero, one, other)
  J: "(n%10==0 || (n%100>=11 && n%100<=19) ? 0 : n%10==1 && n%100!=11 ? 1 : 2)",

  // K: 4 forms - Celtic without "many" (one, two, few, other)
  K: "(n==1 ? 0 : n==2 ? 1 : n>=3 && n<=10 ? 2 : 3)",

  // L: 5 forms - Irish (one, two, few, many, other)
  L: "(n==1 ? 0 : n==2 ? 1 : n>=3 && n<=6 ? 2 : n>=7 && n<=10 ? 3 : 4)",

  // L2: 5 forms - Maltese (one, two, few, many, other)
  L2: "(n==1 ? 0 : n==2 ? 1 : n==0 || (n%100>=3 && n%100<=10) ? 2 : n%100>=11 && n%100<=19 ? 3 : 4)",

  // N: 6 forms - Arabic (zero, one, two, few, many, other)
  N: "(n==0 ? 0 : n==1 ? 1 : n==2 ? 2 : n%100>=3 && n%100<=10 ? 3 : n%100>=11 ? 4 : 5)"
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
