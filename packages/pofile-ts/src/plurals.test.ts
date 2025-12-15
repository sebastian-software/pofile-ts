import { describe, it, expect } from "vitest"
import { getPluralCategories, getPluralCount, getPluralFunction } from "./plurals"

describe("getPluralCategories", () => {
  it("returns 2 forms for German", () => {
    expect(getPluralCategories("de")).toEqual(["one", "other"])
  })

  it("returns 2 forms for English", () => {
    expect(getPluralCategories("en")).toEqual(["one", "other"])
  })

  it("returns 4 forms for Polish", () => {
    expect(getPluralCategories("pl")).toEqual(["one", "few", "many", "other"])
  })

  it("returns 4 forms for Russian", () => {
    expect(getPluralCategories("ru")).toEqual(["one", "few", "many", "other"])
  })

  it("returns 6 forms for Arabic", () => {
    expect(getPluralCategories("ar")).toEqual(["zero", "one", "two", "few", "many", "other"])
  })

  it("returns 1 form for Chinese", () => {
    expect(getPluralCategories("zh")).toEqual(["other"])
  })

  it("returns 1 form for Japanese", () => {
    expect(getPluralCategories("ja")).toEqual(["other"])
  })

  it("handles locale with region (de-DE)", () => {
    expect(getPluralCategories("de-DE")).toEqual(["one", "other"])
  })

  it("handles locale with underscore (pt_BR)", () => {
    expect(getPluralCategories("pt_BR")).toEqual(["one", "many", "other"])
  })

  it("returns default for unknown locale", () => {
    expect(getPluralCategories("xx")).toEqual(["one", "other"])
  })

  it("returns 3 forms for French (one, many, other)", () => {
    expect(getPluralCategories("fr")).toEqual(["one", "many", "other"])
  })

  it("returns 4 forms for Czech", () => {
    expect(getPluralCategories("cs")).toEqual(["one", "few", "many", "other"])
  })

  it("returns 3 forms for Croatian (no many)", () => {
    expect(getPluralCategories("hr")).toEqual(["one", "few", "other"])
  })

  it("returns 4 forms for Ukrainian", () => {
    expect(getPluralCategories("uk")).toEqual(["one", "few", "many", "other"])
  })

  it("returns 3 forms for Latvian (zero, one, other)", () => {
    expect(getPluralCategories("lv")).toEqual(["zero", "one", "other"])
  })

  it("returns 4 forms for Lithuanian", () => {
    expect(getPluralCategories("lt")).toEqual(["one", "few", "many", "other"])
  })

  it("returns 5 forms for Maltese", () => {
    expect(getPluralCategories("mt")).toEqual(["one", "two", "few", "many", "other"])
  })
})

describe("getPluralCount", () => {
  it("returns correct count for various locales", () => {
    expect(getPluralCount("de")).toBe(2)
    expect(getPluralCount("pl")).toBe(4)
    expect(getPluralCount("ar")).toBe(6)
    expect(getPluralCount("zh")).toBe(1)
  })
})

describe("getPluralFunction", () => {
  it("returns correct indices for German (2 forms)", () => {
    const fn = getPluralFunction("de")
    expect(fn(0)).toBe(1) // other
    expect(fn(1)).toBe(0) // one
    expect(fn(2)).toBe(1) // other
    expect(fn(5)).toBe(1) // other
    expect(fn(21)).toBe(1) // other
  })

  it("returns correct indices for Polish (4 forms)", () => {
    const fn = getPluralFunction("pl")
    expect(fn(1)).toBe(0) // one
    expect(fn(2)).toBe(1) // few
    expect(fn(3)).toBe(1) // few
    expect(fn(4)).toBe(1) // few
    expect(fn(5)).toBe(2) // many
    expect(fn(11)).toBe(2) // many
    expect(fn(12)).toBe(2) // many
    expect(fn(22)).toBe(1) // few
    expect(fn(25)).toBe(2) // many
    expect(fn(100)).toBe(2) // many (100 ends in 0, which is in 0-1 range)
    expect(fn(1000000)).toBe(2) // many
  })

  it("returns correct indices for Arabic (6 forms)", () => {
    const fn = getPluralFunction("ar")
    expect(fn(0)).toBe(0) // zero
    expect(fn(1)).toBe(1) // one
    expect(fn(2)).toBe(2) // two
    expect(fn(3)).toBe(3) // few (3-10)
    expect(fn(10)).toBe(3) // few
    expect(fn(11)).toBe(4) // many (11-99)
    expect(fn(99)).toBe(4) // many
    expect(fn(100)).toBe(5) // other
  })

  it("returns correct indices for Chinese (1 form)", () => {
    const fn = getPluralFunction("zh")
    expect(fn(0)).toBe(0) // other
    expect(fn(1)).toBe(0) // other
    expect(fn(100)).toBe(0) // other
  })

  it("returns correct indices for Russian (4 forms)", () => {
    const fn = getPluralFunction("ru")
    expect(fn(1)).toBe(0) // one
    expect(fn(2)).toBe(1) // few
    expect(fn(5)).toBe(2) // many
    expect(fn(21)).toBe(0) // one
    expect(fn(22)).toBe(1) // few
    expect(fn(25)).toBe(2) // many
    expect(fn(0)).toBe(2) // many
    expect(fn(100)).toBe(2) // many
    expect(fn(1.5)).toBe(3) // other (fractions)
  })

  it("returns correct indices for Scottish Gaelic (4 forms - Celtic)", () => {
    // CLDR rules: one=1,11; two=2,12; few=3-10,13-19; other=0,20+
    const fn = getPluralFunction("gd")
    expect(fn(1)).toBe(0) // one
    expect(fn(11)).toBe(0) // one (CLDR: 11 is also "one")
    expect(fn(2)).toBe(1) // two
    expect(fn(12)).toBe(1) // two (CLDR: 12 is also "two")
    expect(fn(3)).toBe(2) // few (3-10)
    expect(fn(10)).toBe(2) // few
    expect(fn(13)).toBe(2) // few (13-19)
    expect(fn(19)).toBe(2) // few
    expect(fn(0)).toBe(3) // other
    expect(fn(20)).toBe(3) // other
    expect(fn(100)).toBe(3) // other
  })

  it("returns correct indices for Irish (5 forms)", () => {
    const fn = getPluralFunction("ga")
    expect(fn(1)).toBe(0) // one
    expect(fn(2)).toBe(1) // two
    expect(fn(3)).toBe(2) // few (3-6)
    expect(fn(6)).toBe(2) // few
    expect(fn(7)).toBe(3) // many (7-10)
    expect(fn(10)).toBe(3) // many
    expect(fn(11)).toBe(4) // other (>=11)
    expect(fn(100)).toBe(4) // other
  })

  it("returns default for unknown locale with region", () => {
    const fn = getPluralFunction("xx-YY")
    expect(fn(1)).toBe(0) // defaults to "one, other"
    expect(fn(2)).toBe(1)
  })

  it("returns correct indices for Welsh (6 forms)", () => {
    const fn = getPluralFunction("cy")
    expect(fn(0)).toBe(0) // zero
    expect(fn(1)).toBe(1) // one
    expect(fn(2)).toBe(2) // two
    expect(fn(3)).toBe(3) // few
    expect(fn(100)).toBe(5) // other
  })

  it("returns correct indices for Slovenian (4 forms)", () => {
    const fn = getPluralFunction("sl")
    expect(fn(1)).toBe(0) // one
    expect(fn(101)).toBe(0) // one (i % 100 = 1)
    expect(fn(2)).toBe(1) // two
    expect(fn(102)).toBe(1) // two (i % 100 = 2)
    expect(fn(3)).toBe(2) // few
    expect(fn(4)).toBe(2) // few
    expect(fn(5)).toBe(3) // other
    expect(fn(100)).toBe(3) // other
  })

  it("returns correct indices for French (3 forms with many for millions)", () => {
    const fn = getPluralFunction("fr")
    expect(fn(0)).toBe(0) // one
    expect(fn(1)).toBe(0) // one
    expect(fn(2)).toBe(2) // other
    expect(fn(100)).toBe(2) // other
    expect(fn(1000000)).toBe(1) // many (exact million)
    expect(fn(2000000)).toBe(1) // many (exact million)
    expect(fn(1000001)).toBe(2) // other
  })

  it("returns correct indices for Czech (4 forms with many for fractions)", () => {
    const fn = getPluralFunction("cs")
    expect(fn(1)).toBe(0) // one
    expect(fn(2)).toBe(1) // few
    expect(fn(3)).toBe(1) // few
    expect(fn(4)).toBe(1) // few
    expect(fn(5)).toBe(3) // other
    expect(fn(0)).toBe(3) // other
    expect(fn(1.5)).toBe(2) // many (fractions)
  })

  it("returns correct indices for Croatian (3 forms, no many)", () => {
    const fn = getPluralFunction("hr")
    expect(fn(1)).toBe(0) // one
    expect(fn(21)).toBe(0) // one
    expect(fn(2)).toBe(1) // few
    expect(fn(5)).toBe(2) // other
    expect(fn(0)).toBe(2) // other
  })

  it("returns correct indices for Latvian (3 forms with zero)", () => {
    const fn = getPluralFunction("lv")
    expect(fn(0)).toBe(0) // zero
    expect(fn(10)).toBe(0) // zero
    expect(fn(11)).toBe(0) // zero
    expect(fn(1)).toBe(1) // one
    expect(fn(21)).toBe(1) // one
    expect(fn(2)).toBe(2) // other
    expect(fn(5)).toBe(2) // other
  })

  it("returns correct indices for Lithuanian (4 forms)", () => {
    const fn = getPluralFunction("lt")
    expect(fn(1)).toBe(0) // one
    expect(fn(21)).toBe(0) // one
    expect(fn(2)).toBe(1) // few
    expect(fn(9)).toBe(1) // few
    expect(fn(0)).toBe(3) // other
    expect(fn(10)).toBe(3) // other
    expect(fn(11)).toBe(3) // other
    expect(fn(1.5)).toBe(2) // many (fractions)
  })

  it("returns correct indices for Maltese (5 forms)", () => {
    const fn = getPluralFunction("mt")
    expect(fn(1)).toBe(0) // one
    expect(fn(2)).toBe(1) // two
    expect(fn(0)).toBe(2) // few
    expect(fn(3)).toBe(2) // few
    expect(fn(10)).toBe(2) // few
    expect(fn(11)).toBe(3) // many
    expect(fn(19)).toBe(3) // many
    expect(fn(20)).toBe(4) // other
    expect(fn(100)).toBe(4) // other
  })
})
