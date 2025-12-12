import { describe, it, expect } from "vitest"
import { getPluralCategories, getPluralCount, getPluralFormsHeader } from "./plurals"

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
