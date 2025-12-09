import { describe, it, expect } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"
import { PO } from "./PO"
import type { Item } from "./Item"

const FIXTURES_DIR = path.join(__dirname, "fixtures")

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8")
}

describe("parser", () => {
  describe("basic parsing", () => {
    it("parses the big po file", () => {
      const po = PO.parse(readFixture("big.po"))
      expect(po).not.toBeNull()
      expect(po.items.length).toBe(70)

      const item = po.items[0]
      expect(item?.msgid).toBe("Title")
      expect(item?.msgstr[0]).toBe("Titre")
    })

    it("handles multi-line strings", () => {
      const po = PO.parse(readFixture("multi-line.po"))
      expect(po).not.toBeNull()
      expect(po.items.length).toBe(1)

      const item = po.items[0]
      expect(item?.msgid).toBe(
        "The following placeholder tokens can be used in both paths and titles. When used in a path or title, they will be replaced with the appropriate values."
      )
      expect(item?.msgstr[0]).toBe(
        "Les ébauches de jetons suivantes peuvent être utilisées à la fois dans les chemins et dans les titres. Lorsqu'elles sont utilisées dans un chemin ou un titre, elles seront remplacées par les valeurs appropriées."
      )
    })

    it("handles multi-line headers", () => {
      const po = PO.parse(readFixture("multi-line.po"))
      expect(po.headers["Plural-Forms"]).toBe(
        "nplurals=3; plural=n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2;"
      )
    })
  })

  describe("comments", () => {
    it("handles empty comments", () => {
      const po = PO.parse(readFixture("comment.po"))

      const item = po.items[1]
      expect(item?.msgid).toBe("Empty comment")
      expect(item?.msgstr[0]).toBe("Empty")
      expect(item?.comments).toEqual([""])
      expect(item?.extractedComments).toEqual([""])
      expect(item?.references).toEqual([""])
    })

    it("handles translator comments", () => {
      const po = PO.parse(readFixture("comment.po"))
      expect(po.items.length).toBe(2)

      const item = po.items[0]
      expect(item?.msgid).toBe("Title, as plain text")
      expect(item?.msgstr[0]).toBe("Attribut title, en tant que texte brut")
      expect(item?.comments).toEqual(["Translator comment"])
    })

    it("handles extracted comments", () => {
      const po = PO.parse(readFixture("comment.po"))

      expect(po.extractedComments.length).toBe(1)
      expect(po.extractedComments[0]).toBe("extracted from test")

      const item = po.items[0]
      expect(item?.extractedComments).toEqual(["Extracted comment"])
    })
  })

  describe("references", () => {
    it("handles simple references", () => {
      const po = PO.parse(readFixture("reference.po"))
      expect(po.items.length).toBe(3)

      const item = po.items[0]
      expect(item?.msgid).toBe("Title, as plain text")
      expect(item?.references).toEqual([".tmp/crm/controllers/map.js"])
    })

    it("handles multiple references", () => {
      const po = PO.parse(readFixture("reference.po"))
      const item = po.items[1]
      expect(item?.msgid).toBe("X")
      expect(item?.references).toEqual(["a", "b"])
    })

    it("does not split space-separated references", () => {
      const po = PO.parse(readFixture("reference.po"))
      const item = po.items[2]
      expect(item?.msgid).toBe("Z")
      expect(item?.references).toEqual(["standard input:12 standard input:17"])
    })
  })

  describe("flags", () => {
    it("parses flags", () => {
      const po = PO.parse(readFixture("fuzzy.po"))
      expect(po.items.length).toBe(1)

      const item = po.items[0]
      expect(item?.msgid).toBe("Sources")
      expect(item?.flags.fuzzy).toBe(true)
    })
  })

  describe("context", () => {
    it("parses item context", () => {
      const po = PO.parse(readFixture("big.po"))
      const ambiguousItems = po.items.filter((item: Item) => item.msgid === "Empty folder")

      expect(ambiguousItems[0]?.msgctxt).toBe("folder display")
      expect(ambiguousItems[1]?.msgctxt).toBe("folder action")
    })

    it("parses item multiline context", () => {
      const po = PO.parse(readFixture("big.po"))
      const item = po.items.find(
        (item: Item) => item.msgid === "Created Date" && item.msgctxt === "folder meta"
      )

      expect(item).not.toBeUndefined()
      expect(item?.msgctxt).toBe("folder meta")
    })
  })

  describe("obsolete items", () => {
    it("handles obsolete items", () => {
      const po = PO.parse(readFixture("commented.po"))
      expect(po.items.length).toBe(4)

      expect(po.items[0]?.obsolete).toBe(false)
      expect(po.items[0]?.msgid).toBe("{{dataLoader.data.length}} results")

      expect(po.items[1]?.obsolete).toBe(true)
      expect(po.items[1]?.msgid).toBe("Add order")

      expect(po.items[2]?.obsolete).toBe(true)
      expect(po.items[2]?.msgid).toBe("Commented item")

      expect(po.items[3]?.obsolete).toBe(true)
      expect(po.items[3]?.msgid).toBe("Second commented item")
    })
  })

  describe("C-string escapes", () => {
    it("extracts strings containing quotes and backslashes", () => {
      const po = PO.parse(readFixture("c-strings.po"))
      const items = po.items.filter((item: Item) =>
        item.msgid.startsWith("The name field must not contain")
      )
      expect(items[0]?.msgid).toBe('The name field must not contain characters like " or \\')
    })

    it("handles \\n characters", () => {
      const po = PO.parse(readFixture("c-strings.po"))
      const item = po.items[1]
      expect(item?.msgid).toBe("%1$s\n%2$s %3$s\n%4$s\n%5$s")
    })

    it("handles \\t characters", () => {
      const po = PO.parse(readFixture("c-strings.po"))
      const item = po.items[2]
      expect(item?.msgid).toBe(
        "define('some/test/module', function () {\n\t'use strict';\n\treturn {};\n});\n"
      )
    })
  })

  describe("edge cases", () => {
    it("handles multiple consecutive flag lines", () => {
      const content = `
msgid ""
msgstr "Content-Type: text/plain; charset=utf-8\\n"

#, fuzzy
#, no-wrap
msgid "test"
msgstr "test"
`
      const po = PO.parse(content)
      expect(po.items[0]?.flags.fuzzy).toBe(true)
      expect(po.items[0]?.flags["no-wrap"]).toBe(true)
    })

    it("handles multiple consecutive reference lines", () => {
      const content = `
msgid ""
msgstr ""

#: path/a.ts:1
#: path/b.ts:2
msgid "test"
msgstr ""
`
      const po = PO.parse(content)
      expect(po.items[0]?.references).toEqual(["path/a.ts:1", "path/b.ts:2"])
    })

    it("handles empty first line in msgid_plural", () => {
      const content = `
msgid ""
msgstr ""

msgid "one"
msgid_plural ""
"many"
msgstr[0] ""
msgstr[1] ""
`
      const po = PO.parse(content)
      expect(po.items[0]?.msgid_plural).toBe("many")
    })

    it("handles escaped single quote", () => {
      const content = `
msgid ""
msgstr ""

msgid "\\'test\\'"
msgstr "\\'result\\'"
`
      const po = PO.parse(content)
      expect(po.items[0]?.msgid).toBe("'test'")
      expect(po.items[0]?.msgstr[0]).toBe("'result'")
    })

    it("handles double-escaped backslash before quote", () => {
      const content = `
msgid ""
msgstr ""

msgid "test\\\\"-end"
msgstr "result"
`
      const po = PO.parse(content)
      expect(po.items[0]?.msgid).toBe('test\\"-end')
    })

    it("handles mixed comment types in sequence", () => {
      const content = `
msgid ""
msgstr ""

# translator comment
#. extracted comment
#: reference.ts:42
#, fuzzy
msgid "test"
msgstr ""
`
      const po = PO.parse(content)
      const item = po.items[0]
      expect(item?.comments).toEqual(["translator comment"])
      expect(item?.extractedComments).toEqual(["extracted comment"])
      expect(item?.references).toEqual(["reference.ts:42"])
      expect(item?.flags.fuzzy).toBe(true)
    })

    it("handles msgstr with empty first line continuation", () => {
      const content = `
msgid ""
msgstr ""

msgid "test"
msgstr ""
"continued on next line"
`
      const po = PO.parse(content)
      expect(po.items[0]?.msgstr[0]).toBe("continued on next line")
    })

    it("handles all single-character escape sequences", () => {
      const content = `
msgid ""
msgstr ""

msgid "\\a\\b\\t\\n\\v\\f\\r"
msgstr "result"
`
      const po = PO.parse(content)
      expect(po.items[0]?.msgid).toBe("\x07\b\t\n\v\f\r")
    })

    it("handles hex escape sequences", () => {
      const content = `
msgid ""
msgstr ""

msgid "\\x41\\x42\\x43"
msgstr ""
`
      const po = PO.parse(content)
      expect(po.items[0]?.msgid).toBe("ABC")
    })

    it("handles 3-digit octal escape sequences", () => {
      const content = `
msgid ""
msgstr ""

msgid "\\101\\102\\103"
msgstr ""
`
      const po = PO.parse(content)
      expect(po.items[0]?.msgid).toBe("ABC")
    })

    it("handles 1-2 digit octal escape sequences", () => {
      const content = `
msgid ""
msgstr ""

msgid "\\0 \\7 \\77"
msgstr ""
`
      const po = PO.parse(content)
      expect(po.items[0]?.msgid).toBe("\x00 \x07 ?")
    })

    it("handles null byte in string", () => {
      const content = `
msgid ""
msgstr ""

msgid "before\\000after"
msgstr ""
`
      const po = PO.parse(content)
      expect(po.items[0]?.msgid).toBe("before\x00after")
    })

    it("handles backslash at end of line continuation", () => {
      const content = `
msgid ""
msgstr ""

msgid "line1\\n"
"line2"
msgstr ""
`
      const po = PO.parse(content)
      expect(po.items[0]?.msgid).toBe("line1\nline2")
    })

    it("handles empty msgid with only continuation lines", () => {
      const content = `
msgid ""
msgstr ""

msgid ""
"actual content"
msgstr ""
`
      const po = PO.parse(content)
      expect(po.items[0]?.msgid).toBe("actual content")
    })

    it("handles CRLF line endings", () => {
      const content = 'msgid ""\r\nmsgstr ""\r\n\r\nmsgid "test"\r\nmsgstr "result"\r\n'
      const po = PO.parse(content)
      expect(po.items[0]?.msgid).toBe("test")
      expect(po.items[0]?.msgstr[0]).toBe("result")
    })

    it("handles trailing whitespace on lines", () => {
      const content = `
msgid ""
msgstr ""

msgid "test"
msgstr "result"
`
      const po = PO.parse(content)
      expect(po.items[0]?.msgid).toBe("test")
    })
  })
})
