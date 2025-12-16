import { describe, it, expect } from "vitest"
import { compileIcu, createIcuCompiler } from "./compile"

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

    it("formats currency with runtime currency code from values", () => {
      const fn = compileIcu("{price, number, currency}", { locale: "en" })
      const eurResult = fn({ price: 99.99, currency: "EUR" })
      expect(eurResult).toContain("99.99")
      expect(eurResult).toContain("€")

      const usdResult = fn({ price: 99.99, currency: "USD" })
      expect(usdResult).toContain("99.99")
      expect(usdResult).toContain("$")
    })

    it("defaults to USD when currency not provided", () => {
      const fn = compileIcu("{price, number, currency}", { locale: "en" })
      const result = fn({ price: 99.99 })
      expect(result).toContain("99.99")
      expect(result).toContain("$")
    })

    it("caches currency formatters for reuse", () => {
      const fn = compileIcu("{price, number, currency}", { locale: "en" })
      // Multiple calls with same currency should use cache
      const r1 = fn({ price: 10, currency: "EUR" })
      const r2 = fn({ price: 20, currency: "EUR" })
      expect(r1).toContain("€")
      expect(r2).toContain("€")
    })

    describe("built-in number styles", () => {
      it("formats compact numbers (1K, 1M)", () => {
        const fn = compileIcu("{n, number, compact}", { locale: "en" })
        expect(fn({ n: 1500 })).toMatch(/1\.?5K/)
        expect(fn({ n: 2500000 })).toMatch(/2\.?5M/)
      })

      it("formats compact long numbers", () => {
        const fn = compileIcu("{n, number, compactLong}", { locale: "en" })
        expect(fn({ n: 1500 })).toMatch(/1\.?5 thousand/i)
      })

      it("formats with fixed decimals (decimal2)", () => {
        const fn = compileIcu("{n, number, decimal2}", { locale: "en" })
        expect(fn({ n: 42 })).toBe("42.00")
        expect(fn({ n: 3.1 })).toBe("3.10")
        expect(fn({ n: 1.234 })).toBe("1.23")
      })

      it("formats with signAlways", () => {
        const fn = compileIcu("{n, number, signAlways}", { locale: "en" })
        expect(fn({ n: 5 })).toMatch(/\+5/)
        expect(fn({ n: -3 })).toMatch(/-3/)
      })

      it("formats without grouping", () => {
        const fn = compileIcu("{n, number, noGrouping}", { locale: "en" })
        expect(fn({ n: 1000000 })).toBe("1000000")
      })

      it("formats file size units", () => {
        const byteFn = compileIcu("{n, number, byte}", { locale: "en" })
        expect(byteFn({ n: 1024 })).toMatch(/1,?024\s*B/)

        const kbFn = compileIcu("{n, number, kilobyte}", { locale: "en" })
        expect(kbFn({ n: 512 })).toMatch(/512\s*kB/)

        const mbFn = compileIcu("{n, number, megabyte}", { locale: "en" })
        expect(mbFn({ n: 1.5 })).toMatch(/1\.5\s*MB/)

        const gbFn = compileIcu("{n, number, gigabyte}", { locale: "en" })
        expect(gbFn({ n: 2 })).toMatch(/2\s*GB/)
      })

      it("formats distance units", () => {
        const meterFn = compileIcu("{n, number, meter}", { locale: "en" })
        expect(meterFn({ n: 100 })).toMatch(/100\s*m/)

        const kmFn = compileIcu("{n, number, kilometer}", { locale: "en" })
        expect(kmFn({ n: 5 })).toMatch(/5\s*km/)
      })

      it("formats temperature units", () => {
        const celsiusFn = compileIcu("{n, number, celsius}", { locale: "en" })
        expect(celsiusFn({ n: 22 })).toMatch(/22.*°C/)

        const fahrenheitFn = compileIcu("{n, number, fahrenheit}", { locale: "en" })
        expect(fahrenheitFn({ n: 72 })).toMatch(/72.*°F/)
      })

      it("formats weight units", () => {
        const kgFn = compileIcu("{n, number, kilogram}", { locale: "en" })
        expect(kgFn({ n: 70 })).toMatch(/70\s*kg/)
      })

      it("formats duration units", () => {
        const secFn = compileIcu("{n, number, second}", { locale: "en" })
        expect(secFn({ n: 30 })).toMatch(/30\s*sec/)

        const minFn = compileIcu("{n, number, minute}", { locale: "en" })
        expect(minFn({ n: 5 })).toMatch(/5\s*min/)

        const hourFn = compileIcu("{n, number, hour}", { locale: "en" })
        expect(hourFn({ n: 2 })).toMatch(/2\s*hr/)
      })
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

    describe("built-in date styles", () => {
      const testDate = new Date(2024, 11, 15) // Dec 15, 2024 (Sunday)

      it("formats ISO date (YYYY-MM-DD like)", () => {
        const fn = compileIcu("{d, date, iso}", { locale: "en" })
        const result = fn({ d: testDate })
        expect(result).toContain("12")
        expect(result).toContain("15")
        expect(result).toContain("2024")
      })

      it("formats weekday only", () => {
        const fn = compileIcu("{d, date, weekday}", { locale: "en" })
        expect(fn({ d: testDate })).toBe("Sunday")
      })

      it("formats weekday short", () => {
        const fn = compileIcu("{d, date, weekdayShort}", { locale: "en" })
        expect(fn({ d: testDate })).toBe("Sun")
      })

      it("formats month and year", () => {
        const fn = compileIcu("{d, date, monthYear}", { locale: "en" })
        expect(fn({ d: testDate })).toBe("December 2024")
      })

      it("formats month and year short", () => {
        const fn = compileIcu("{d, date, monthYearShort}", { locale: "en" })
        expect(fn({ d: testDate })).toMatch(/Dec 2024/)
      })

      it("formats month and day", () => {
        const fn = compileIcu("{d, date, monthDay}", { locale: "en" })
        expect(fn({ d: testDate })).toMatch(/Dec 15/)
      })

      it("formats day, month, year", () => {
        const fn = compileIcu("{d, date, dayMonthYear}", { locale: "en" })
        const result = fn({ d: testDate })
        expect(result).toContain("Dec")
        expect(result).toContain("15")
        expect(result).toContain("2024")
      })
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

    describe("built-in time styles", () => {
      const testTime = new Date(2024, 11, 15, 14, 30, 45) // 14:30:45

      it("formats hour and minute", () => {
        const fn = compileIcu("{t, time, hourMinute}", { locale: "en" })
        const result = fn({ t: testTime })
        expect(result).toMatch(/\d{2}:\d{2}/)
      })

      it("formats hour, minute, second", () => {
        const fn = compileIcu("{t, time, hourMinuteSecond}", { locale: "en" })
        const result = fn({ t: testTime })
        expect(result).toMatch(/\d{2}:\d{2}:\d{2}/)
      })

      it("formats 24-hour time", () => {
        const fn = compileIcu("{t, time, hourMinute24}", { locale: "en" })
        const result = fn({ t: testTime })
        expect(result).toBe("14:30")
      })

      it("formats 12-hour time", () => {
        const fn = compileIcu("{t, time, hourMinute12}", { locale: "en" })
        const result = fn({ t: testTime })
        expect(result).toMatch(/2:30\s*PM/i)
      })

      it("formats hour only (12-hour)", () => {
        const fn = compileIcu("{t, time, hour12}", { locale: "en" })
        const result = fn({ t: testTime })
        expect(result).toMatch(/2\s*PM/i)
      })
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

    describe("built-in list styles", () => {
      const items = ["A", "B", "C"]

      it("formats with 'or' alias for disjunction", () => {
        const fn = compileIcu("{items, list, or}", { locale: "en" })
        expect(fn({ items })).toBe("A, B, or C")
      })

      it("formats with narrow style", () => {
        const fn = compileIcu("{items, list, narrow}", { locale: "en" })
        // Narrow style typically uses less spacing
        expect(fn({ items })).toBe("A, B, C")
      })

      it("formats with short style", () => {
        const fn = compileIcu("{items, list, short}", { locale: "en" })
        // Short style may abbreviate "and"
        const result = fn({ items })
        expect(result).toContain("A")
        expect(result).toContain("B")
        expect(result).toContain("C")
      })

      it("formats with orNarrow style", () => {
        const fn = compileIcu("{items, list, orNarrow}", { locale: "en" })
        const result = fn({ items })
        expect(result).toContain("A")
        expect(result).toContain("B")
        expect(result).toContain("C")
      })
    })

    it("converts non-array to string", () => {
      const fn = compileIcu("{items, list}", { locale: "en" })
      expect(fn({ items: "not an array" })).toBe("not an array")
    })
  })

  describe("ago formatting (relative time)", () => {
    it("formats positive relative time", () => {
      const fn = compileIcu("{days, ago, day}", { locale: "en" })
      expect(fn({ days: 3 })).toBe("in 3 days")
    })

    it("formats negative relative time", () => {
      const fn = compileIcu("{days, ago, day}", { locale: "en" })
      expect(fn({ days: -2 })).toBe("2 days ago")
    })

    it("formats hour with short style", () => {
      const fn = compileIcu("{hours, ago, hour short}", { locale: "en" })
      const result = fn({ hours: 1 })
      expect(result).toContain("1")
      expect(result).toMatch(/hr|hour/i)
    })

    it("formats with German locale", () => {
      const fn = compileIcu("{days, ago, day}", { locale: "de" })
      const result = fn({ days: -1 })
      expect(result).toContain("Tag")
    })

    it("shows placeholder for missing value", () => {
      const fn = compileIcu("{n, ago, day}", { locale: "en" })
      expect(fn({})).toBe("{n}")
    })

    it("converts non-number to string", () => {
      const fn = compileIcu("{n, ago, day}", { locale: "en" })
      expect(fn({ n: "text" })).toBe("text")
    })
  })

  describe("name formatting (display names)", () => {
    it("formats language code", () => {
      const fn = compileIcu("{lang, name, language}", { locale: "en" })
      expect(fn({ lang: "en" })).toBe("English")
      expect(fn({ lang: "de" })).toBe("German")
    })

    it("formats region code", () => {
      const fn = compileIcu("{country, name, region}", { locale: "en" })
      expect(fn({ country: "US" })).toBe("United States")
      expect(fn({ country: "DE" })).toBe("Germany")
    })

    it("formats currency code", () => {
      const fn = compileIcu("{code, name, currency}", { locale: "en" })
      expect(fn({ code: "EUR" })).toBe("Euro")
      expect(fn({ code: "USD" })).toBe("US Dollar")
    })

    it("formats with German locale", () => {
      const fn = compileIcu("{lang, name, language}", { locale: "de" })
      expect(fn({ lang: "en" })).toBe("Englisch")
    })

    it("shows placeholder for missing value", () => {
      const fn = compileIcu("{code, name, language}", { locale: "en" })
      expect(fn({})).toBe("{code}")
    })

    it("returns original value for unknown code", () => {
      const fn = compileIcu("{code, name, language}", { locale: "en" })
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

  describe("custom styles", () => {
    describe("numberStyles", () => {
      it("supports custom number style with unit", () => {
        const fn = compileIcu("{size, number, bytes}", {
          locale: "en",
          numberStyles: {
            bytes: { style: "unit", unit: "byte", unitDisplay: "narrow" }
          }
        })
        expect(fn({ size: 1024 })).toBe("1,024B")
      })

      it("supports custom number style with fractionDigits", () => {
        const fn = compileIcu("{value, number, precise}", {
          locale: "en",
          numberStyles: {
            precise: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          }
        })
        expect(fn({ value: 42 })).toBe("42.00")
        expect(fn({ value: 3.1 })).toBe("3.10")
      })

      it("supports custom percent style", () => {
        const fn = compileIcu("{ratio, number, percent2}", {
          locale: "en",
          numberStyles: {
            percent2: { style: "percent", minimumFractionDigits: 2 }
          }
        })
        expect(fn({ ratio: 0.1234 })).toBe("12.34%")
      })

      it("falls back to built-in styles when no custom match", () => {
        const fn = compileIcu("{n, number, percent}", {
          locale: "en",
          numberStyles: { other: {} }
        })
        expect(fn({ n: 0.5 })).toBe("50%")
      })
    })

    describe("dateStyles", () => {
      it("supports custom date style with specific format", () => {
        const fn = compileIcu("{d, date, monthYear}", {
          locale: "en",
          dateStyles: {
            monthYear: { month: "long", year: "numeric" }
          }
        })
        const date = new Date(2024, 11, 15) // Dec 15, 2024
        expect(fn({ d: date })).toBe("December 2024")
      })

      it("supports custom date style with weekday", () => {
        const fn = compileIcu("{d, date, weekday}", {
          locale: "en",
          dateStyles: {
            weekday: { weekday: "long" }
          }
        })
        const date = new Date(2024, 11, 15) // Sunday
        expect(fn({ d: date })).toBe("Sunday")
      })

      it("falls back to built-in styles when no custom match", () => {
        const fn = compileIcu("{d, date, short}", {
          locale: "en",
          dateStyles: {}
        })
        const date = new Date(2024, 11, 15)
        const result = fn({ d: date })
        expect(result).toContain("12")
        expect(result).toContain("15")
      })
    })

    describe("timeStyles", () => {
      it("supports custom time style with seconds", () => {
        const fn = compileIcu("{t, time, precise}", {
          locale: "en",
          timeStyles: {
            precise: { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }
          }
        })
        const date = new Date(2024, 11, 15, 14, 30, 45)
        expect(fn({ t: date })).toBe("14:30:45")
      })

      it("supports custom time style with hour only", () => {
        const fn = compileIcu("{t, time, hourOnly}", {
          locale: "en",
          timeStyles: {
            hourOnly: { hour: "numeric", hour12: true }
          }
        })
        const date = new Date(2024, 11, 15, 14, 30, 0)
        expect(fn({ t: date })).toMatch(/2\s*PM/)
      })
    })

    describe("listStyles", () => {
      it("supports custom list style with narrow conjunction", () => {
        const fn = compileIcu("{items, list, narrow}", {
          locale: "en",
          listStyles: {
            narrow: { type: "conjunction", style: "narrow" }
          }
        })
        expect(fn({ items: ["A", "B", "C"] })).toBe("A, B, C")
      })

      it("supports custom list style with disjunction", () => {
        const fn = compileIcu("{items, list, or}", {
          locale: "en",
          listStyles: {
            or: { type: "disjunction" }
          }
        })
        expect(fn({ items: ["A", "B", "C"] })).toBe("A, B, or C")
      })

      it("falls back to built-in styles when no custom match", () => {
        const fn = compileIcu("{items, list, unit}", {
          locale: "en",
          listStyles: {}
        })
        expect(fn({ items: ["A", "B"] })).toBe("A, B")
      })
    })

    describe("combined custom styles", () => {
      it("supports multiple custom style types together", () => {
        const fn = compileIcu("Size: {size, number, kb}, Date: {d, date, iso}", {
          locale: "en",
          numberStyles: {
            kb: { style: "unit", unit: "kilobyte", unitDisplay: "short" }
          },
          dateStyles: {
            iso: { year: "numeric", month: "2-digit", day: "2-digit" }
          }
        })
        const result = fn({ size: 512, d: new Date(2024, 11, 15) })
        expect(result).toContain("512 kB")
        expect(result).toContain("12/15/2024")
      })
    })
  })
})

describe("createIcuCompiler", () => {
  it("creates a reusable compiler with pre-configured options", () => {
    const compile = createIcuCompiler({
      locale: "en",
      numberStyles: {
        bytes: { style: "unit", unit: "byte", unitDisplay: "narrow" }
      }
    })

    const msg1 = compile("{size, number, bytes}")
    const msg2 = compile("{count, number, bytes}")

    expect(msg1({ size: 1024 })).toBe("1,024B")
    expect(msg2({ count: 512 })).toBe("512B")
  })

  it("preserves all options across compiled messages", () => {
    const compile = createIcuCompiler({
      locale: "de",
      numberStyles: {
        precise: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      },
      dateStyles: {
        monthYear: { month: "long", year: "numeric" }
      }
    })

    const numMsg = compile("{value, number, precise}")
    const dateMsg = compile("{d, date, monthYear}")

    expect(numMsg({ value: 42 })).toBe("42,00")
    expect(dateMsg({ d: new Date(2024, 11, 15) })).toBe("Dezember 2024")
  })

  it("supports dynamic currency in pre-configured compiler", () => {
    const compile = createIcuCompiler({ locale: "de" })
    const price = compile("{amount, number, currency}")

    expect(price({ amount: 99.99, currency: "EUR" })).toMatch(/99,99\s*€/)
    expect(price({ amount: 99.99, currency: "USD" })).toMatch(/99,99\s*\$/)
  })

  it("allows different locales in separate compilers", () => {
    const compileEn = createIcuCompiler({ locale: "en" })
    const compileDe = createIcuCompiler({ locale: "de" })

    const msgEn = compileEn("{count, plural, one {# item} other {# items}}")
    const msgDe = compileDe("{count, plural, one {# Artikel} other {# Artikel}}")

    expect(msgEn({ count: 1 })).toBe("1 item")
    expect(msgDe({ count: 1 })).toBe("1 Artikel")
  })
})
