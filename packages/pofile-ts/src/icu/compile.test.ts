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

    it("accepts timestamp as date value", () => {
      const fn = compileIcu("{d, date, medium}", { locale: "en" })
      const timestamp = new Date(2024, 11, 15).getTime()
      const result = fn({ d: timestamp })
      expect(result).toContain("2024")
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
