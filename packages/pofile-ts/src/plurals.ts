/**
 * CLDR Plural Categories and Locale Mappings
 *
 * Provides utilities to get plural categories for any locale.
 * Data is stored in a compact format and lazily expanded at runtime.
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
 * Sample numbers for each plural category.
 * Used to map gettext msgstr indices to CLDR categories.
 */
export const PLURAL_SAMPLES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  few: 3,
  many: 11,
  other: 100
}

/** Cached locale → categories map for O(1) lookup */
let cache: Map<string, readonly string[]> | null = null

/**
 * Initializes the locale cache from compact format.
 */
function initCache(): Map<string, readonly string[]> {
  const map = new Map<string, readonly string[]>()

  for (const [variant, locales] of Object.entries(LOCALES)) {
    const categories = VARIANTS[variant as VariantKey]
    for (const locale of locales.split(",")) {
      map.set(locale, categories)
    }
  }

  return map
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
  cache ??= initCache()

  // Try exact match first
  const exact = cache.get(locale)
  if (exact) {
    return exact
  }

  // Try base language (de-DE → de, pt_BR → pt)
  const parts = locale.split(/[-_]/)
  if (parts.length > 1 && parts[0]) {
    const baseMatch = cache.get(parts[0])
    if (baseMatch) {
      return baseMatch
    }
  }

  // Default to most common (2 forms)
  return VARIANTS.B
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

/** Cached locale → variant key map */
let variantCache: Map<string, VariantKey> | null = null

function initVariantCache(): Map<string, VariantKey> {
  const map = new Map<string, VariantKey>()
  for (const [variant, locales] of Object.entries(LOCALES)) {
    for (const locale of locales.split(",")) {
      map.set(locale, variant as VariantKey)
    }
  }
  return map
}

function getVariantKey(locale: string): VariantKey {
  variantCache ??= initVariantCache()

  const exact = variantCache.get(locale)
  if (exact) {
    return exact
  }

  const parts = locale.split(/[-_]/)
  if (parts.length > 1 && parts[0]) {
    const base = variantCache.get(parts[0])
    if (base) {
      return base
    }
  }

  return "B" // Default to most common
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
  const variant = getVariantKey(locale)
  return PLURAL_FUNCTIONS[variant]
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
  const variant = getVariantKey(locale)
  const nplurals = VARIANTS[variant].length
  const plural = PLURAL_EXPRESSIONS[variant]

  return `nplurals=${nplurals}; plural=${plural};`
}
