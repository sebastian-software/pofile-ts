import { describe, it, expect } from "vitest"
import { PO } from "../src/po"

describe(".parsePluralForms()", () => {
  it("should return an object with empty nplurals and plural expression when there is no plural forms header", () => {
    const expected = {
      nplurals: undefined,
      plural: undefined
    }
    expect(PO.parsePluralForms(undefined)).toEqual(expected)
    expect(PO.parsePluralForms("")).toEqual(expected)
  })

  it("should return an object with nplurals and plural set to xgettext's default output", () => {
    const pluralForms = "nplurals=INTEGER; plural=EXPRESSION;"

    const expected = {
      nplurals: "INTEGER",
      plural: "EXPRESSION"
    }
    const actual = PO.parsePluralForms(pluralForms)
    expect(actual).toEqual(expected)
  })

  it("should return an object with nplurals and plural set to typical string", () => {
    const pluralForms =
      "nplurals=3; plural=(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);"

    const expected = {
      nplurals: "3",
      plural: "(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2)"
    }
    const actual = PO.parsePluralForms(pluralForms)
    expect(actual).toEqual(expected)
  })

  // node-gettext stores plural forms strings with spaces. They don't appear
  // to write PO files at all, but it seems prudent to handle this case
  // anyway.
  it("should handle spaces around assignments in plural forms string", () => {
    const pluralForms =
      "nplurals = 3; plural = (n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);"

    const expected = {
      nplurals: "3",
      plural: "(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2)"
    }
    const actual = PO.parsePluralForms(pluralForms)
    expect(actual).toEqual(expected)
  })
})
