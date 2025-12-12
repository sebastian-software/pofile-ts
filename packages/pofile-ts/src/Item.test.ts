import { describe, it, expect } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"
import { createItem, stringifyItem } from "./Item"
import { parsePo, stringifyPo, createPoFile } from "./PO"

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

describe("stringifyItem", () => {
  describe("flags", () => {
    it("writes flags", () => {
      const po = parsePo(readFixture("fuzzy.po"))
      const str = stringifyPo(po)
      assertHasLine(str, "#, fuzzy")
    })

    it("writes empty comment without unnecessary space", () => {
      const po = parsePo(readFixture("fuzzy.po"))
      const str = stringifyPo(po)
      assertHasLine(str, "#", true)
    })

    it("writes flags only when true", () => {
      const po = parsePo(readFixture("fuzzy.po"))
      const item = po.items[0]
      if (item) {
        item.flags.fuzzy = false
      }
      const str = stringifyPo(po)
      assertDoesntHaveLine(str, "#, fuzzy")
    })
  })

  describe("msgid/msgstr", () => {
    it("writes msgid", () => {
      const po = parsePo(readFixture("fuzzy.po"))
      const str = stringifyPo(po)
      assertHasLine(str, 'msgid "Sources"')
    })

    it("writes msgstr", () => {
      const po = parsePo(readFixture("fuzzy.po"))
      const str = stringifyPo(po)
      assertHasLine(str, 'msgstr "Source"')
    })
  })

  describe("comments", () => {
    it("writes translator comment", () => {
      const po = parsePo(readFixture("comment.po"))
      const str = stringifyPo(po)
      assertHasLine(str, "# Translator comment")
    })

    it("writes extracted comment", () => {
      const po = parsePo(readFixture("comment.po"))
      const str = stringifyPo(po)
      assertHasLine(str, "#. extracted from test")
      assertHasLine(str, "#. Extracted comment")
    })
  })

  describe("obsolete items", () => {
    it("writes obsolete items", () => {
      const po = parsePo(readFixture("commented.po"))
      const str = stringifyPo(po)
      assertHasLine(str, '#~ msgid "Add order"')
      assertHasLine(str, '#~ msgstr "Order toevoegen"')
    })

    it("writes obsolete items with comment", () => {
      const po = parsePo(readFixture("commented.po"))
      const str = stringifyPo(po)
      assertHasLine(str, "# commented obsolete item")
      assertHasLine(str, "#, fuzzy")
      assertHasLine(str, '#~ msgid "Commented item"')
      assertHasLine(str, '#~ msgstr "not sure"')
    })
  })

  describe("msgctxt", () => {
    it("writes context field", () => {
      const po = parsePo(readFixture("big.po"))
      const str = stringifyPo(po)
      assertHasLine(str, 'msgctxt "folder action"')
    })

    it("ignores omitted context field", () => {
      const po = createPoFile()
      const item = createItem()
      po.items.push(item)
      expect(stringifyPo(po).includes("msgctxt")).toBe(false)
    })

    it("writes empty context field", () => {
      const po = createPoFile()
      const item = createItem()
      item.msgctxt = ""
      po.items.push(item)
      expect(stringifyPo(po).includes("msgctxt")).toBe(true)
    })
  })

  describe("C-string escapes", () => {
    it('escapes "', () => {
      const item = createItem()
      item.msgid = '" should be written escaped'
      assertHasLine(stringifyItem(item), 'msgid "\\" should be written escaped"')
    })

    it("escapes \\", () => {
      const item = createItem()
      item.msgid = "\\ should be written escaped"
      assertHasLine(stringifyItem(item), 'msgid "\\\\ should be written escaped"')
    })

    it("escapes \\n", () => {
      const item = createItem()
      // String starting with \n - first part is empty, so uses empty first line
      item.msgid = "\n should be written escaped"
      assertHasLine(stringifyItem(item), 'msgid ""')
      assertHasLine(stringifyItem(item), '"\\n"')
      assertHasLine(stringifyItem(item), '" should be written escaped"')
    })

    it("roundtrips c-strings file correctly", () => {
      // Note: Output format may differ from input (compact vs traditional),
      // but the data should roundtrip correctly
      const input = readFixture("c-strings.po")
      const po = parsePo(input)
      const str = stringifyPo(po)
      const reparsed = parsePo(str)

      expect(reparsed.items.length).toBe(po.items.length)
      for (let i = 0; i < po.items.length; i++) {
        expect(reparsed.items[i]?.msgid).toBe(po.items[i]?.msgid)
        expect(reparsed.items[i]?.msgstr).toEqual(po.items[i]?.msgstr)
      }
    })

    it("produces traditional format with compactMultiline: false", () => {
      const input = readFixture("c-strings.po")
      const po = parsePo(input)
      const str = stringifyPo(po, { compactMultiline: false, foldLength: 0 })
      // Traditional format has empty first line for multiline strings
      expect(str).toContain('msgid ""\n"%1$s\\n"')
    })
  })

  describe("edge cases", () => {
    it("escapes all control characters", () => {
      const item = createItem()
      item.msgid = "\x07\b\t\v\f\r"
      const str = stringifyItem(item)
      assertHasLine(str, 'msgid "\\a\\b\\t\\v\\f\\r"')
    })

    it("handles null byte by keeping it as-is", () => {
      const item = createItem()
      item.msgid = "before\x00after"
      const str = stringifyItem(item)
      expect(str).toContain("before\x00after")
    })

    it("escapes backslash before quote", () => {
      const item = createItem()
      item.msgid = 'test\\"-end'
      const str = stringifyItem(item)
      assertHasLine(str, 'msgid "test\\\\\\"-end"')
    })

    it("handles multiple newlines", () => {
      const item = createItem()
      item.msgid = "line1\nline2\nline3"
      const str = stringifyItem(item)
      // Compact format: first line has content
      assertHasContiguousLines(str, ['msgid "line1\\n"', '"line2\\n"', '"line3"'])
    })

    it("handles string ending with newline", () => {
      const item = createItem()
      item.msgid = "ends with newline\n"
      const str = stringifyItem(item)
      // Compact format: first line has content
      assertHasContiguousLines(str, ['msgid "ends with newline\\n"', '""'])
    })

    it("handles empty string", () => {
      const item = createItem()
      item.msgid = ""
      const str = stringifyItem(item)
      assertHasLine(str, 'msgid ""')
    })

    it("handles string with only newlines", () => {
      const item = createItem()
      // String starting with \n - first part is empty, so uses empty first line
      item.msgid = "\n\n"
      const str = stringifyItem(item)
      assertHasContiguousLines(str, ['msgid ""', '"\\n"', '"\\n"', '""'])
    })

    it("handles tabs in strings", () => {
      const item = createItem()
      item.msgid = "col1\tcol2\tcol3"
      const str = stringifyItem(item)
      assertHasLine(str, 'msgid "col1\\tcol2\\tcol3"')
    })

    it("handles mixed escapes", () => {
      const item = createItem()
      item.msgid = 'quote: " backslash: \\ tab: \t newline:\n'
      const str = stringifyItem(item)
      // Compact format: first line has content
      assertHasContiguousLines(str, [
        'msgid "quote: \\" backslash: \\\\ tab: \\t newline:\\n"',
        '""'
      ])
    })
  })

  describe("plurals", () => {
    describe("nplurals=2", () => {
      it("writes 2 msgstrs when formatted correctly with translation", () => {
        const po = parsePo(readFixture("plurals/nplurals-2.po"))
        const str = stringifyPo(po)
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} things"',
          'msgstr[0] "1 thing"',
          'msgstr[1] "{{$count}} things"'
        ])
      })

      it("writes 2 msgstrs when formatted correctly with no translation", () => {
        const po = parsePo(readFixture("plurals/nplurals-2.po"))
        const str = stringifyPo(po)
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} other things"',
          'msgstr[0] ""',
          'msgstr[1] ""'
        ])
      })
    })

    describe("nplurals=3", () => {
      it("writes 3 msgstrs when formatted correctly with translation", () => {
        const po = parsePo(readFixture("plurals/nplurals-3.po"))
        const str = stringifyPo(po)
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} things"',
          'msgstr[0] "1 thing"',
          'msgstr[1] "{{$count}} things"',
          'msgstr[2] "{{$count}} things"'
        ])
      })

      it("writes 3 msgstrs when formatted correctly with no translation", () => {
        const po = parsePo(readFixture("plurals/nplurals-3.po"))
        const str = stringifyPo(po)
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
        const po = parsePo(readFixture("plurals/nplurals-6.po"))
        const str = stringifyPo(po)
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
    const original = createPoFile()
    const item = createItem()
    item.msgid = "Hello World"
    item.msgstr = ["Hallo Welt"]
    original.items.push(item)

    const serialized = stringifyPo(original)
    const parsed = parsePo(serialized)

    expect(parsed.items[0]?.msgid).toBe("Hello World")
    expect(parsed.items[0]?.msgstr[0]).toBe("Hallo Welt")
  })

  it("roundtrips strings with escapes", () => {
    const original = createPoFile()
    const item = createItem()
    item.msgid = 'Quote: " Backslash: \\ Tab: \t'
    item.msgstr = ["Result"]
    original.items.push(item)

    const serialized = stringifyPo(original)
    const parsed = parsePo(serialized)

    expect(parsed.items[0]?.msgid).toBe('Quote: " Backslash: \\ Tab: \t')
  })

  it("roundtrips multi-line strings", () => {
    const original = createPoFile()
    const item = createItem()
    item.msgid = "Line 1\nLine 2\nLine 3"
    item.msgstr = ["Zeile 1\nZeile 2\nZeile 3"]
    original.items.push(item)

    const serialized = stringifyPo(original)
    const parsed = parsePo(serialized)

    expect(parsed.items[0]?.msgid).toBe("Line 1\nLine 2\nLine 3")
    expect(parsed.items[0]?.msgstr[0]).toBe("Zeile 1\nZeile 2\nZeile 3")
  })

  it("roundtrips all control characters", () => {
    const original = createPoFile()
    const item = createItem()
    item.msgid = "\x07\b\t\v\f\r"
    item.msgstr = ["control"]
    original.items.push(item)

    const serialized = stringifyPo(original)
    const parsed = parsePo(serialized)

    expect(parsed.items[0]?.msgid).toBe("\x07\b\t\v\f\r")
  })

  it("roundtrips plural forms", () => {
    const original = createPoFile()
    original.headers["Plural-Forms"] = "nplurals=2; plural=(n != 1);"
    const item = createItem()
    item.msgid = "one item"
    item.msgid_plural = "many items"
    item.msgstr = ["ein Element", "viele Elemente"]
    original.items.push(item)

    const serialized = stringifyPo(original)
    const parsed = parsePo(serialized)

    expect(parsed.items[0]?.msgid).toBe("one item")
    expect(parsed.items[0]?.msgid_plural).toBe("many items")
    expect(parsed.items[0]?.msgstr).toEqual(["ein Element", "viele Elemente"])
  })

  it("roundtrips context", () => {
    const original = createPoFile()
    const item = createItem()
    item.msgctxt = "menu"
    item.msgid = "File"
    item.msgstr = ["Datei"]
    original.items.push(item)

    const serialized = stringifyPo(original)
    const parsed = parsePo(serialized)

    expect(parsed.items[0]?.msgctxt).toBe("menu")
    expect(parsed.items[0]?.msgid).toBe("File")
  })

  it("roundtrips flags", () => {
    const original = createPoFile()
    const item = createItem()
    item.msgid = "test"
    item.msgstr = [""]
    item.flags = { fuzzy: true, "no-wrap": true }
    original.items.push(item)

    const serialized = stringifyPo(original)
    const parsed = parsePo(serialized)

    expect(parsed.items[0]?.flags.fuzzy).toBe(true)
    expect(parsed.items[0]?.flags["no-wrap"]).toBe(true)
  })

  it("roundtrips comments", () => {
    const original = createPoFile()
    const item = createItem()
    item.msgid = "test"
    item.msgstr = [""]
    item.comments = ["translator note"]
    item.extractedComments = ["extracted note"]
    item.references = ["file.ts:42"]
    original.items.push(item)

    const serialized = stringifyPo(original)
    const parsed = parsePo(serialized)

    expect(parsed.items[0]?.comments).toEqual(["translator note"])
    expect(parsed.items[0]?.extractedComments).toEqual(["extracted note"])
    expect(parsed.items[0]?.references).toEqual(["file.ts:42"])
  })

  it("roundtrips obsolete items", () => {
    const original = createPoFile()
    const item = createItem()
    item.msgid = "old text"
    item.msgstr = ["alter Text"]
    item.obsolete = true
    original.items.push(item)

    const serialized = stringifyPo(original)
    const parsed = parsePo(serialized)

    expect(parsed.items[0]?.obsolete).toBe(true)
    expect(parsed.items[0]?.msgid).toBe("old text")
  })
})
