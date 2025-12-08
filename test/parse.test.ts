import { describe, it, expect } from "vitest"
import * as fs from "node:fs"
import { PO } from "../src/po"

describe("Parse", () => {
  it("parses the big po file", () => {
    const po = PO.parse(fs.readFileSync(__dirname + "/fixtures/big.po", "utf8"))
    expect(po).not.toBeNull()
    expect(po.items.length).toBe(70)

    const item = po.items[0]
    expect(item?.msgid).toBe("Title")
    expect(item?.msgstr[0]).toBe("Titre")
  })

  it("handles multi-line strings", () => {
    const po = PO.parse(fs.readFileSync(__dirname + "/fixtures/multi-line.po", "utf8"))
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
    const po = PO.parse(fs.readFileSync(__dirname + "/fixtures/multi-line.po", "utf8"))
    expect(po).not.toBeNull()
    expect(po.items.length).toBe(1)

    expect(po.headers["Plural-Forms"]).toBe(
      "nplurals=3; plural=n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2;"
    )
  })

  it("handles empty comments", async () => {
    const po = await new Promise<PO>((resolve, reject) => {
      PO.load(__dirname + "/fixtures/comment.po", (err, result) => {
        if (err) {
          reject(err)
          return
        }
        if (result) {
          resolve(result)
        }
      })
    })

    const item = po.items[1]
    expect(item?.msgid).toBe("Empty comment")
    expect(item?.msgstr[0]).toBe("Empty")
    expect(item?.comments).toEqual([""])
    expect(item?.extractedComments).toEqual([""])
    expect(item?.references).toEqual([""])
  })

  it("handles translator comments", () => {
    const po = PO.parse(fs.readFileSync(__dirname + "/fixtures/comment.po", "utf8"))
    expect(po).not.toBeNull()
    expect(po.items.length).toBe(2)

    const item = po.items[0]
    expect(item?.msgid).toBe("Title, as plain text")
    expect(item?.msgstr[0]).toBe("Attribut title, en tant que texte brut")
    expect(item?.comments).toEqual(["Translator comment"])
  })

  it("handles extracted comments", () => {
    const po = PO.parse(fs.readFileSync(__dirname + "/fixtures/comment.po", "utf8"))
    expect(po).not.toBeNull()
    expect(po.items.length).toBe(2)

    expect(po.extractedComments.length).toBe(1)
    expect(po.extractedComments[0]).toBe("extracted from test")

    const item = po.items[0]
    expect(item?.msgid).toBe("Title, as plain text")
    expect(item?.msgstr[0]).toBe("Attribut title, en tant que texte brut")
    expect(item?.extractedComments).toEqual(["Extracted comment"])
  })

  describe("handles string references", () => {
    const po = PO.parse(fs.readFileSync(__dirname + "/fixtures/reference.po", "utf8"))
    expect(po).not.toBeNull()
    expect(po.items.length).toBe(3)

    it("in simple cases", () => {
      const item = po.items[0]
      expect(item?.msgid).toBe("Title, as plain text")
      expect(item?.msgstr[0]).toBe("Attribut title, en tant que texte brut")
      expect(item?.comments).toEqual(["Comment"])
      expect(item?.references).toEqual([".tmp/crm/controllers/map.js"])
    })

    it("with two different references", () => {
      const item = po.items[1]
      expect(item?.msgid).toBe("X")
      expect(item?.msgstr[0]).toBe("Y")
      expect(item?.references).toEqual(["a", "b"])
    })

    it("and does not process reference items", () => {
      const item = po.items[2]
      expect(item?.msgid).toBe("Z")
      expect(item?.msgstr[0]).toBe("ZZ")
      expect(item?.references).toEqual(["standard input:12 standard input:17"])
    })
  })

  it("parses flags", () => {
    const po = PO.parse(fs.readFileSync(__dirname + "/fixtures/fuzzy.po", "utf8"))
    expect(po).not.toBeNull()
    expect(po.items.length).toBe(1)

    const item = po.items[0]
    expect(item?.msgid).toBe("Sources")
    expect(item?.msgstr[0]).toBe("Source")
    expect(item?.flags).not.toBeNull()
    expect(item?.flags.fuzzy).toBe(true)
  })

  it("parses item context", () => {
    const po = PO.parse(fs.readFileSync(__dirname + "/fixtures/big.po", "utf8"))

    const ambiguousItems = po.items.filter((item) => item.msgid === "Empty folder")

    expect(ambiguousItems[0]?.msgctxt).toBe("folder display")
    expect(ambiguousItems[1]?.msgctxt).toBe("folder action")
  })

  it("parses item multiline context", () => {
    const po = PO.parse(fs.readFileSync(__dirname + "/fixtures/big.po", "utf8"))

    const item = po.items.find(
      (item) => item.msgid === "Created Date" && item.msgctxt === "folder meta"
    )

    expect(item).not.toBeUndefined()
    expect(item?.msgctxt).toBe("folder meta")
  })

  it("handles obsolete items", () => {
    const po = PO.parse(fs.readFileSync(__dirname + "/fixtures/commented.po", "utf8"))

    expect(po.items.length).toBe(4)

    let item = po.items[0]
    expect(item?.obsolete).toBe(false)
    expect(item?.msgid).toBe("{{dataLoader.data.length}} results")
    expect(item?.msgstr[0]).toBe("{{dataLoader.data.length}} resultaten")

    item = po.items[1]
    expect(item?.obsolete).toBe(true)
    expect(item?.msgid).toBe("Add order")
    expect(item?.msgstr[0]).toBe("Order toevoegen")

    item = po.items[2]
    expect(item?.obsolete).toBe(true)
    expect(item?.msgid).toBe("Commented item")
    expect(item?.msgstr[0]).toBe("not sure")

    item = po.items[3]
    expect(item?.obsolete).toBe(true)
    expect(item?.msgid).toBe("Second commented item")
    expect(item?.msgstr[0]).toBe("also not sure")
  })

  describe("C-Strings", () => {
    const po = PO.parse(fs.readFileSync(__dirname + "/fixtures/c-strings.po", "utf8"))

    it("should parse the c-strings.po file", () => {
      expect(po).not.toBeNull()
    })

    it('should extract strings containing " and \\ characters', () => {
      const items = po.items.filter((item) =>
        item.msgid.startsWith("The name field must not contain")
      )
      expect(items[0]?.msgid).toBe('The name field must not contain characters like " or \\')
    })

    it("should handle \\n characters", () => {
      const item = po.items[1]
      expect(item?.msgid).toBe("%1$s\n%2$s %3$s\n%4$s\n%5$s")
    })

    it("should handle \\t characters", () => {
      const item = po.items[2]
      expect(item?.msgid).toBe(
        "define('some/test/module', function () {\n" +
          "\t'use strict';\n" +
          "\treturn {};\n" +
          "});\n"
      )
    })
  })
})
