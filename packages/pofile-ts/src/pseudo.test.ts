import { describe, expect, it } from "vitest"
import { pseudoLocalize, pseudoLocalizeWithOptions } from "./pseudo"

describe("pseudoLocalize", () => {
  it("pseudolocalizes plain text", () => {
    expect(pseudoLocalize("Hello world")).toBe("[Ĥëľľø ŵøřľð~~~]")
  })

  it("preserves simple ICU placeholders", () => {
    expect(pseudoLocalize("Hello {name}, you have {count, number} items")).toBe(
      "[Ĥëľľø~~ {name}, ÿøü ĥàṽë~~ {count, number} ïŧëɱš~~]"
    )
  })

  it("preserves plural structure and pound markers", () => {
    expect(
      pseudoLocalizeWithOptions("{count, plural, one {# file} other {# files}}", { wrap: false })
    ).toBe("{count, plural, one {# ƒïľë~} other {# ƒïľëš~~}}")
  })

  it("preserves select structure", () => {
    expect(
      pseudoLocalizeWithOptions("{gender, select, male {He} female {She} other {They}}", {
        wrap: false,
        expansion: 0
      })
    ).toBe("{gender, select, male {Ĥë} female {Šĥë} other {Ŧĥëÿ}}")
  })

  it("preserves tag syntax while localizing tag contents", () => {
    expect(pseudoLocalizeWithOptions("Click <0>here</0>", { wrap: false, expansion: 0 })).toBe(
      "Çľïçķ <0>ĥëřë</0>"
    )
  })

  it("preserves nested ICU syntax inside tags", () => {
    expect(
      pseudoLocalizeWithOptions("<b>{count, plural, one {# file} other {# files}}</b>", {
        wrap: false,
        expansion: 0
      })
    ).toBe("<b>{count, plural, one {# ƒïľë} other {# ƒïľëš}}</b>")
  })

  it("supports custom wrappers and expansion", () => {
    expect(
      pseudoLocalizeWithOptions("Save", {
        prefix: "⟦",
        suffix: "⟧",
        expansion: 0
      })
    ).toBe("⟦Šàṽë⟧")
  })

  it("escapes ICU-significant literal characters when serializing parsed messages", () => {
    expect(pseudoLocalizeWithOptions("Bob's file", { wrap: false, expansion: 0 })).toBe(
      "Ɓøƀ''š ƒïľë"
    )
    expect(pseudoLocalizeWithOptions("Use '<' and '{'", { wrap: false, expansion: 0 })).toBe(
      "Üšë '<' àñð '{'"
    )
  })

  it("falls back without corrupting simple placeholders for invalid ICU", () => {
    expect(pseudoLocalizeWithOptions("Hello {name", { wrap: false, expansion: 0 })).toBe(
      "Ĥëľľø {ñàɱë"
    )
    expect(
      pseudoLocalizeWithOptions("Hello {name}, click <0>here</0> {", {
        wrap: false,
        expansion: 0
      })
    ).toBe("Ĥëľľø {name}, çľïçķ <0>ĥëřë</0> {")
  })
})
