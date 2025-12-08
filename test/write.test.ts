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
})
