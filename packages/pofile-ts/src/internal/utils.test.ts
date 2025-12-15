import { describe, it, expect } from "vitest"
import { escapeString, unescapeString, extractString } from "./utils"

describe("escapeString", () => {
  it("returns unchanged string when no escaping needed", () => {
    expect(escapeString("Hello World")).toBe("Hello World")
    expect(escapeString("")).toBe("")
    expect(escapeString("Simple text 123")).toBe("Simple text 123")
  })

  it("escapes double quotes", () => {
    expect(escapeString('Say "Hello"')).toBe('Say \\"Hello\\"')
  })

  it("escapes backslashes", () => {
    expect(escapeString("path\\to\\file")).toBe("path\\\\to\\\\file")
  })

  it("escapes tab characters", () => {
    expect(escapeString("col1\tcol2")).toBe("col1\\tcol2")
  })

  it("escapes carriage return", () => {
    expect(escapeString("line\r")).toBe("line\\r")
  })

  it("escapes bell character", () => {
    expect(escapeString("alert\x07")).toBe("alert\\a")
  })

  it("escapes backspace", () => {
    expect(escapeString("back\bspace")).toBe("back\\bspace")
  })

  it("escapes vertical tab", () => {
    expect(escapeString("vertical\vtab")).toBe("vertical\\vtab")
  })

  it("escapes form feed", () => {
    expect(escapeString("page\fbreak")).toBe("page\\fbreak")
  })

  it("handles multiple escapes in one string", () => {
    expect(escapeString('He said:\t"Hello\\World"')).toBe('He said:\\t\\"Hello\\\\World\\"')
  })
})

describe("unescapeString", () => {
  it("returns unchanged string when no escaping present", () => {
    expect(unescapeString("Hello World")).toBe("Hello World")
    expect(unescapeString("")).toBe("")
  })

  it("unescapes double quotes", () => {
    expect(unescapeString('Say \\"Hello\\"')).toBe('Say "Hello"')
  })

  it("unescapes backslashes", () => {
    expect(unescapeString("path\\\\to\\\\file")).toBe("path\\to\\file")
  })

  it("unescapes newlines", () => {
    expect(unescapeString("line1\\nline2")).toBe("line1\nline2")
  })

  it("unescapes tabs", () => {
    expect(unescapeString("col1\\tcol2")).toBe("col1\tcol2")
  })

  it("unescapes carriage return", () => {
    expect(unescapeString("line\\r")).toBe("line\r")
  })

  it("unescapes bell", () => {
    expect(unescapeString("alert\\a")).toBe("alert\x07")
  })

  it("unescapes backspace", () => {
    expect(unescapeString("back\\bspace")).toBe("back\bspace")
  })

  it("unescapes vertical tab", () => {
    expect(unescapeString("vertical\\vtab")).toBe("vertical\vtab")
  })

  it("unescapes form feed", () => {
    expect(unescapeString("page\\fbreak")).toBe("page\fbreak")
  })

  it("unescapes octal sequences", () => {
    expect(unescapeString("\\0")).toBe("\0")
    expect(unescapeString("\\101")).toBe("A") // 101 octal = 65 decimal = 'A'
    expect(unescapeString("\\77")).toBe("?") // 77 octal = 63 decimal = '?'
  })

  it("unescapes hex sequences", () => {
    expect(unescapeString("\\x41")).toBe("A") // 0x41 = 65 = 'A'
    expect(unescapeString("\\x0a")).toBe("\n") // 0x0a = 10 = newline
  })

  it("handles multiple escapes", () => {
    expect(unescapeString('He said:\\t\\"Hello\\\\World\\"')).toBe('He said:\t"Hello\\World"')
  })

  it("is inverse of escapeString for common cases", () => {
    const original = 'Text with "quotes" and\ttabs'
    expect(unescapeString(escapeString(original))).toBe(original)
  })
})

describe("extractString", () => {
  it("extracts simple quoted string", () => {
    expect(extractString('"Hello World"')).toBe("Hello World")
  })

  it("extracts string with keyword prefix", () => {
    expect(extractString('msgid "Hello"')).toBe("Hello")
    expect(extractString('msgstr "Hallo"')).toBe("Hallo")
  })

  it("extracts string with plural index", () => {
    expect(extractString('msgstr[0] "One item"')).toBe("One item")
    expect(extractString('msgstr[1] "Many items"')).toBe("Many items")
  })

  it("unescapes the extracted string", () => {
    expect(extractString('"Line1\\nLine2"')).toBe("Line1\nLine2")
    expect(extractString('msgid "Say \\"Hi\\""')).toBe('Say "Hi"')
  })

  it("returns empty string for missing quotes", () => {
    expect(extractString("no quotes here")).toBe("")
    expect(extractString("")).toBe("")
  })

  it("returns empty string for single quote", () => {
    expect(extractString('"only opening')).toBe("")
    expect(extractString('only closing"')).toBe("")
  })

  it("handles empty quoted string", () => {
    expect(extractString('msgid ""')).toBe("")
  })

  it("handles whitespace around quotes", () => {
    expect(extractString('  "  spaced  "  ')).toBe("  spaced  ")
  })
})
