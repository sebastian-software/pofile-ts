import { describe, it, expect, beforeAll } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"
import { parsePo, stringifyPo, parsePluralForms } from "./PO"
import type { PoFile } from "./types"

const FIXTURES_DIR = path.join(__dirname, "fixtures")

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8")
}

describe("parsePo", () => {
  describe("headers", () => {
    let po: PoFile

    beforeAll(() => {
      po = parsePo(readFixture("big.po"))
    })

    it("parses headers correctly", () => {
      expect(po.headers["Project-Id-Version"]).toBe("Link (6.x-2.9)")
      expect(po.headers["MIME-Version"]).toBe("1.0")
      expect(po.headers["Plural-Forms"]).toBe("nplurals=2; plural=(n > 1);")
    })

    it("parses all headers", () => {
      // There are 11 headers in the .po file, but some default headers
      // are defined (nr. 12 in this case is Report-Msgid-Bugs-To).
      expect(Object.keys(po.headers).length).toBe(12)
    })
  })

  describe("comments", () => {
    let po: PoFile

    beforeAll(() => {
      po = parsePo(readFixture("big.po"))
    })

    it("parses the comments", () => {
      expect(po.comments.length).toBe(3)
      expect(po.comments[0]).toBe("French translation of Link (6.x-2.9)")
      expect(po.comments[1]).toBe("Copyright (c) 2011 by the French translation team")
      expect(po.comments[2]).toBe("")
    })
  })

  describe("files with no headers", () => {
    it("parses an empty string", () => {
      const po = parsePo("")
      expect(po).not.toBeNull()
      for (const key in po.headers) {
        expect(po.headers[key]).toBe("")
      }
      expect(po.items.length).toBe(0)
    })

    it("parses a minimal example", () => {
      const po = parsePo('msgid "minimal PO"\nmsgstr ""')
      expect(po).not.toBeNull()
      for (const key in po.headers) {
        expect(po.headers[key]).toBe("")
      }
      expect(po.items.length).toBe(1)
    })

    describe("advanced example", () => {
      let po: PoFile

      beforeAll(() => {
        po = parsePo(readFixture("no_header.po"))
      })

      it("parses the po file", () => {
        expect(po).not.toBeNull()
      })

      it("finds all items", () => {
        expect(po.items.length).toBe(2)
      })
    })

    describe("advanced example with extra spaces", () => {
      let po: PoFile

      beforeAll(() => {
        po = parsePo(readFixture("no_header_extra_spaces.po"))
      })

      it("parses the po file", () => {
        expect(po).not.toBeNull()
      })

      it("finds all items", () => {
        expect(po.items.length).toBe(2)
      })
    })
  })

  describe("parsePluralForms", () => {
    it("returns undefined values when there is no plural forms header", () => {
      const expected = { nplurals: undefined, plural: undefined }
      expect(parsePluralForms(undefined)).toEqual(expected)
      expect(parsePluralForms("")).toEqual(expected)
    })

    it("parses xgettext's default output", () => {
      const pluralForms = "nplurals=INTEGER; plural=EXPRESSION;"
      const expected = { nplurals: "INTEGER", plural: "EXPRESSION" }
      expect(parsePluralForms(pluralForms)).toEqual(expected)
    })

    it("parses typical plural forms string", () => {
      const pluralForms =
        "nplurals=3; plural=(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);"
      const expected = {
        nplurals: "3",
        plural: "(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2)"
      }
      expect(parsePluralForms(pluralForms)).toEqual(expected)
    })

    it("handles spaces around assignments", () => {
      const pluralForms =
        "nplurals = 3; plural = (n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);"
      const expected = {
        nplurals: "3",
        plural: "(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2)"
      }
      expect(parsePluralForms(pluralForms)).toEqual(expected)
    })
  })

  describe("stringifyPo", () => {
    it("keeps the header order", () => {
      const po = parsePo(readFixture("big.po"))
      const str = stringifyPo(po)

      const expectedHeaders = [
        '"Project-Id-Version: Link (6.x-2.9)\\n"',
        '"POT-Creation-Date: 2011-12-31 23:39+0000\\n"',
        '"PO-Revision-Date: 2013-12-17 14:21+0100\\n"',
        '"Language-Team: French\\n"',
        '"MIME-Version: 1.0\\n"',
        '"Content-Type: text/plain; charset=UTF-8\\n"',
        '"Content-Transfer-Encoding: 8bit\\n"',
        '"Plural-Forms: nplurals=2; plural=(n > 1);\\n"'
      ]

      for (const header of expectedHeaders) {
        expect(str).toContain(header)
      }
    })
  })

  describe("roundtrip", () => {
    it("preserves data when parsing and re-serializing", () => {
      const fixtures = ["big.po", "comment.po", "fuzzy.po", "multi-line.po", "reference.po"]

      for (const fixture of fixtures) {
        const input = readFixture(fixture)
        const po1 = parsePo(input)
        const serialized = stringifyPo(po1)
        const po2 = parsePo(serialized)

        expect(po2.items.length, `Item count mismatch for ${fixture}`).toBe(po1.items.length)

        for (let i = 0; i < po1.items.length; i++) {
          const item1 = po1.items[i]
          const item2 = po2.items[i]
          if (!item1 || !item2) {
            throw new Error(`Missing item at index ${i} in ${fixture}`)
          }
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

    it("produces identical output with traditional format option", () => {
      // Using compactMultiline: false produces the traditional GNU gettext format
      // which matches the original fixture files
      const input = readFixture("c-strings.po")
      const po = parsePo(input)
      const output = stringifyPo(po, { compactMultiline: false, foldLength: 0 })
      expect(output).toBe(input)
    })

    it("produces stable output on repeated serialization", () => {
      // Default compact format should be stable across multiple parse/stringify cycles
      const input = readFixture("c-strings.po")
      const po1 = parsePo(input)
      const output1 = stringifyPo(po1)
      const po2 = parsePo(output1)
      const output2 = stringifyPo(po2)
      expect(output2).toBe(output1)
    })
  })
})
