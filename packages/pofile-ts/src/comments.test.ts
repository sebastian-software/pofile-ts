import { describe, it, expect } from "vitest"
import { splitMultilineComments } from "./comments"

describe("splitMultilineComments", () => {
  it("splits multiline comments into individual lines", () => {
    expect(splitMultilineComments(["Line1\nLine2", "Line3"])).toEqual(["Line1", "Line2", "Line3"])
  })

  it("trims whitespace from each line", () => {
    expect(splitMultilineComments(["  Line1\n  Line2  "])).toEqual(["Line1", "Line2"])
  })

  it("filters out empty lines", () => {
    expect(splitMultilineComments(["Line1\n\n\nLine2"])).toEqual(["Line1", "Line2"])
  })

  it("handles Windows line endings (CRLF)", () => {
    expect(splitMultilineComments(["First\r\nSecond"])).toEqual(["First", "Second"])
  })

  it("handles old Mac line endings (CR only)", () => {
    expect(splitMultilineComments(["First\rSecond"])).toEqual(["First", "Second"])
  })

  it("passes through single-line comments unchanged", () => {
    expect(splitMultilineComments(["Simple comment"])).toEqual(["Simple comment"])
  })

  it("handles empty array", () => {
    expect(splitMultilineComments([])).toEqual([])
  })

  it("handles array with empty strings", () => {
    expect(splitMultilineComments(["", "   ", "\n\n"])).toEqual([])
  })

  it("handles mixed content", () => {
    const input = ["First comment", "Multi\nLine\nComment", "", "Last one"]
    expect(splitMultilineComments(input)).toEqual([
      "First comment",
      "Multi",
      "Line",
      "Comment",
      "Last one"
    ])
  })

  it("preserves internal spaces in lines", () => {
    expect(splitMultilineComments(["Hello World\nFoo Bar"])).toEqual(["Hello World", "Foo Bar"])
  })

  it("handles real-world JSDoc-style comments", () => {
    const jsdoc = [
      "This is a component.\n" + "@param props - Component properties\n" + "@returns React element"
    ]
    expect(splitMultilineComments(jsdoc)).toEqual([
      "This is a component.",
      "@param props - Component properties",
      "@returns React element"
    ])
  })
})
