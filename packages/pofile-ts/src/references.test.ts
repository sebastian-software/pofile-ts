import { describe, it, expect } from "vitest"
import {
  parseReference,
  formatReference,
  parseReferences,
  formatReferences,
  createReference,
  normalizeFilePath
} from "./references"

describe("parseReference", () => {
  it("parses file with line number", () => {
    const result = parseReference("src/App.tsx:42")

    expect(result).toEqual({ file: "src/App.tsx", line: 42 })
  })

  it("parses file without line number", () => {
    const result = parseReference("src/App.tsx")

    expect(result).toEqual({ file: "src/App.tsx" })
  })

  it("handles file with multiple path segments", () => {
    const result = parseReference("src/components/ui/Button.tsx:10")

    expect(result).toEqual({ file: "src/components/ui/Button.tsx", line: 10 })
  })

  it("handles line number 1", () => {
    const result = parseReference("file.ts:1")

    expect(result).toEqual({ file: "file.ts", line: 1 })
  })

  it("trims whitespace", () => {
    const result = parseReference("  src/App.tsx:42  ")

    expect(result).toEqual({ file: "src/App.tsx", line: 42 })
  })

  it("throws on empty reference", () => {
    expect(() => parseReference("")).toThrow("Reference cannot be empty")
    expect(() => parseReference("   ")).toThrow("Reference cannot be empty")
  })

  it("treats :42 as filename (colon at start)", () => {
    // When colon is at position 0, treat entire string as filename
    const result = parseReference(":42")
    expect(result).toEqual({ file: ":42" })
  })

  it("handles file with colon in name but no line number", () => {
    // If the part after colon is not a valid number, treat as filename
    const result = parseReference("src/file:name.tsx")

    expect(result).toEqual({ file: "src/file:name.tsx" })
  })

  it("parses from right (last colon with valid number)", () => {
    const result = parseReference("src/file:name.tsx:42")

    expect(result).toEqual({ file: "src/file:name.tsx", line: 42 })
  })

  it("handles zero as non-line-number", () => {
    // Line 0 is not valid, treat entire string as file
    const result = parseReference("file.tsx:0")

    expect(result).toEqual({ file: "file.tsx:0" })
  })

  it("handles negative numbers as non-line-number", () => {
    const result = parseReference("file.tsx:-5")

    expect(result).toEqual({ file: "file.tsx:-5" })
  })

  it("handles decimal numbers as non-line-number", () => {
    const result = parseReference("file.tsx:1.5")

    expect(result).toEqual({ file: "file.tsx:1.5" })
  })

  it("normalizes Windows backslashes", () => {
    const result = parseReference("src\\components\\App.tsx:42")

    expect(result).toEqual({ file: "src/components/App.tsx", line: 42 })
  })
})

describe("formatReference", () => {
  it("formats reference with line number", () => {
    const result = formatReference({ file: "src/App.tsx", line: 42 })

    expect(result).toBe("src/App.tsx:42")
  })

  it("formats reference without line number", () => {
    const result = formatReference({ file: "src/App.tsx" })

    expect(result).toBe("src/App.tsx")
  })

  it("excludes line number when option is false", () => {
    const result = formatReference({ file: "src/App.tsx", line: 42 }, { includeLineNumbers: false })

    expect(result).toBe("src/App.tsx")
  })

  it("handles undefined line with includeLineNumbers true", () => {
    const result = formatReference({ file: "src/App.tsx" }, { includeLineNumbers: true })

    expect(result).toBe("src/App.tsx")
  })

  it("normalizes backslashes in output", () => {
    const result = formatReference({ file: "src\\App.tsx", line: 42 })

    expect(result).toBe("src/App.tsx:42")
  })
})

describe("parseReferences", () => {
  it("parses multiple space-separated references", () => {
    const result = parseReferences("src/App.tsx:42 src/utils.ts:10")

    expect(result).toEqual([
      { file: "src/App.tsx", line: 42 },
      { file: "src/utils.ts", line: 10 }
    ])
  })

  it("handles single reference", () => {
    const result = parseReferences("src/App.tsx:42")

    expect(result).toEqual([{ file: "src/App.tsx", line: 42 }])
  })

  it("handles empty string", () => {
    const result = parseReferences("")

    expect(result).toEqual([])
  })

  it("handles whitespace-only string", () => {
    const result = parseReferences("   ")

    expect(result).toEqual([])
  })

  it("handles multiple whitespace between references", () => {
    const result = parseReferences("src/a.ts:1    src/b.ts:2")

    expect(result).toEqual([
      { file: "src/a.ts", line: 1 },
      { file: "src/b.ts", line: 2 }
    ])
  })
})

describe("formatReferences", () => {
  it("formats multiple references", () => {
    const result = formatReferences([
      { file: "src/App.tsx", line: 42 },
      { file: "src/utils.ts", line: 10 }
    ])

    expect(result).toBe("src/App.tsx:42 src/utils.ts:10")
  })

  it("formats empty array", () => {
    const result = formatReferences([])

    expect(result).toBe("")
  })

  it("respects includeLineNumbers option", () => {
    const result = formatReferences(
      [
        { file: "src/App.tsx", line: 42 },
        { file: "src/utils.ts", line: 10 }
      ],
      { includeLineNumbers: false }
    )

    expect(result).toBe("src/App.tsx src/utils.ts")
  })
})

describe("createReference", () => {
  it("creates reference with file and line", () => {
    const result = createReference("src/App.tsx", 42)

    expect(result).toEqual({ file: "src/App.tsx", line: 42 })
  })

  it("creates reference with file only", () => {
    const result = createReference("src/App.tsx")

    expect(result).toEqual({ file: "src/App.tsx", line: undefined })
  })

  it("normalizes backslashes", () => {
    const result = createReference("src\\components\\App.tsx", 42)

    expect(result).toEqual({ file: "src/components/App.tsx", line: 42 })
  })

  it("throws on absolute Unix path", () => {
    expect(() => createReference("/usr/src/App.tsx", 42)).toThrow(
      "Reference paths must be relative"
    )
  })

  it("throws on absolute Windows path", () => {
    expect(() => createReference("C:\\src\\App.tsx", 42)).toThrow(
      "Reference paths must be relative"
    )
    expect(() => createReference("D:/src/App.tsx", 42)).toThrow("Reference paths must be relative")
  })

  it("throws on invalid line number", () => {
    expect(() => createReference("src/App.tsx", 0)).toThrow(
      "Line number must be a positive integer"
    )
    expect(() => createReference("src/App.tsx", -1)).toThrow(
      "Line number must be a positive integer"
    )
    expect(() => createReference("src/App.tsx", 1.5)).toThrow(
      "Line number must be a positive integer"
    )
  })
})

describe("normalizeFilePath", () => {
  it("keeps forward slashes", () => {
    const result = normalizeFilePath("src/components/App.tsx")

    expect(result).toBe("src/components/App.tsx")
  })

  it("handles mixed slashes", () => {
    const result = normalizeFilePath("src/components\\App.tsx")

    expect(result).toBe("src/components/App.tsx")
  })

  it("converts all backslashes", () => {
    const result = normalizeFilePath("src\\components\\nested\\App.tsx")

    expect(result).toBe("src/components/nested/App.tsx")
  })
})
