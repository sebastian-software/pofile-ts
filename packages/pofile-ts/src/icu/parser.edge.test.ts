import { describe, it, expect } from "vitest"
import { IcuParser, parseIcu } from "./parser"

function expectSyntaxError(message: string) {
  const result = parseIcu(message)
  expect(result.success).toBe(false)
  expect(result.errors[0]?.kind).toBe("SYNTAX_ERROR")
  return result.errors[0]?.message ?? ""
}

describe("parseIcu (edge cases)", () => {
  describe("argument syntax errors", () => {
    it("errors on missing ',' or '}' after argument name", () => {
      expect(expectSyntaxError("{name foo}")).toContain("Expected ',' or '}'")
      expect(expectSyntaxError("{name:foo}")).toContain("Expected ',' or '}'")
    })

    it("errors on missing argument type after comma", () => {
      expect(expectSyntaxError("{name, }")).toContain("Expected argument type")
      expect(expectSyntaxError("{name,\t}")).toContain("Expected argument type")
    })

    it("errors on missing style after second comma", () => {
      expect(expectSyntaxError("{n, number, }")).toContain("Expected style")
      expect(expectSyntaxError("{d, date, }")).toContain("Expected style")
      expect(expectSyntaxError("{t, time, }")).toContain("Expected style")
    })
  })

  describe("plural/select option errors", () => {
    it("errors on empty plural options", () => {
      expect(expectSyntaxError("{n, plural, }")).toContain("Expected at least one plural option")
      expect(expectSyntaxError("{n, plural, {x}}")).toContain("Expected at least one plural option")
    })

    it("errors on empty select options", () => {
      expect(expectSyntaxError("{g, select, }")).toContain("Expected at least one select option")
      expect(expectSyntaxError("{g, select, {x}}")).toContain("Expected at least one select option")
    })

    it("errors on duplicate selectors (select)", () => {
      expect(expectSyntaxError("{g, select, a {A} a {AA} other {O}}")).toContain(
        "Duplicate selector"
      )
    })

    it("errors on duplicate selectors (=N plural)", () => {
      expect(expectSyntaxError("{n, plural, =1 {a} =1 {b} other {c}}")).toContain(
        "Duplicate selector"
      )
    })

    it("errors on missing 'other' clause when required (select)", () => {
      expect(expectSyntaxError("{g, select, male {He}}")).toContain("Missing 'other' clause")
    })

    it("errors on missing 'other' clause when required (plural)", () => {
      expect(expectSyntaxError("{n, plural, one {#}}")).toContain("Missing 'other' clause")
    })

    it("handles trailing whitespace before closing braces (plural/select)", () => {
      const plural = parseIcu("{n, plural, one {a} other {b}   }")
      expect(plural.success).toBe(true)
      const select = parseIcu("{g, select, male {He} other {They}   }")
      expect(select.success).toBe(true)
    })
  })

  describe("integer parsing edge cases", () => {
    it("errors on '=' selector with non-integer", () => {
      expect(expectSyntaxError("{n, plural, =a {x} other {y}}")).toContain("Expected integer")
      expect(expectSyntaxError("{n, plural, =- {x} other {y}}")).toContain("Expected integer")
      expect(expectSyntaxError("{n, plural, =--1 {x} other {y}}")).toContain("Expected integer")
    })

    it("accepts plus-sign integers", () => {
      const result = parseIcu("{n, plural, =+1 {one} other {other}}")
      expect(result.success).toBe(true)
      const plural = result.ast?.[0]
      expect(plural).toMatchObject({ type: "plural" })
      // Selector should normalize to \"=1\"
      const opts = (plural as { options: Record<string, unknown> }).options
      expect(opts).toHaveProperty("=1")
    })
  })

  describe("tag parsing edge cases", () => {
    it("treats spaced self-closing tags as literal", () => {
      const result = parseIcu("hello <br />")
      expect(result.success).toBe(true)
      expect(result.ast?.[1]).toMatchObject({ type: "literal", value: "<br/>" })
    })

    it("errors on mismatched closing tag with whitespace", () => {
      expect(expectSyntaxError("<a>text</b >")).toContain("Mismatched tag")
    })

    it("errors on unclosed tag (missing closing token)", () => {
      expect(expectSyntaxError("<a>text")).toContain("Unclosed tag")
    })

    it("errors on top-level closing tag (unexpected character)", () => {
      expect(expectSyntaxError("</b>")).toContain("Unexpected character")
    })
  })

  describe("literal/quoting edge cases", () => {
    it("treats a single apostrophe as literal when not quoting special chars", () => {
      const result = parseIcu("rock 'n' roll")
      expect(result.success).toBe(true)
      expect(result.ast?.[0]).toMatchObject({
        type: "literal",
        value: "rock 'n' roll"
      })
    })

    it("handles unterminated quoted literal by treating rest as literal", () => {
      // Quote starts because next is '{' but never closes; parser should not throw.
      const result = parseIcu("Hello '{name}")
      expect(result.success).toBe(true)
      expect(result.ast?.[0]).toMatchObject({
        type: "literal",
        value: "Hello {name}"
      })
    })

    it("handles doubled apostrophes inside quoted literal", () => {
      const result = parseIcu("This '{''}' end")
      expect(result.success).toBe(true)
      expect(result.ast?.[0]).toMatchObject({
        type: "literal",
        value: "This {'} end"
      })
    })

    it("does not treat '<' as a tag when next char is not a tag char", () => {
      const result = parseIcu("a < b")
      expect(result.success).toBe(true)
      expect(result.ast?.[0]).toMatchObject({
        type: "literal",
        value: "a < b"
      })
    })

    it("stops literal at tag close token when parsing tag children", () => {
      const result = parseIcu("<b>text</b>")
      expect(result.success).toBe(true)
      const tag = result.ast?.[0]
      expect(tag).toMatchObject({ type: "tag", value: "b" })
      expect((tag as { children: { type: string; value?: string }[] }).children[0]).toMatchObject({
        type: "literal",
        value: "text"
      })
    })
  })

  describe("style parsing edge cases", () => {
    it("parses styles that include braces", () => {
      const result = parseIcu("{n, number, style{with}braces}")
      expect(result.success).toBe(true)
      expect(result.ast?.[0]).toMatchObject({
        type: "number",
        value: "n",
        style: "style{with}braces"
      })
    })

    it("parses styles that include quoted text with braces", () => {
      const result = parseIcu("{n, number, 'x{y}' z}")
      expect(result.success).toBe(true)
      expect(result.ast?.[0]).toMatchObject({
        type: "number",
        value: "n",
        style: "'x{y}' z"
      })
    })
  })

  describe("fuzz/regression: parser never throws or hangs", () => {
    it("never throws for adversarial inputs (deterministic)", () => {
      // Deterministic PRNG so failures are reproducible.
      let seed = 0x12345678
      function nextInt() {
        // LCG
        seed = (1103515245 * seed + 12345) & 0x7fffffff
        return seed
      }
      const alphabet =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789{}<>,:#' \n\t/-"

      for (let i = 0; i < 500; i++) {
        const len = 1 + (nextInt() % 200)
        let s = ""
        for (let j = 0; j < len; j++) {
          s += alphabet.charAt(nextInt() % alphabet.length)
        }
        expect(() => parseIcu(s, { requiresOtherClause: false })).not.toThrow()
      }
    })
  })

  describe("parseIcu error passthrough", () => {
    it("rethrows non-syntax errors", () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method -- safe: we reassign and restore the same method
      const original = IcuParser.prototype.parse
      try {
        IcuParser.prototype.parse = () => {
          throw new Error("boom")
        }
        expect(() => parseIcu("Hello {name}")).toThrow("boom")
      } finally {
        IcuParser.prototype.parse = original
      }
    })
  })
})
