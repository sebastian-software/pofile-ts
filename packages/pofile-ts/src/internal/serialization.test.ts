import { describe, it, expect } from "vitest"
import { foldLine, formatKeyword, DEFAULT_SERIALIZE_OPTIONS } from "./serialization"

describe("foldLine", () => {
  it("returns unchanged for short strings", () => {
    expect(foldLine("short", 80)).toEqual(["short"])
    expect(foldLine("", 80)).toEqual([""])
  })

  it("folds at word boundary when possible", () => {
    const text = "Hello World this is a test"
    const result = foldLine(text, 15)
    expect(result).toEqual(["Hello World ", "this is a test"])
  })

  it("folds long string without spaces at maxLength", () => {
    const text = "abcdefghijklmnopqrstuvwxyz"
    const result = foldLine(text, 10)
    expect(result).toEqual(["abcdefghij", "klmnopqrst", "uvwxyz"])
  })

  it("avoids breaking escape sequences", () => {
    // No spaces, so it must break at maxLength
    // But it should avoid breaking right after a backslash
    const text = "abcdefghijk\\x"
    const result = foldLine(text, 12)
    // Should break before the backslash (at position 11), not after it
    expect(result[0]).toBe("abcdefghijk")
    expect(result[1]).toBe("\\x")
  })

  it("handles exact length match", () => {
    expect(foldLine("exactly10!", 10)).toEqual(["exactly10!"])
  })

  it("handles multiple folds", () => {
    const text = "one two three four five six seven eight"
    const result = foldLine(text, 12)
    expect(result.length).toBeGreaterThan(3)
    result.forEach((line) => {
      expect(line.length).toBeLessThanOrEqual(12)
    })
  })
})

describe("formatKeyword", () => {
  describe("simple strings", () => {
    it("formats simple msgid", () => {
      expect(formatKeyword("msgid", "Hello")).toEqual(['msgid "Hello"'])
    })

    it("formats simple msgstr", () => {
      expect(formatKeyword("msgstr", "Hallo")).toEqual(['msgstr "Hallo"'])
    })

    it("formats empty string", () => {
      expect(formatKeyword("msgid", "")).toEqual(['msgid ""'])
    })

    it("escapes special characters", () => {
      expect(formatKeyword("msgid", 'Say "Hi"')).toEqual(['msgid "Say \\"Hi\\""'])
    })
  })

  describe("plural index", () => {
    it("formats with plural index 0", () => {
      expect(formatKeyword("msgstr", "One item", 0)).toEqual(['msgstr[0] "One item"'])
    })

    it("formats with plural index 1", () => {
      expect(formatKeyword("msgstr", "Many items", 1)).toEqual(['msgstr[1] "Many items"'])
    })
  })

  describe("multiline strings", () => {
    it("formats multiline with compact format (default)", () => {
      const result = formatKeyword("msgid", "Line1\nLine2")
      expect(result).toEqual(['msgid "Line1\\n"', '"Line2"'])
    })

    it("formats multiline with traditional format", () => {
      const result = formatKeyword("msgid", "Line1\nLine2", undefined, {
        compactMultiline: false
      })
      expect(result).toEqual(['msgid ""', '"Line1\\n"', '"Line2"'])
    })

    it("uses traditional format when first line is empty", () => {
      const result = formatKeyword("msgid", "\nLine2")
      expect(result[0]).toBe('msgid ""')
    })
  })

  describe("line folding", () => {
    it("folds long lines at word boundaries", () => {
      const longText = "This is a very long text that should be folded"
      const result = formatKeyword("msgid", longText, undefined, { foldLength: 30 })
      expect(result.length).toBeGreaterThan(1)
    })

    it("disables folding when foldLength is 0", () => {
      const longText = "This is a very long text that would normally be folded"
      const result = formatKeyword("msgid", longText, undefined, { foldLength: 0 })
      expect(result).toEqual([`msgid "${longText}"`])
    })

    it("accounts for keyword length in first line", () => {
      const text = "A".repeat(70)
      const result = formatKeyword("msgid", text, undefined, { foldLength: 80 })
      // msgid "AAA..." = 7 + 70 + 2 = 79 chars, should fit in 80
      expect(result).toEqual([`msgid "${text}"`])
    })
  })

  describe("default options", () => {
    it("uses default foldLength of 80", () => {
      expect(DEFAULT_SERIALIZE_OPTIONS.foldLength).toBe(80)
    })

    it("uses compact multiline by default", () => {
      expect(DEFAULT_SERIALIZE_OPTIONS.compactMultiline).toBe(true)
    })
  })
})
