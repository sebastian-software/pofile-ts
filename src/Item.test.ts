import { describe, it, expect } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"
import { Item } from "./Item"
import { PO } from "./PO"

const FIXTURES_DIR = path.join(__dirname, "fixtures")

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8")
}

function assertHasLine(str: string, line: string, doNotTrim?: boolean): void {
  const lines = str.split("\n")
  const found = lines.some((l) => (doNotTrim ? l : l.trim()) === line)
  expect(found, `Could not find line: ${line}`).toBe(true)
}

function assertHasContiguousLines(str: string, assertedLines: string[]): void {
  const assertedLinesJoined = assertedLines.join("\n")
  const trimmedStr = str
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
  const found = trimmedStr.includes(assertedLinesJoined)
  expect(found, `Could not find lines:\n${assertedLinesJoined}`).toBe(true)
}

function assertDoesntHaveLine(str: string, line: string): void {
  const lines = str.split("\n")
  const found = lines.some((l) => l.trim() === line)
  expect(found, `Shouldn't have line: ${line}`).toBe(false)
}

describe("Item", () => {
  describe("toString", () => {
    describe("flags", () => {
      it("writes flags", () => {
        const po = PO.parse(readFixture("fuzzy.po"))
        const str = po.toString()
        assertHasLine(str, "#, fuzzy")
      })

      it("writes empty comment without unnecessary space", () => {
        const po = PO.parse(readFixture("fuzzy.po"))
        const str = po.toString()
        assertHasLine(str, "#", true)
      })

      it("writes flags only when true", () => {
        const po = PO.parse(readFixture("fuzzy.po"))
        const item = po.items[0]
        if (item) {
          item.flags.fuzzy = false
        }
        const str = po.toString()
        assertDoesntHaveLine(str, "#, fuzzy")
      })
    })

    describe("msgid/msgstr", () => {
      it("writes msgid", () => {
        const po = PO.parse(readFixture("fuzzy.po"))
        const str = po.toString()
        assertHasLine(str, 'msgid "Sources"')
      })

      it("writes msgstr", () => {
        const po = PO.parse(readFixture("fuzzy.po"))
        const str = po.toString()
        assertHasLine(str, 'msgstr "Source"')
      })
    })

    describe("comments", () => {
      it("writes translator comment", () => {
        const po = PO.parse(readFixture("comment.po"))
        const str = po.toString()
        assertHasLine(str, "# Translator comment")
      })

      it("writes extracted comment", () => {
        const po = PO.parse(readFixture("comment.po"))
        const str = po.toString()
        assertHasLine(str, "#. extracted from test")
        assertHasLine(str, "#. Extracted comment")
      })
    })

    describe("obsolete items", () => {
      it("writes obsolete items", () => {
        const po = PO.parse(readFixture("commented.po"))
        const str = po.toString()
        assertHasLine(str, '#~ msgid "Add order"')
        assertHasLine(str, '#~ msgstr "Order toevoegen"')
      })

      it("writes obsolete items with comment", () => {
        const po = PO.parse(readFixture("commented.po"))
        const str = po.toString()
        assertHasLine(str, "# commented obsolete item")
        assertHasLine(str, "#, fuzzy")
        assertHasLine(str, '#~ msgid "Commented item"')
        assertHasLine(str, '#~ msgstr "not sure"')
      })
    })

    describe("msgctxt", () => {
      it("writes context field", () => {
        const po = PO.parse(readFixture("big.po"))
        const str = po.toString()
        assertHasLine(str, 'msgctxt "folder action"')
      })

      it("ignores omitted context field", () => {
        const po = new PO()
        const item = new Item()
        po.items.push(item)
        expect(po.toString().includes("msgctxt")).toBe(false)
      })

      it("writes empty context field", () => {
        const po = new PO()
        const item = new Item()
        item.msgctxt = ""
        po.items.push(item)
        expect(po.toString().includes("msgctxt")).toBe(true)
      })
    })

    describe("C-string escapes", () => {
      it('escapes "', () => {
        const item = new Item()
        item.msgid = '" should be written escaped'
        assertHasLine(item.toString(), 'msgid "\\" should be written escaped"')
      })

      it("escapes \\", () => {
        const item = new Item()
        item.msgid = "\\ should be written escaped"
        assertHasLine(item.toString(), 'msgid "\\\\ should be written escaped"')
      })

      it("escapes \\n", () => {
        const item = new Item()
        item.msgid = "\n should be written escaped"
        assertHasLine(item.toString(), 'msgid ""')
        assertHasLine(item.toString(), '"\\n"')
        assertHasLine(item.toString(), '" should be written escaped"')
      })

      it("writes identical file after parsing", () => {
        const input = readFixture("c-strings.po")
        const po = PO.parse(input)
        const str = po.toString()
        expect(str).toBe(input)
      })
    })

    describe("edge cases", () => {
      it("escapes all control characters", () => {
        const item = new Item()
        item.msgid = "\x07\b\t\v\f\r"
        const str = item.toString()
        assertHasLine(str, 'msgid "\\a\\b\\t\\v\\f\\r"')
      })

      it("handles null byte by keeping it as-is", () => {
        const item = new Item()
        item.msgid = "before\x00after"
        const str = item.toString()
        expect(str).toContain("before\x00after")
      })

      it("escapes backslash before quote", () => {
        const item = new Item()
        item.msgid = 'test\\"-end'
        const str = item.toString()
        assertHasLine(str, 'msgid "test\\\\\\"-end"')
      })

      it("handles multiple newlines", () => {
        const item = new Item()
        item.msgid = "line1\nline2\nline3"
        const str = item.toString()
        assertHasContiguousLines(str, ['msgid ""', '"line1\\n"', '"line2\\n"', '"line3"'])
      })

      it("handles string ending with newline", () => {
        const item = new Item()
        item.msgid = "ends with newline\n"
        const str = item.toString()
        assertHasContiguousLines(str, ['msgid ""', '"ends with newline\\n"', '""'])
      })

      it("handles empty string", () => {
        const item = new Item()
        item.msgid = ""
        const str = item.toString()
        assertHasLine(str, 'msgid ""')
      })

      it("handles string with only newlines", () => {
        const item = new Item()
        item.msgid = "\n\n"
        const str = item.toString()
        assertHasContiguousLines(str, ['msgid ""', '"\\n"', '"\\n"', '""'])
      })

      it("handles tabs in strings", () => {
        const item = new Item()
        item.msgid = "col1\tcol2\tcol3"
        const str = item.toString()
        assertHasLine(str, 'msgid "col1\\tcol2\\tcol3"')
      })

      it("handles mixed escapes", () => {
        const item = new Item()
        item.msgid = 'quote: " backslash: \\ tab: \t newline:\n'
        const str = item.toString()
        assertHasContiguousLines(str, [
          'msgid ""',
          '"quote: \\" backslash: \\\\ tab: \\t newline:\\n"',
          '""'
        ])
      })
    })

    describe("plurals", () => {
      describe("nplurals=2", () => {
        it("writes 2 msgstrs when formatted correctly with translation", () => {
          const po = PO.parse(readFixture("plurals/nplurals-2.po"))
          const str = po.toString()
          assertHasContiguousLines(str, [
            'msgid_plural "{{$count}} things"',
            'msgstr[0] "1 thing"',
            'msgstr[1] "{{$count}} things"'
          ])
        })

        it("writes 2 msgstrs when formatted correctly with no translation", () => {
          const po = PO.parse(readFixture("plurals/nplurals-2.po"))
          const str = po.toString()
          assertHasContiguousLines(str, [
            'msgid_plural "{{$count}} other things"',
            'msgstr[0] ""',
            'msgstr[1] ""'
          ])
        })
      })

      describe("nplurals=3", () => {
        it("writes 3 msgstrs when formatted correctly with translation", () => {
          const po = PO.parse(readFixture("plurals/nplurals-3.po"))
          const str = po.toString()
          assertHasContiguousLines(str, [
            'msgid_plural "{{$count}} things"',
            'msgstr[0] "1 thing"',
            'msgstr[1] "{{$count}} things"',
            'msgstr[2] "{{$count}} things"'
          ])
        })

        it("writes 3 msgstrs when formatted correctly with no translation", () => {
          const po = PO.parse(readFixture("plurals/nplurals-3.po"))
          const str = po.toString()
          assertHasContiguousLines(str, [
            'msgid_plural "{{$count}} other things"',
            'msgstr[0] ""',
            'msgstr[1] ""',
            'msgstr[2] ""'
          ])
        })
      })

      describe("nplurals=6", () => {
        it("writes 6 msgstrs when formatted correctly with translation", () => {
          const po = PO.parse(readFixture("plurals/nplurals-6.po"))
          const str = po.toString()
          assertHasContiguousLines(str, [
            'msgid_plural "{{$count}} things"',
            'msgstr[0] "1 thing"',
            'msgstr[1] "{{$count}} things"',
            'msgstr[2] "{{$count}} things"',
            'msgstr[3] "{{$count}} things"',
            'msgstr[4] "{{$count}} things"',
            'msgstr[5] "{{$count}} things"'
          ])
        })
      })
    })
  })

  describe("roundtrip", () => {
    it("roundtrips simple strings", () => {
      const original = new PO()
      const item = new Item()
      item.msgid = "Hello World"
      item.msgstr = ["Hallo Welt"]
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.msgid).toBe("Hello World")
      expect(parsed.items[0]?.msgstr[0]).toBe("Hallo Welt")
    })

    it("roundtrips strings with escapes", () => {
      const original = new PO()
      const item = new Item()
      item.msgid = 'Quote: " Backslash: \\ Tab: \t'
      item.msgstr = ["Result"]
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.msgid).toBe('Quote: " Backslash: \\ Tab: \t')
    })

    it("roundtrips multi-line strings", () => {
      const original = new PO()
      const item = new Item()
      item.msgid = "Line 1\nLine 2\nLine 3"
      item.msgstr = ["Zeile 1\nZeile 2\nZeile 3"]
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.msgid).toBe("Line 1\nLine 2\nLine 3")
      expect(parsed.items[0]?.msgstr[0]).toBe("Zeile 1\nZeile 2\nZeile 3")
    })

    it("roundtrips all control characters", () => {
      const original = new PO()
      const item = new Item()
      item.msgid = "\x07\b\t\v\f\r"
      item.msgstr = ["control"]
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.msgid).toBe("\x07\b\t\v\f\r")
    })

    it("roundtrips plural forms", () => {
      const original = new PO()
      original.headers["Plural-Forms"] = "nplurals=2; plural=(n != 1);"
      const item = new Item()
      item.msgid = "one item"
      item.msgid_plural = "many items"
      item.msgstr = ["ein Element", "viele Elemente"]
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.msgid).toBe("one item")
      expect(parsed.items[0]?.msgid_plural).toBe("many items")
      expect(parsed.items[0]?.msgstr).toEqual(["ein Element", "viele Elemente"])
    })

    it("roundtrips context", () => {
      const original = new PO()
      const item = new Item()
      item.msgctxt = "menu"
      item.msgid = "File"
      item.msgstr = ["Datei"]
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.msgctxt).toBe("menu")
      expect(parsed.items[0]?.msgid).toBe("File")
    })

    it("roundtrips flags", () => {
      const original = new PO()
      const item = new Item()
      item.msgid = "test"
      item.msgstr = [""]
      item.flags = { fuzzy: true, "no-wrap": true }
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.flags.fuzzy).toBe(true)
      expect(parsed.items[0]?.flags["no-wrap"]).toBe(true)
    })

    it("roundtrips comments", () => {
      const original = new PO()
      const item = new Item()
      item.msgid = "test"
      item.msgstr = [""]
      item.comments = ["translator note"]
      item.extractedComments = ["extracted note"]
      item.references = ["file.ts:42"]
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.comments).toEqual(["translator note"])
      expect(parsed.items[0]?.extractedComments).toEqual(["extracted note"])
      expect(parsed.items[0]?.references).toEqual(["file.ts:42"])
    })

    it("roundtrips obsolete items", () => {
      const original = new PO()
      const item = new Item()
      item.msgid = "old text"
      item.msgstr = ["alter Text"]
      item.obsolete = true
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.obsolete).toBe(true)
      expect(parsed.items[0]?.msgid).toBe("old text")
    })
  })
})
