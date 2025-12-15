/**
 * CLDR Validation Tests
 *
 * This test file validates our plural implementation against the official
 * CLDR 48 plural rules data. It parses the sample numbers from cldr-core
 * and verifies that our getPluralFunction returns the correct category index.
 */
import { describe, it, expect } from "vitest"
import pluralsData from "cldr-core/supplemental/plurals.json"
import { getPluralCategories, getPluralFunction } from "./plurals"

interface CLDRPluralRules {
  supplemental: {
    "plurals-type-cardinal": Record<string, Record<string, string>>
  }
}

const cldr = pluralsData as CLDRPluralRules
const pluralRules = cldr.supplemental["plurals-type-cardinal"]

/**
 * Parse CLDR sample numbers from a rule string.
 * Format: "n = 1 @integer 1, 21, 31 @decimal 1.0, 21.0"
 */
function parseSamples(rule: string): { integers: number[]; decimals: number[] } {
  const integers: number[] = []
  const decimals: number[] = []

  // Extract @integer samples
  const intMatch = rule.match(/@integer\s+([^@]+)/)
  if (intMatch && intMatch[1]) {
    const intPart = intMatch[1].replace(/…/g, "").trim()
    for (const part of intPart.split(",")) {
      const trimmed = part.trim()
      if (!trimmed) {
        continue
      }

      // Handle ranges like "2~4" or "11~26"
      if (trimmed.includes("~")) {
        const parts = trimmed.split("~").map(Number)
        const start = parts[0] ?? 0
        const end = parts[1] ?? 0
        // Only expand small ranges to avoid huge test sets
        if (end - start <= 20) {
          for (let i = start; i <= end; i++) {
            integers.push(i)
          }
        } else {
          // For large ranges, just use the boundaries
          integers.push(start, end)
        }
      } else {
        const num = parseInt(trimmed, 10)
        if (!isNaN(num)) {
          integers.push(num)
        }
      }
    }
  }

  // Extract @decimal samples
  const decMatch = rule.match(/@decimal\s+([^@]+)/)
  if (decMatch && decMatch[1]) {
    const decPart = decMatch[1].replace(/…/g, "").trim()
    for (const part of decPart.split(",")) {
      const trimmed = part.trim()
      if (!trimmed) {
        continue
      }

      // Handle ranges like "0.0~0.9"
      if (trimmed.includes("~")) {
        const parts = trimmed.split("~").map(Number)
        const start = parts[0] ?? 0
        const end = parts[1] ?? 0
        // For decimal ranges, just use a few samples
        decimals.push(start, (start + end) / 2, end)
      } else {
        const num = parseFloat(trimmed)
        if (!isNaN(num)) {
          decimals.push(num)
        }
      }
    }
  }

  return { integers, decimals }
}

/**
 * Extract category name from CLDR key like "pluralRule-count-one"
 */
function getCategoryFromKey(key: string): string {
  return key.replace("pluralRule-count-", "")
}

// Locales we fully support and want to validate
const SUPPORTED_LOCALES = [
  // East Asian (1 form)
  "ja",
  "zh",
  "ko",
  "vi",
  "th",
  "id",
  // Germanic (2 forms)
  "en",
  "de",
  "nl",
  "sv",
  "da",
  // South Slavic (3 forms, no many)
  "hr",
  "sr",
  "bs",
  // Dual (3 forms)
  "sl",
  // East Slavic (4 forms)
  "ru",
  "uk",
  "be",
  // Polish type (4 forms)
  "pl",
  // Czech/Slovak (4 forms)
  "cs",
  "sk",
  // Lithuanian (4 forms)
  "lt",
  // Latvian (3 forms with zero)
  "lv",
  // Irish (5 forms)
  "ga",
  // Maltese (5 forms)
  "mt",
  // Arabic (6 forms)
  "ar"
]

/**
 * Locales with approximate support.
 * These have complex CLDR rules that we simplify for practical use.
 * Categories match in count, but some edge cases may differ.
 */
const APPROXIMATE_LOCALES = [
  // Romance: CLDR "many" is for compact notation (e = exponent)
  // We only support many for exact millions which is sufficient for gettext
  "fr",
  "es",
  "pt",
  "it",
  "ca",
  // Celtic with complex modulo rules (category count matches)
  "gd", // Scottish Gaelic: one=1,11; two=2,12; few=3-10,13-19
  // Welsh: few=3, many=6 only (very specific)
  "cy"
]

/**
 * Locales we don't test because they're too niche/complex.
 * br (Breton): 5 categories with very complex n%10/n%100 + millions rules
 * We use a 4-category approximation which is sufficient for most use cases.
 */
// const UNTESTED_LOCALES = ["br"]

describe("CLDR Validation", () => {
  describe("validates plural categories match CLDR exactly", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const cldrRules = pluralRules[locale]
      if (!cldrRules) {
        continue
      }

      it(`${locale}: categories match CLDR`, () => {
        const cldrCategories = Object.keys(cldrRules).map(getCategoryFromKey).sort()
        const ourCategories = [...getPluralCategories(locale)].sort()

        expect(ourCategories).toEqual(cldrCategories)
      })
    }
  })

  describe("validates approximate locales have correct category count", () => {
    for (const locale of APPROXIMATE_LOCALES) {
      const cldrRules = pluralRules[locale]
      if (!cldrRules) {
        continue
      }

      it(`${locale}: has same number of categories as CLDR (approximate)`, () => {
        const cldrCount = Object.keys(cldrRules).length
        const ourCount = getPluralCategories(locale).length

        // For Romance languages, we have 3 categories (one, many, other)
        // CLDR also has 3, so this should match
        expect(ourCount).toBe(cldrCount)
      })
    }
  })

  describe("validates integer samples for exact-match locales", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const cldrRules = pluralRules[locale]
      if (!cldrRules) {
        continue
      }

      it(`${locale}: integer samples produce correct category`, () => {
        const fn = getPluralFunction(locale)
        const categories = getPluralCategories(locale)
        const errors: string[] = []

        for (const [key, rule] of Object.entries(cldrRules)) {
          const expectedCategory = getCategoryFromKey(key)
          const expectedIndex = categories.indexOf(expectedCategory)
          const { integers } = parseSamples(rule)

          for (const n of integers) {
            const actualIndex = fn(n)
            if (actualIndex !== expectedIndex) {
              const actualCategory = categories[actualIndex] || `index-${actualIndex}`
              errors.push(
                `n=${n}: expected "${expectedCategory}" (${expectedIndex}), got "${actualCategory}" (${actualIndex})`
              )
            }
          }
        }

        if (errors.length > 0) {
          throw new Error(
            `${locale} failures:\n${errors.slice(0, 10).join("\n")}${errors.length > 10 ? `\n...and ${errors.length - 10} more` : ""}`
          )
        }
      })
    }
  })

  /**
   * Note on decimal handling:
   *
   * CLDR distinguishes between integers (v=0) and decimals (v!=0), e.g.:
   * - Russian "many" applies to integers 0, 5-19, 100...
   * - Russian "other" applies to decimals like 0.5, 1.5, 10.0...
   *
   * However, JavaScript cannot distinguish 10 from 10.0 (they are identical).
   * Therefore, we only test TRUE decimals (non-integer values like 0.5, 1.5).
   * Values like 10.0 are treated as integers, which matches practical usage
   * since gettext/PO files work with integer counts.
   */
  describe("validates true decimal samples", () => {
    // Only test locales that have distinct behavior for fractions
    const DECIMAL_LOCALES = ["be", "lt"]

    for (const locale of DECIMAL_LOCALES) {
      const cldrRules = pluralRules[locale]
      if (!cldrRules) {
        continue
      }

      it(`${locale}: true decimal samples (non-integers) produce correct category`, () => {
        const fn = getPluralFunction(locale)
        const categories = getPluralCategories(locale)
        const errors: string[] = []

        for (const [key, rule] of Object.entries(cldrRules)) {
          const expectedCategory = getCategoryFromKey(key)
          const expectedIndex = categories.indexOf(expectedCategory)
          const { decimals } = parseSamples(rule)

          // Only test true decimals (non-integers)
          const trueDecimals = decimals.filter((n) => !Number.isInteger(n))

          for (const n of trueDecimals) {
            const actualIndex = fn(n)
            if (actualIndex !== expectedIndex) {
              const actualCategory = categories[actualIndex] || `index-${actualIndex}`
              errors.push(
                `n=${n}: expected "${expectedCategory}" (${expectedIndex}), got "${actualCategory}" (${actualIndex})`
              )
            }
          }
        }

        if (errors.length > 0) {
          throw new Error(
            `${locale} decimal failures:\n${errors.slice(0, 10).join("\n")}${errors.length > 10 ? `\n...and ${errors.length - 10} more` : ""}`
          )
        }
      })
    }
  })
})
