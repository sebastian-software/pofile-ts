import { describe, it, expect } from "vitest"
import { parsePo, createPoFile } from "./parse"

describe("parse", () => {
  describe("createPoFile", () => {
    it("creates an empty PO file with default structure", () => {
      const po = createPoFile()

      expect(po.comments).toEqual([])
      expect(po.extractedComments).toEqual([])
      expect(po.items).toEqual([])
      expect(po.headerOrder).toEqual([])
      expect(po.headers).toBeDefined()
    })

    it("has default headers with empty values", () => {
      const po = createPoFile()

      expect(po.headers["Project-Id-Version"]).toBe("")
      expect(po.headers["Report-Msgid-Bugs-To"]).toBe("")
      expect(po.headers["POT-Creation-Date"]).toBe("")
      expect(po.headers["PO-Revision-Date"]).toBe("")
      expect(po.headers["Last-Translator"]).toBe("")
      expect(po.headers.Language).toBe("")
      expect(po.headers["Language-Team"]).toBe("")
      expect(po.headers["Content-Type"]).toBe("")
      expect(po.headers["Content-Transfer-Encoding"]).toBe("")
      expect(po.headers["Plural-Forms"]).toBe("")
    })
  })

  describe("parsePo", () => {
    it("normalizes CRLF line endings to LF", () => {
      const input = 'msgid "test"\r\nmsgstr "Test"'
      const po = parsePo(input)

      expect(po.items.length).toBe(1)
      expect(po.items[0]?.msgid).toBe("test")
    })

    it("handles multiple CRLF occurrences", () => {
      const input = 'msgid "line1"\r\nmsgstr "Line1"\r\n\r\nmsgid "line2"\r\nmsgstr "Line2"'
      const po = parsePo(input)

      expect(po.items.length).toBe(2)
    })

    it("parses headers before items", () => {
      const input = `msgid ""
msgstr ""
"Language: de\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"

msgid "Hello"
msgstr "Hallo"`

      const po = parsePo(input)

      expect(po.headers.Language).toBe("de")
      expect(po.headers["Plural-Forms"]).toBe("nplurals=2; plural=(n != 1);")
      expect(po.items.length).toBe(1)
    })

    it("extracts nplurals from Plural-Forms header and applies to items", () => {
      const input = `msgid ""
msgstr ""
"Plural-Forms: nplurals=3; plural=(n==1 ? 0 : 2);\\n"

msgid "item"
msgstr "Element"`

      const po = parsePo(input)

      expect(po.items[0]?.nplurals).toBe(3)
    })

    it("uses default nplurals when Plural-Forms is missing", () => {
      const input = `msgid "item"
msgstr "Element"`

      const po = parsePo(input)

      // Default is 2 based on createItem default
      expect(po.items[0]?.nplurals).toBe(2)
    })

    it("parses file-level comments", () => {
      const input = `# Translator comment
# Another comment
msgid ""
msgstr ""

msgid "test"
msgstr "Test"`

      const po = parsePo(input)

      expect(po.comments).toContain("Translator comment")
      expect(po.comments).toContain("Another comment")
    })

    it("parses file-level extracted comments", () => {
      const input = `#. Extracted from source
msgid ""
msgstr ""

msgid "test"
msgstr "Test"`

      const po = parsePo(input)

      expect(po.extractedComments).toContain("Extracted from source")
    })

    it("parses message context (msgctxt)", () => {
      const input = `msgctxt "menu"
msgid "File"
msgstr "Datei"`

      const po = parsePo(input)

      expect(po.items[0]?.msgctxt).toBe("menu")
      expect(po.items[0]?.msgid).toBe("File")
    })

    it("parses plural forms", () => {
      const input = `msgid ""
msgstr ""
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"

msgid "item"
msgid_plural "items"
msgstr[0] "Element"
msgstr[1] "Elemente"`

      const po = parsePo(input)

      expect(po.items[0]?.msgid).toBe("item")
      expect(po.items[0]?.msgid_plural).toBe("items")
      expect(po.items[0]?.msgstr).toEqual(["Element", "Elemente"])
    })

    it("parses obsolete entries", () => {
      const input = `#~ msgid "old"
#~ msgstr "Alt"`

      const po = parsePo(input)

      expect(po.items[0]?.obsolete).toBe(true)
      expect(po.items[0]?.msgid).toBe("old")
    })

    it("parses flags", () => {
      const input = `#, fuzzy, no-wrap
msgid "test"
msgstr "Test"`

      const po = parsePo(input)

      expect(po.items[0]?.flags.fuzzy).toBe(true)
      expect(po.items[0]?.flags["no-wrap"]).toBe(true)
    })

    it("parses references", () => {
      const input = `#: src/app.ts:42
#: src/utils.ts:10
msgid "test"
msgstr "Test"`

      const po = parsePo(input)

      expect(po.items[0]?.references).toContain("src/app.ts:42")
      expect(po.items[0]?.references).toContain("src/utils.ts:10")
    })

    it("parses multiline strings", () => {
      // Multiline items need to be after a header block or separated properly
      const input = `msgid ""
msgstr ""
"Language: en\\n"

msgid ""
"Hello "
"World"
msgstr ""
"Hallo "
"Welt"`

      const po = parsePo(input)

      expect(po.items[0]?.msgid).toBe("Hello World")
      expect(po.items[0]?.msgstr[0]).toBe("Hallo Welt")
    })

    it("preserves header order", () => {
      const input = `msgid ""
msgstr ""
"Content-Type: text/plain\\n"
"Language: de\\n"
"Project-Id-Version: test\\n"`

      const po = parsePo(input)

      expect(po.headerOrder).toEqual(["Content-Type", "Language", "Project-Id-Version"])
    })
  })
})
