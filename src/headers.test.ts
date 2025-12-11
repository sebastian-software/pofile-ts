import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createDefaultHeaders, formatPoDate } from "./headers"

describe("formatPoDate", () => {
  it("formats date in PO format", () => {
    // Create a date with known timezone offset
    const date = new Date("2025-12-11T14:30:00Z")

    const result = formatPoDate(date)

    // Should contain the date parts (exact time depends on local timezone)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}[+-]\d{4}$/)
  })

  it("handles positive timezone offset", () => {
    // Mock date with getTimezoneOffset returning -60 (UTC+1)
    const date = new Date("2025-12-11T14:30:00")
    vi.spyOn(date, "getTimezoneOffset").mockReturnValue(-60)

    const result = formatPoDate(date)

    expect(result).toContain("+0100")
  })

  it("handles negative timezone offset", () => {
    const date = new Date("2025-12-11T14:30:00")
    vi.spyOn(date, "getTimezoneOffset").mockReturnValue(300) // UTC-5

    const result = formatPoDate(date)

    expect(result).toContain("-0500")
  })

  it("handles UTC (zero offset)", () => {
    const date = new Date("2025-12-11T14:30:00")
    vi.spyOn(date, "getTimezoneOffset").mockReturnValue(0)

    const result = formatPoDate(date)

    expect(result).toContain("+0000")
  })
})

describe("createDefaultHeaders", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-12-11T14:30:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("creates headers with defaults", () => {
    const headers = createDefaultHeaders()

    expect(headers["MIME-Version"]).toBe("1.0")
    expect(headers["Content-Type"]).toBe("text/plain; charset=utf-8")
    expect(headers["Content-Transfer-Encoding"]).toBe("8bit")
    expect(headers["X-Generator"]).toBe("pofile-ts")
    expect(headers["Project-Id-Version"]).toBe("")
    expect(headers.Language).toBe("")
  })

  it("sets language", () => {
    const headers = createDefaultHeaders({ language: "de" })

    expect(headers.Language).toBe("de")
  })

  it("sets custom generator", () => {
    const headers = createDefaultHeaders({ generator: "my-tool" })

    expect(headers["X-Generator"]).toBe("my-tool")
  })

  it("sets project info", () => {
    const headers = createDefaultHeaders({
      projectIdVersion: "MyProject 1.0",
      reportBugsTo: "bugs@example.com",
      lastTranslator: "John Doe <john@example.com>",
      languageTeam: "German <de@example.com>"
    })

    expect(headers["Project-Id-Version"]).toBe("MyProject 1.0")
    expect(headers["Report-Msgid-Bugs-To"]).toBe("bugs@example.com")
    expect(headers["Last-Translator"]).toBe("John Doe <john@example.com>")
    expect(headers["Language-Team"]).toBe("German <de@example.com>")
  })

  it("sets plural forms when provided", () => {
    const headers = createDefaultHeaders({
      pluralForms: "nplurals=2; plural=(n != 1);"
    })

    expect(headers["Plural-Forms"]).toBe("nplurals=2; plural=(n != 1);")
  })

  it("does not include Plural-Forms when not provided", () => {
    const headers = createDefaultHeaders()

    expect(headers["Plural-Forms"]).toBeUndefined()
  })

  it("allows custom headers", () => {
    const headers = createDefaultHeaders({
      custom: {
        "X-Custom-Header": "custom-value",
        "X-Another": "another-value"
      }
    })

    expect(headers["X-Custom-Header"]).toBe("custom-value")
    expect(headers["X-Another"]).toBe("another-value")
  })

  it("custom headers can override defaults", () => {
    const headers = createDefaultHeaders({
      generator: "original",
      custom: {
        "X-Generator": "overridden"
      }
    })

    expect(headers["X-Generator"]).toBe("overridden")
  })

  it("sets POT-Creation-Date and PO-Revision-Date", () => {
    const headers = createDefaultHeaders()

    expect(headers["POT-Creation-Date"]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}[+-]\d{4}$/)
    expect(headers["PO-Revision-Date"]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}[+-]\d{4}$/)
  })
})
