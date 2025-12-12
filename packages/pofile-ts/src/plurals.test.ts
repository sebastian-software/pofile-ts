import { describe, it, expect } from "vitest"
import {
  getPluralCategories,
  getPluralCount,
  getPluralFormsHeader,
  getPluralFunction
} from "./plurals"

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

  it("returns 3 forms for Russian", () => {
    expect(getPluralCategories("ru")).toEqual(["one", "few", "other"])
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
    expect(getPluralCategories("pt_BR")).toEqual(["one", "other"])
  })

  it("returns default for unknown locale", () => {
    expect(getPluralCategories("xx")).toEqual(["one", "other"])
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

describe("getPluralFormsHeader", () => {
  it("generates correct header for German", () => {
    expect(getPluralFormsHeader("de")).toBe("nplurals=2; plural=(n != 1);")
  })

  it("generates correct header for Polish", () => {
    const header = getPluralFormsHeader("pl")
    expect(header).toContain("nplurals=4")
    expect(header).toContain("plural=")
  })

  it("generates correct header for Arabic", () => {
    const header = getPluralFormsHeader("ar")
    expect(header).toContain("nplurals=6")
    expect(header).toContain("n==0")
  })

  it("generates correct header for Chinese", () => {
    expect(getPluralFormsHeader("zh")).toBe("nplurals=1; plural=0;")
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

  it("returns correct indices for Russian (3 forms)", () => {
    const fn = getPluralFunction("ru")
    expect(fn(1)).toBe(0) // one
    expect(fn(2)).toBe(1) // few
    expect(fn(5)).toBe(2) // other
    expect(fn(21)).toBe(0) // one
    expect(fn(22)).toBe(1) // few
    expect(fn(25)).toBe(2) // other
  })

  it("returns correct indices for Scottish Gaelic (4 forms - Celtic)", () => {
    const fn = getPluralFunction("gd")
    expect(fn(1)).toBe(0) // one
    expect(fn(2)).toBe(1) // two
    expect(fn(3)).toBe(2) // few (3-10)
    expect(fn(10)).toBe(2) // few
    expect(fn(11)).toBe(3) // other (>10)
    expect(fn(20)).toBe(3) // other
  })

  it("returns correct indices for Irish (5 forms)", () => {
    const fn = getPluralFunction("ga")
    expect(fn(1)).toBe(0) // one
    expect(fn(2)).toBe(1) // two
    expect(fn(3)).toBe(2) // few (3-10)
    expect(fn(10)).toBe(2) // few
    expect(fn(11)).toBe(3) // many (11-99)
    expect(fn(99)).toBe(3) // many
    expect(fn(100)).toBe(4) // other (>=100)
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

  it("returns correct indices for Slovenian (3 forms with two)", () => {
    const fn = getPluralFunction("sl")
    expect(fn(1)).toBe(0) // one
    expect(fn(2)).toBe(1) // two
    expect(fn(3)).toBe(2) // other
    expect(fn(5)).toBe(2) // other
  })
})
