import { describe, it, expect } from "vitest"
import * as fs from "node:fs"
import { PO } from "../src/index"

function assertHasLine(str: string, line: string, doNotTrim?: boolean): void {
  const lines = str.split("\n")
  let found = false

  for (const l of lines) {
    const lineToCompare = doNotTrim ? l : l.trim()
    if (lineToCompare === line) {
      found = true
      break
    }
  }

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
  let found = false

  for (const l of lines) {
    if (l.trim() === line) {
      found = true
      break
    }
  }

  expect(found, `Shouldn't have line: ${line}`).toBe(false)
}

describe("Write", () => {
  it("write flags", () => {
    const input = fs.readFileSync(__dirname + "/fixtures/fuzzy.po", "utf8")
    const po = PO.parse(input)
    const str = po.toString()
    assertHasLine(str, "#, fuzzy")
  })

  it("write empty comment without an unnecessary space", () => {
    const input = fs.readFileSync(__dirname + "/fixtures/fuzzy.po", "utf8")
    const po = PO.parse(input)
    const str = po.toString()
    assertHasLine(str, "#", true)
  })

  it("write flags only when true", () => {
    const input = fs.readFileSync(__dirname + "/fixtures/fuzzy.po", "utf8")
    const po = PO.parse(input)

    // Flip flag
    const item = po.items[0]
    if (item) {
      item.flags.fuzzy = false
    }

    const str = po.toString()
    assertDoesntHaveLine(str, "#, fuzzy")
  })

  it("write msgid", () => {
    const input = fs.readFileSync(__dirname + "/fixtures/fuzzy.po", "utf8")
    const po = PO.parse(input)
    const str = po.toString()
    assertHasLine(str, 'msgid "Sources"')
  })

  it("write msgstr", () => {
    const input = fs.readFileSync(__dirname + "/fixtures/fuzzy.po", "utf8")
    const po = PO.parse(input)
    const str = po.toString()
    assertHasLine(str, 'msgstr "Source"')
  })

  it("write translator comment", () => {
    const input = fs.readFileSync(__dirname + "/fixtures/comment.po", "utf8")
    const po = PO.parse(input)
    const str = po.toString()
    assertHasLine(str, "# Translator comment")
  })

  it("write extracted comment", () => {
    const input = fs.readFileSync(__dirname + "/fixtures/comment.po", "utf8")
    const po = PO.parse(input)
    const str = po.toString()
    assertHasLine(str, "#. extracted from test")
    assertHasLine(str, "#. Extracted comment")
  })

  it("write obsolete items", () => {
    const input = fs.readFileSync(__dirname + "/fixtures/commented.po", "utf8")
    const po = PO.parse(input)
    const str = po.toString()

    assertHasLine(str, '#~ msgid "Add order"')
    assertHasLine(str, '#~ msgstr "Order toevoegen"')
  })

  it("write obsolete items with comment", () => {
    const input = fs.readFileSync(__dirname + "/fixtures/commented.po", "utf8")
    const po = PO.parse(input)
    const str = po.toString()

    // This is what msgcat tool of gettext does: don't print #~ for comments
    assertHasLine(str, "# commented obsolete item")
    assertHasLine(str, "#, fuzzy")

    // Items made obsolete by commenting every keyword with #~
    assertHasLine(str, '#~ msgid "Commented item"')
    assertHasLine(str, '#~ msgstr "not sure"')
    assertHasLine(str, '#~ msgid "Second commented item"')
    assertHasLine(str, '#~ msgstr "also not sure"')
  })

  describe("plurals", () => {
    describe("nplurals INTEGER", () => {
      it("should write 2 msgstrs when formatted correctly", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/messages.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} things"',
          'msgstr[0] ""',
          'msgstr[1] ""'
        ])
      })

      it("should write 2 msgstrs when formatted incorrectly", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/messages.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} mistakes"',
          'msgstr[0] ""',
          'msgstr[1] ""'
        ])
      })
    })

    describe("nplurals missing", () => {
      it("should write 2 msgstrs when formatted correctly with translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-missing.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} things"',
          'msgstr[0] "1 thing"',
          'msgstr[1] "{{$count}} things"'
        ])
      })

      it("should write 2 msgstrs when formatted correctly with no translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-missing.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} other things"',
          'msgstr[0] ""',
          'msgstr[1] ""'
        ])
      })

      it("should keep same number of msgstrs when formatted incorrectly with translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-missing.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} mistakes"',
          'msgstr[0] "1 mistake"',
          "",
          "# incorrect plurals, with no translation"
        ])
      })

      it("should write 2 msgstrs when formatted incorrectly with no translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-missing.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} other mistakes"',
          'msgstr[0] ""',
          'msgstr[1] ""'
        ])
      })
    })

    describe("nplurals=1", () => {
      it("should write 1 msgstr when formatted correctly with translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-1.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} things"',
          'msgstr[0] "{{$count}} thing"'
        ])
      })

      it("should write 1 msgstr when formatted correctly with no translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-1.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} other things"',
          'msgstr[0] ""',
          "",
          "# incorrect plurals, with translation"
        ])
      })

      it("should keep same number of msgstrs when formatted incorrectly with translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-1.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} mistakes"',
          'msgstr[0] "1 mistake"',
          'msgstr[1] "{{$count}} mistakes"'
        ])
      })

      it("should write 1 msgstr when formatted incorrectly with no translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-1.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, ['msgid_plural "{{$count}} other mistakes"', 'msgstr[0] ""'])
      })
    })

    describe("nplurals=2", () => {
      it("should write 2 msgstrs when formatted correctly with translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-2.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} things"',
          'msgstr[0] "1 thing"',
          'msgstr[1] "{{$count}} things"'
        ])
      })

      it("should write 2 msgstrs when formatted correctly with no translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-2.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} other things"',
          'msgstr[0] ""',
          'msgstr[1] ""'
        ])
      })

      it("should keep same number of msgstrs when formatted incorrectly with translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-2.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} mistakes"',
          'msgstr[0] "1 mistake"',
          "",
          "# incorrect plurals, with no translation"
        ])
      })

      it("should write 2 msgstrs when formatted incorrectly with no translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-2.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} other mistakes"',
          'msgstr[0] ""',
          'msgstr[1] ""'
        ])
      })
    })

    describe("nplurals=3", () => {
      it("should write 3 msgstrs when formatted correctly with translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-3.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} things"',
          'msgstr[0] "1 thing"',
          'msgstr[1] "{{$count}} things"',
          'msgstr[2] "{{$count}} things"'
        ])
      })

      it("should write 3 msgstrs when formatted correctly with no translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-3.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} other things"',
          'msgstr[0] ""',
          'msgstr[1] ""',
          'msgstr[2] ""'
        ])
      })

      it("should keep same number of msgstrs when formatted incorrectly with translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-3.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} mistakes"',
          'msgstr[0] "1 mistake"',
          'msgstr[1] "{{$count}} mistakes"',
          "",
          "# incorrect plurals, with no translation"
        ])
      })

      it("should write 3 msgstrs when formatted incorrectly with no translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-3.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} other mistakes"',
          'msgstr[0] ""',
          'msgstr[1] ""',
          'msgstr[2] ""'
        ])
      })
    })

    describe("nplurals=6", () => {
      it("should write 6 msgstrs when formatted correctly with translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-6.po", "utf8")
        const po = PO.parse(input)
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

      it("should write 6 msgstrs when formatted correctly with no translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-6.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} other things"',
          'msgstr[0] ""',
          'msgstr[1] ""',
          'msgstr[2] ""',
          'msgstr[3] ""',
          'msgstr[4] ""',
          'msgstr[5] ""'
        ])
      })

      it("should keep same number of msgstrs when formatted incorrectly with translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-6.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} mistakes"',
          'msgstr[0] "1 mistake"',
          'msgstr[1] "{{$count}} mistakes"',
          'msgstr[2] "{{$count}} mistakes"',
          "",
          "# incorrect plurals, with no translation"
        ])
      })

      it("should write 6 msgstrs when formatted incorrectly with no translation", () => {
        const input = fs.readFileSync(__dirname + "/fixtures/plurals/nplurals-6.po", "utf8")
        const po = PO.parse(input)
        const str = po.toString()
        assertHasContiguousLines(str, [
          'msgid_plural "{{$count}} other mistakes"',
          'msgstr[0] ""',
          'msgstr[1] ""',
          'msgstr[2] ""',
          'msgstr[3] ""',
          'msgstr[4] ""',
          'msgstr[5] ""'
        ])
      })
    })
  })

  describe("C-Strings", () => {
    it('should escape "', () => {
      const item = new PO.Item()

      item.msgid = '" should be written escaped'
      assertHasLine(item.toString(), 'msgid "\\" should be written escaped"')
    })

    it("should escape \\", () => {
      const item = new PO.Item()

      item.msgid = "\\ should be written escaped"
      assertHasLine(item.toString(), 'msgid "\\\\ should be written escaped"')
    })

    it("should escape \\n", () => {
      const item = new PO.Item()

      item.msgid = "\n should be written escaped"
      assertHasLine(item.toString(), 'msgid ""')
      assertHasLine(item.toString(), '"\\n"')
      assertHasLine(item.toString(), '" should be written escaped"')
    })

    it("should write identical file after parsing a file", () => {
      const input = fs.readFileSync(__dirname + "/fixtures/c-strings.po", "utf8")
      const po = PO.parse(input)
      const str = po.toString()

      expect(str).toBe(input)
    })
  })

  describe("msgctxt", () => {
    it("should write context field to file", () => {
      const input = fs.readFileSync(__dirname + "/fixtures/big.po", "utf8")
      const po = PO.parse(input)
      const str = po.toString()
      assertHasLine(str, 'msgctxt "folder action"')
    })

    it("should ignore omitted context field", () => {
      const po = new PO()
      const item = new PO.Item()
      po.items.push(item)
      expect(po.toString().includes("msgctxt")).toBe(false)
    })

    it("should write empty context field", () => {
      const po = new PO()
      const item = new PO.Item()

      item.msgctxt = ""
      po.items.push(item)
      expect(po.toString().includes("msgctxt")).toBe(true)
    })
  })

  it("should keep the header order", () => {
    const input = fs.readFileSync(__dirname + "/fixtures/big.po", "utf8")
    const po = PO.parse(input)
    const str = po.toString()

    assertHasContiguousLines(str, [
      'msgid ""',
      'msgstr ""',
      '"Project-Id-Version: Link (6.x-2.9)\\n"',
      '"POT-Creation-Date: 2011-12-31 23:39+0000\\n"',
      '"PO-Revision-Date: 2013-12-17 14:21+0100\\n"',
      '"Language-Team: French\\n"',
      '"MIME-Version: 1.0\\n"',
      '"Content-Type: text/plain; charset=UTF-8\\n"',
      '"Content-Transfer-Encoding: 8bit\\n"',
      '"Plural-Forms: nplurals=2; plural=(n > 1);\\n"',
      '"Last-Translator: Ruben Vermeersch <ruben@rocketeer.be>\\n"',
      '"Language: fr\\n"',
      '"X-Generator: Poedit 1.6.2\\n"'
    ])
  })

  describe("Edge cases", () => {
    it("should escape all control characters", () => {
      const item = new PO.Item()
      item.msgid = "\x07\b\t\v\f\r"
      const str = item.toString()
      assertHasLine(str, 'msgid "\\a\\b\\t\\v\\f\\r"')
    })

    it("should handle null byte by keeping it as-is", () => {
      const item = new PO.Item()
      item.msgid = "before\x00after"
      const str = item.toString()
      // NULL bytes are kept as-is (not escaped to \000)
      expect(str).toContain("before\x00after")
    })

    it("should escape backslash before quote", () => {
      const item = new PO.Item()
      item.msgid = 'test\\"-end'
      const str = item.toString()
      assertHasLine(str, 'msgid "test\\\\\\"-end"')
    })

    it("should handle multiple newlines", () => {
      const item = new PO.Item()
      item.msgid = "line1\nline2\nline3"
      const str = item.toString()
      assertHasContiguousLines(str, [
        'msgid ""',
        '"line1\\n"',
        '"line2\\n"',
        '"line3"'
      ])
    })

    it("should handle string ending with newline", () => {
      const item = new PO.Item()
      item.msgid = "ends with newline\n"
      const str = item.toString()
      assertHasContiguousLines(str, ['msgid ""', '"ends with newline\\n"', '""'])
    })

    it("should handle empty string", () => {
      const item = new PO.Item()
      item.msgid = ""
      const str = item.toString()
      assertHasLine(str, 'msgid ""')
    })

    it("should handle string with only newlines", () => {
      const item = new PO.Item()
      item.msgid = "\n\n"
      const str = item.toString()
      assertHasContiguousLines(str, ['msgid ""', '"\\n"', '"\\n"', '""'])
    })

    it("should handle tabs in strings", () => {
      const item = new PO.Item()
      item.msgid = "col1\tcol2\tcol3"
      const str = item.toString()
      assertHasLine(str, 'msgid "col1\\tcol2\\tcol3"')
    })

    it("should handle mixed escapes", () => {
      const item = new PO.Item()
      item.msgid = 'quote: " backslash: \\ tab: \t newline:\n'
      const str = item.toString()
      assertHasContiguousLines(str, [
        'msgid ""',
        '"quote: \\" backslash: \\\\ tab: \\t newline:\\n"',
        '""'
      ])
    })
  })

  describe("Roundtrip", () => {
    it("should roundtrip simple strings", () => {
      const original = new PO()
      const item = new PO.Item()
      item.msgid = "Hello World"
      item.msgstr = ["Hallo Welt"]
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.msgid).toBe("Hello World")
      expect(parsed.items[0]?.msgstr[0]).toBe("Hallo Welt")
    })

    it("should roundtrip strings with escapes", () => {
      const original = new PO()
      const item = new PO.Item()
      item.msgid = 'Quote: " Backslash: \\ Tab: \t'
      item.msgstr = ["Result"]
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.msgid).toBe('Quote: " Backslash: \\ Tab: \t')
    })

    it("should roundtrip multi-line strings", () => {
      const original = new PO()
      const item = new PO.Item()
      item.msgid = "Line 1\nLine 2\nLine 3"
      item.msgstr = ["Zeile 1\nZeile 2\nZeile 3"]
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.msgid).toBe("Line 1\nLine 2\nLine 3")
      expect(parsed.items[0]?.msgstr[0]).toBe("Zeile 1\nZeile 2\nZeile 3")
    })

    it("should roundtrip all control characters", () => {
      const original = new PO()
      const item = new PO.Item()
      item.msgid = "\x07\b\t\v\f\r"
      item.msgstr = ["control"]
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.msgid).toBe("\x07\b\t\v\f\r")
    })

    it("should roundtrip plural forms", () => {
      const original = new PO()
      original.headers["Plural-Forms"] = "nplurals=2; plural=(n != 1);"
      const item = new PO.Item()
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

    it("should roundtrip context", () => {
      const original = new PO()
      const item = new PO.Item()
      item.msgctxt = "menu"
      item.msgid = "File"
      item.msgstr = ["Datei"]
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.msgctxt).toBe("menu")
      expect(parsed.items[0]?.msgid).toBe("File")
    })

    it("should roundtrip flags", () => {
      const original = new PO()
      const item = new PO.Item()
      item.msgid = "test"
      item.msgstr = [""]
      item.flags = { fuzzy: true, "no-wrap": true }
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.flags.fuzzy).toBe(true)
      expect(parsed.items[0]?.flags["no-wrap"]).toBe(true)
    })

    it("should roundtrip comments", () => {
      const original = new PO()
      const item = new PO.Item()
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

    it("should roundtrip obsolete items", () => {
      const original = new PO()
      const item = new PO.Item()
      item.msgid = "old text"
      item.msgstr = ["alter Text"]
      item.obsolete = true
      original.items.push(item)

      const serialized = original.toString()
      const parsed = PO.parse(serialized)

      expect(parsed.items[0]?.obsolete).toBe(true)
      expect(parsed.items[0]?.msgid).toBe("old text")
    })

    it("should preserve data when parsing and re-serializing", () => {
      const fixtures = [
        "big.po",
        "comment.po",
        "fuzzy.po",
        "multi-line.po",
        "reference.po",
        "c-strings.po"
      ]

      for (const fixture of fixtures) {
        const input = fs.readFileSync(__dirname + "/fixtures/" + fixture, "utf8")
        const po1 = PO.parse(input)
        const serialized = po1.toString()
        const po2 = PO.parse(serialized)

        // Compare data, not exact formatting
        expect(po2.items.length, `Item count mismatch for ${fixture}`).toBe(po1.items.length)

        for (let i = 0; i < po1.items.length; i++) {
          const item1 = po1.items[i]!
          const item2 = po2.items[i]!
          expect(item2.msgid, `msgid mismatch at index ${i} in ${fixture}`).toBe(item1.msgid)
          expect(item2.msgstr, `msgstr mismatch at index ${i} in ${fixture}`).toEqual(item1.msgstr)
          expect(item2.msgctxt, `msgctxt mismatch at index ${i} in ${fixture}`).toBe(item1.msgctxt)
          expect(item2.msgid_plural, `msgid_plural mismatch at index ${i} in ${fixture}`).toBe(
            item1.msgid_plural
          )
          expect(item2.obsolete, `obsolete mismatch at index ${i} in ${fixture}`).toBe(
            item1.obsolete
          )
          expect(item2.flags, `flags mismatch at index ${i} in ${fixture}`).toEqual(item1.flags)
        }
      }
    })

    it("should produce identical output for normalized files", () => {
      // Only test files that are already in normalized format
      const normalizedFixtures = ["c-strings.po"]

      for (const fixture of normalizedFixtures) {
        const input = fs.readFileSync(__dirname + "/fixtures/" + fixture, "utf8")
        const po = PO.parse(input)
        const output = po.toString()
        expect(output, `Exact roundtrip failed for ${fixture}`).toBe(input)
      }
    })
  })
})
