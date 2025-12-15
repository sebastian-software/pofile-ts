import { describe, it, expect } from "vitest"
import {
  gettextToIcu,
  isPluralItem,
  normalizeItemToIcu,
  normalizeToIcu,
  icuToGettextSource
} from "./conversion"
import type { PoItem, PoFile } from "../types"
import { createItem } from "../Item"
import { createPoFile } from "../parse"

function createPluralItem(overrides: Partial<PoItem> = {}): PoItem {
  return {
    ...createItem(),
    msgid: "One item",
    msgid_plural: "{count} items",
    msgstr: ["Ein Artikel", "{count} Artikel"],
    ...overrides
  }
}

describe("gettextToIcu", () => {
  it("converts German plural to ICU", () => {
    const item = createPluralItem()
    const result = gettextToIcu(item, { locale: "de" })

    expect(result).toBe("{count, plural, one {Ein Artikel} other {{count} Artikel}}")
  })

  it("uses custom plural variable", () => {
    const item = createPluralItem()
    const result = gettextToIcu(item, { locale: "de", pluralVariable: "n" })

    expect(result).toBe("{n, plural, one {Ein Artikel} other {{count} Artikel}}")
  })

  it("converts Polish 4-form plural to ICU", () => {
    const item = createPluralItem({
      msgid: "One file",
      msgid_plural: "{count} files",
      msgstr: ["plik", "pliki", "plików", "pliki"]
    })

    const result = gettextToIcu(item, { locale: "pl" })

    expect(result).toBe("{count, plural, one {plik} few {pliki} many {plików} other {pliki}}")
  })

  it("converts Arabic 6-form plural to ICU", () => {
    const item = createPluralItem({
      msgstr: ["صفر", "واحد", "اثنان", "قليل", "كثير", "آخر"]
    })

    const result = gettextToIcu(item, { locale: "ar" })

    expect(result).toBe(
      "{count, plural, zero {صفر} one {واحد} two {اثنان} few {قليل} many {كثير} other {آخر}}"
    )
  })

  it("returns null for non-plural items", () => {
    const item = createItem()
    item.msgid = "Hello"
    item.msgstr = ["Hallo"]

    expect(gettextToIcu(item, { locale: "de" })).toBeNull()
  })

  it("returns null for items without msgid_plural", () => {
    const item = createItem()
    item.msgid = "Hello"
    item.msgstr = ["Hallo", "Hallos"]

    expect(gettextToIcu(item, { locale: "de" })).toBeNull()
  })

  it("expands # to {var} by default", () => {
    const item = createPluralItem({
      msgstr: ["# Artikel", "# Artikel"]
    })

    const result = gettextToIcu(item, { locale: "de" })

    expect(result).toBe("{count, plural, one {{count} Artikel} other {{count} Artikel}}")
  })

  it("preserves # when expandOctothorpe is false", () => {
    const item = createPluralItem({
      msgstr: ["# Artikel", "# Artikel"]
    })

    const result = gettextToIcu(item, { locale: "de", expandOctothorpe: false })

    expect(result).toBe("{count, plural, one {# Artikel} other {# Artikel}}")
  })
})

describe("isPluralItem", () => {
  it("returns true for plural items", () => {
    const item = createPluralItem()
    expect(isPluralItem(item)).toBe(true)
  })

  it("returns false for non-plural items", () => {
    const item = createItem()
    item.msgid = "Hello"
    item.msgstr = ["Hallo"]
    expect(isPluralItem(item)).toBe(false)
  })
})

describe("normalizeItemToIcu", () => {
  it("normalizes item in-place", () => {
    const item = createPluralItem()

    const result = normalizeItemToIcu(item, { locale: "de" })

    expect(result).toBe(true)
    expect(item.msgstr).toEqual(["{count, plural, one {Ein Artikel} other {{count} Artikel}}"])
    expect(item.msgid_plural).toBe("")
  })

  it("returns false for non-plural items", () => {
    const item = createItem()
    item.msgid = "Hello"
    item.msgstr = ["Hallo"]

    const result = normalizeItemToIcu(item, { locale: "de" })

    expect(result).toBe(false)
    expect(item.msgstr).toEqual(["Hallo"])
  })
})

describe("normalizeToIcu", () => {
  it("normalizes all plural items in a PO file", () => {
    const po: PoFile = {
      ...createPoFile(),
      headers: { "Plural-Forms": "nplurals=2; plural=(n != 1);" },
      items: [
        createPluralItem(),
        {
          ...createItem(),
          msgid: "Hello",
          msgstr: ["Hallo"]
        }
      ]
    }

    const result = normalizeToIcu(po, { locale: "de" })
    const [pluralItem, singularItem] = result.items

    expect(pluralItem?.msgstr[0]).toBe("{count, plural, one {Ein Artikel} other {{count} Artikel}}")
    expect(singularItem?.msgstr[0]).toBe("Hallo")
  })

  it("does not modify original when inPlace is false", () => {
    const item = createPluralItem()
    const po: PoFile = {
      ...createPoFile(),
      items: [item]
    }

    const originalMsgstr = [...item.msgstr]
    normalizeToIcu(po, { locale: "de", inPlace: false })

    expect(item.msgstr).toEqual(originalMsgstr)
  })

  it("modifies original when inPlace is true", () => {
    const item = createPluralItem()
    const po: PoFile = {
      ...createPoFile(),
      items: [item]
    }

    normalizeToIcu(po, { locale: "de", inPlace: true })

    expect(item.msgstr[0]).toContain("plural")
  })
})

describe("icuToGettextSource", () => {
  it("expands # to {var} by default", () => {
    const icu = "{count, plural, one {# item} other {# items}}"
    const result = icuToGettextSource(icu)

    expect(result).toEqual({
      msgid: "{count} item",
      msgid_plural: "{count} items",
      pluralVariable: "count"
    })
  })

  it("preserves # when expandOctothorpe is false", () => {
    const icu = "{count, plural, one {# item} other {# items}}"
    const result = icuToGettextSource(icu, { expandOctothorpe: false })

    expect(result).toEqual({
      msgid: "# item",
      msgid_plural: "# items",
      pluralVariable: "count"
    })
  })

  it("handles complex ICU with nested braces", () => {
    const icu = "{n, plural, one {{n} file} other {{n} files}}"
    const result = icuToGettextSource(icu)

    expect(result).toEqual({
      msgid: "{n} file",
      msgid_plural: "{n} files",
      pluralVariable: "n"
    })
  })

  it("returns null for non-plural ICU", () => {
    expect(icuToGettextSource("Hello {name}")).toBeNull()
    expect(icuToGettextSource("{gender, select, male {He} female {She}}")).toBeNull()
  })

  it("returns null for plural with only one case", () => {
    expect(icuToGettextSource("{count, plural, other {items}}")).toBeNull()
  })

  it("handles 4-form Polish ICU", () => {
    const icu = "{count, plural, one {plik} few {pliki} many {plików} other {pliki}}"
    const result = icuToGettextSource(icu)

    expect(result).toEqual({
      msgid: "plik",
      msgid_plural: "pliki",
      pluralVariable: "count"
    })
  })
})
