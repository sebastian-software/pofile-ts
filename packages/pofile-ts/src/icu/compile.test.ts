import { describe, it, expect } from "vitest"
import { compileIcu } from "./compile"

describe("compileIcu", () => {
  describe("literals", () => {
    it("returns static string for plain text", () => {
      const fn = compileIcu("Hello World!", { locale: "en" })
      expect(fn()).toBe("Hello World!")
    })

    it("handles empty string", () => {
      const fn = compileIcu("", { locale: "en" })
      expect(fn()).toBe("")
    })
  })

  describe("arguments", () => {
    it("interpolates simple variable", () => {
      const fn = compileIcu("Hello {name}!", { locale: "en" })
      expect(fn({ name: "World" })).toBe("Hello World!")
    })

    it("interpolates multiple variables", () => {
      const fn = compileIcu("{greeting} {name}!", { locale: "en" })
      expect(fn({ greeting: "Hi", name: "there" })).toBe("Hi there!")
    })

    it("shows placeholder for missing variable", () => {
      const fn = compileIcu("Hello {name}!", { locale: "en" })
      expect(fn({})).toBe("Hello {name}!")
    })

    it("converts non-string values to string", () => {
      const fn = compileIcu("Count: {n}", { locale: "en" })
      expect(fn({ n: 42 })).toBe("Count: 42")
    })
  })

  describe("plurals", () => {
    it("selects correct plural form for English", () => {
      const fn = compileIcu("{count, plural, one {# item} other {# items}}", { locale: "en" })
      expect(fn({ count: 1 })).toBe("1 item")
      expect(fn({ count: 0 })).toBe("0 items")
      expect(fn({ count: 5 })).toBe("5 items")
    })

    it("handles exact matches", () => {
      const fn = compileIcu("{count, plural, =0 {no items} one {# item} other {# items}}", {
        locale: "en"
      })
      expect(fn({ count: 0 })).toBe("no items")
      expect(fn({ count: 1 })).toBe("1 item")
      expect(fn({ count: 5 })).toBe("5 items")
    })

    it("handles offset", () => {
      const fn = compileIcu(
        "{count, plural, offset:1 =1 {just you} one {you and # other} other {you and # others}}",
        { locale: "en" }
      )
      expect(fn({ count: 1 })).toBe("just you")
      expect(fn({ count: 2 })).toBe("you and 1 other")
      expect(fn({ count: 5 })).toBe("you and 4 others")
    })

    it("works with German plural rules", () => {
      const fn = compileIcu("{count, plural, one {# Artikel} other {# Artikel}}", { locale: "de" })
      expect(fn({ count: 1 })).toBe("1 Artikel")
      expect(fn({ count: 5 })).toBe("5 Artikel")
    })

    it("works with Polish plural rules (4 forms)", () => {
      const fn = compileIcu(
        "{count, plural, one {# plik} few {# pliki} many {# plików} other {# pliku}}",
        { locale: "pl" }
      )
      expect(fn({ count: 1 })).toBe("1 plik")
      expect(fn({ count: 2 })).toBe("2 pliki")
      expect(fn({ count: 5 })).toBe("5 plików")
      expect(fn({ count: 22 })).toBe("22 pliki")
    })

    it("shows placeholder for missing plural value", () => {
      const fn = compileIcu("{count, plural, one {# item} other {# items}}", { locale: "en" })
      expect(fn({})).toBe("{count}")
    })

    it("handles non-numeric plural value", () => {
      const fn = compileIcu("{count, plural, one {# item} other {# items}}", { locale: "en" })
      expect(fn({ count: "many" })).toBe("{count}")
    })

    it("handles # without plural context", () => {
      // This is an edge case - # outside of plural should render as #
      const fn = compileIcu("{count, plural, one {item} other {items}}", { locale: "en" })
      expect(fn({ count: 5 })).toBe("items")
    })
  })

  describe("select", () => {
    it("selects correct option", () => {
      const fn = compileIcu("{gender, select, male {He} female {She} other {They}}", {
        locale: "en"
      })
      expect(fn({ gender: "male" })).toBe("He")
      expect(fn({ gender: "female" })).toBe("She")
      expect(fn({ gender: "other" })).toBe("They")
    })

    it("falls back to other for unknown value", () => {
      const fn = compileIcu("{gender, select, male {He} female {She} other {They}}", {
        locale: "en"
      })
      expect(fn({ gender: "unknown" })).toBe("They")
    })

    it("shows placeholder for missing select value", () => {
      const fn = compileIcu("{gender, select, male {He} other {They}}", { locale: "en" })
      expect(fn({})).toBe("They")
    })

    it("handles numeric select values", () => {
      const fn = compileIcu("{type, select, 1 {First} 2 {Second} other {Other}}", { locale: "en" })
      expect(fn({ type: "1" })).toBe("First")
      expect(fn({ type: 1 })).toBe("First")
    })
  })

  describe("number formatting", () => {
    it("formats number with default style", () => {
      const fn = compileIcu("Value: {n, number}", { locale: "en" })
      expect(fn({ n: 1234.5 })).toBe("Value: 1,234.5")
    })

    it("formats percent", () => {
      const fn = compileIcu("{rate, number, percent}", { locale: "en" })
      expect(fn({ rate: 0.42 })).toBe("42%")
    })

    it("formats integer (no decimals)", () => {
      const fn = compileIcu("{n, number, integer}", { locale: "en" })
      expect(fn({ n: 1234.567 })).toBe("1,235")
    })

    it("formats currency with skeleton", () => {
      const fn = compileIcu("{price, number, ::currency/EUR}", { locale: "de" })
      const result = fn({ price: 42.5 })
      expect(result).toContain("42")
      expect(result).toContain("€")
    })

    it("handles unknown number style", () => {
      const fn = compileIcu("{n, number, unknown}", { locale: "en" })
      expect(fn({ n: 1234 })).toBe("1,234")
    })

    it("shows placeholder for missing number value", () => {
      const fn = compileIcu("{n, number}", { locale: "en" })
      expect(fn({})).toBe("{n}")
    })

    it("converts non-number to string", () => {
      const fn = compileIcu("{n, number}", { locale: "en" })
      expect(fn({ n: "text" })).toBe("text")
    })

    it("formats with German locale", () => {
      const fn = compileIcu("Wert: {n, number}", { locale: "de" })
      // German uses . as thousands separator and , as decimal
      expect(fn({ n: 1234.5 })).toMatch(/1\.234,5/)
    })
  })

  describe("date formatting", () => {
    it("formats date with medium style", () => {
      const fn = compileIcu("Created: {d, date, medium}", { locale: "en" })
      const date = new Date(2024, 11, 15) // Dec 15, 2024
      const result = fn({ d: date })
      expect(result).toContain("2024")
      expect(result).toContain("15")
    })

    it("formats date with short style", () => {
      const fn = compileIcu("{d, date, short}", { locale: "en" })
      const date = new Date(2024, 11, 15)
      const result = fn({ d: date })
      expect(result).toContain("12")
      expect(result).toContain("15")
      expect(result).toContain("24")
    })

    it("formats date with long style", () => {
      const fn = compileIcu("{d, date, long}", { locale: "en" })
      const date = new Date(2024, 11, 15)
      const result = fn({ d: date })
      expect(result).toContain("December")
      expect(result).toContain("2024")
    })

    it("formats date with full style", () => {
      const fn = compileIcu("{d, date, full}", { locale: "en" })
      const date = new Date(2024, 11, 15)
      const result = fn({ d: date })
      expect(result).toContain("December")
      expect(result).toContain("2024")
    })

    it("formats date with default (medium) style", () => {
      const fn = compileIcu("{d, date}", { locale: "en" })
      const date = new Date(2024, 11, 15)
      const result = fn({ d: date })
      expect(result).toContain("2024")
    })

    it("handles skeleton format with fallback", () => {
      const fn = compileIcu("{d, date, ::yyyyMMdd}", { locale: "en" })
      const date = new Date(2024, 11, 15)
      const result = fn({ d: date })
      expect(result).toContain("2024")
    })

    it("accepts timestamp as date value", () => {
      const fn = compileIcu("{d, date, medium}", { locale: "en" })
      const timestamp = new Date(2024, 11, 15).getTime()
      const result = fn({ d: timestamp })
      expect(result).toContain("2024")
    })

    it("shows placeholder for missing date value", () => {
      const fn = compileIcu("{d, date}", { locale: "en" })
      expect(fn({})).toBe("{d}")
    })

    it("converts non-date to string", () => {
      const fn = compileIcu("{d, date}", { locale: "en" })
      expect(fn({ d: "not a date" })).toBe("not a date")
    })
  })

  describe("time formatting", () => {
    it("formats time with medium style", () => {
      const fn = compileIcu("At: {t, time, medium}", { locale: "en" })
      const date = new Date(2024, 11, 15, 14, 30, 0)
      const result = fn({ t: date })
      // Should contain hour and minutes
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it("formats time with short style", () => {
      const fn = compileIcu("{t, time, short}", { locale: "en" })
      const date = new Date(2024, 11, 15, 14, 30, 0)
      const result = fn({ t: date })
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it("formats time with long style", () => {
      const fn = compileIcu("{t, time, long}", { locale: "en" })
      const date = new Date(2024, 11, 15, 14, 30, 0)
      const result = fn({ t: date })
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it("formats time with default style", () => {
      const fn = compileIcu("{t, time}", { locale: "en" })
      const date = new Date(2024, 11, 15, 14, 30, 0)
      const result = fn({ t: date })
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it("accepts timestamp as time value", () => {
      const fn = compileIcu("{t, time, short}", { locale: "en" })
      const timestamp = new Date(2024, 11, 15, 14, 30).getTime()
      const result = fn({ t: timestamp })
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it("shows placeholder for missing time value", () => {
      const fn = compileIcu("{t, time}", { locale: "en" })
      expect(fn({})).toBe("{t}")
    })

    it("converts non-date to string", () => {
      const fn = compileIcu("{t, time}", { locale: "en" })
      expect(fn({ t: "not a time" })).toBe("not a time")
    })
  })

  describe("list formatting", () => {
    it("formats list with default (conjunction) style", () => {
      const fn = compileIcu("{items, list}", { locale: "en" })
      expect(fn({ items: ["Alice", "Bob", "Charlie"] })).toBe("Alice, Bob, and Charlie")
    })

    it("formats list with disjunction style", () => {
      const fn = compileIcu("{options, list, disjunction}", { locale: "en" })
      expect(fn({ options: ["red", "blue", "green"] })).toBe("red, blue, or green")
    })

    it("formats list with unit style", () => {
      const fn = compileIcu("{parts, list, unit}", { locale: "en" })
      expect(fn({ parts: ["1", "2", "3"] })).toBe("1, 2, 3")
    })

    it("formats list with two items", () => {
      const fn = compileIcu("{items, list}", { locale: "en" })
      expect(fn({ items: ["Alice", "Bob"] })).toBe("Alice and Bob")
    })

    it("formats list with one item", () => {
      const fn = compileIcu("{items, list}", { locale: "en" })
      expect(fn({ items: ["Alice"] })).toBe("Alice")
    })

    it("formats list with German locale", () => {
      const fn = compileIcu("{items, list}", { locale: "de" })
      expect(fn({ items: ["Alice", "Bob", "Charlie"] })).toBe("Alice, Bob und Charlie")
    })

    it("shows placeholder for missing list value", () => {
      const fn = compileIcu("{items, list}", { locale: "en" })
      expect(fn({})).toBe("{items}")
    })

    it("converts non-array to string", () => {
      const fn = compileIcu("{items, list}", { locale: "en" })
      expect(fn({ items: "not an array" })).toBe("not an array")
    })
  })

  describe("relativeTime formatting", () => {
    it("formats positive relative time", () => {
      const fn = compileIcu("{days, relativeTime, day}", { locale: "en" })
      expect(fn({ days: 3 })).toBe("in 3 days")
    })

    it("formats negative relative time", () => {
      const fn = compileIcu("{days, relativeTime, day}", { locale: "en" })
      expect(fn({ days: -2 })).toBe("2 days ago")
    })

    it("formats hour with short style", () => {
      const fn = compileIcu("{hours, relativeTime, hour short}", { locale: "en" })
      const result = fn({ hours: 1 })
      expect(result).toContain("1")
      expect(result).toMatch(/hr|hour/i)
    })

    it("formats with German locale", () => {
      const fn = compileIcu("{days, relativeTime, day}", { locale: "de" })
      const result = fn({ days: -1 })
      expect(result).toContain("Tag")
    })

    it("shows placeholder for missing value", () => {
      const fn = compileIcu("{n, relativeTime, day}", { locale: "en" })
      expect(fn({})).toBe("{n}")
    })

    it("converts non-number to string", () => {
      const fn = compileIcu("{n, relativeTime, day}", { locale: "en" })
      expect(fn({ n: "text" })).toBe("text")
    })
  })

  describe("displayNames formatting", () => {
    it("formats language code", () => {
      const fn = compileIcu("{lang, displayNames, language}", { locale: "en" })
      expect(fn({ lang: "en" })).toBe("English")
      expect(fn({ lang: "de" })).toBe("German")
    })

    it("formats region code", () => {
      const fn = compileIcu("{country, displayNames, region}", { locale: "en" })
      expect(fn({ country: "US" })).toBe("United States")
      expect(fn({ country: "DE" })).toBe("Germany")
    })

    it("formats currency code", () => {
      const fn = compileIcu("{code, displayNames, currency}", { locale: "en" })
      expect(fn({ code: "EUR" })).toBe("Euro")
      expect(fn({ code: "USD" })).toBe("US Dollar")
    })

    it("formats with German locale", () => {
      const fn = compileIcu("{lang, displayNames, language}", { locale: "de" })
      expect(fn({ lang: "en" })).toBe("Englisch")
    })

    it("shows placeholder for missing value", () => {
      const fn = compileIcu("{code, displayNames, language}", { locale: "en" })
      expect(fn({})).toBe("{code}")
    })

    it("returns original value for unknown code", () => {
      const fn = compileIcu("{code, displayNames, language}", { locale: "en" })
      // Unknown codes may return undefined, which should fall back to the original value
      const result = fn({ code: "xyz" })
      expect(result).toBe("xyz")
    })
  })

  describe("tags", () => {
    it("calls tag function with children", () => {
      const fn = compileIcu("Hello <b>World</b>!", { locale: "en" })
      const result = fn({
        b: (children: string) => `**${children}**`
      })
      expect(result).toBe("Hello **World**!")
    })

    it("handles nested content in tags", () => {
      const fn = compileIcu("<link>Click {here}</link>", { locale: "en" })
      const result = fn({
        here: "here",
        link: (children: string) => `[${children}]`
      })
      expect(result).toBe("[Click here]")
    })

    it("returns children as-is when no tag function provided", () => {
      const fn = compileIcu("Hello <b>World</b>!", { locale: "en" })
      expect(fn({})).toBe("Hello World!")
    })

    it("returns array when tag function returns non-string", () => {
      const fn = compileIcu("Hello <b>World</b>!", { locale: "en" })
      const bold = { type: "bold", children: "World" }
      const result = fn({
        b: () => bold
      })
      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual(["Hello ", bold, "!"])
    })

    it("handles numeric tags (Lingui-style)", () => {
      const fn = compileIcu("Click <0>here</0> to <1>continue</1>", { locale: "en" })
      const result = fn({
        0: (children: string) => `[${children}]`,
        1: (children: string) => `(${children})`
      })
      expect(result).toBe("Click [here] to (continue)")
    })

    it("handles mixed numeric and named tags", () => {
      const fn = compileIcu("<0>Hello</0> <name>World</name>!", { locale: "en" })
      const result = fn({
        0: (children: string) => `«${children}»`,
        name: (children: string) => `[${children}]`
      })
      expect(result).toBe("«Hello» [World]!")
    })
  })

  describe("complex messages", () => {
    it("handles combined plural and variables", () => {
      const fn = compileIcu("{name} has {count, plural, one {# item} other {# items}}", {
        locale: "en"
      })
      expect(fn({ name: "Alice", count: 1 })).toBe("Alice has 1 item")
      expect(fn({ name: "Bob", count: 5 })).toBe("Bob has 5 items")
    })

    it("handles nested plurals in select", () => {
      const fn = compileIcu(
        "{gender, select, male {{count, plural, one {He has # item} other {He has # items}}} female {{count, plural, one {She has # item} other {She has # items}}} other {{count, plural, one {They have # item} other {They have # items}}}}",
        { locale: "en" }
      )
      expect(fn({ gender: "male", count: 1 })).toBe("He has 1 item")
      expect(fn({ gender: "female", count: 5 })).toBe("She has 5 items")
    })
  })

  describe("error handling", () => {
    it("throws on invalid ICU syntax in strict mode", () => {
      expect(() => compileIcu("{unclosed", { locale: "en" })).toThrow()
    })

    it("returns original message on error in non-strict mode", () => {
      const fn = compileIcu("{unclosed", { locale: "en", strict: false })
      expect(fn()).toBe("{unclosed")
    })
  })
})
