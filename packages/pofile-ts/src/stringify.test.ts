import { describe, it, expect } from "vitest"
import { stringifyPo } from "./stringify"
import { createPoFile } from "./parse"
import { createItem } from "./Item"
import type { PoFile } from "./types"

describe("stringify", () => {
  describe("stringifyPo", () => {
    it("serializes an empty PO file", () => {
      const po = createPoFile()
      const output = stringifyPo(po)

      expect(output).toContain('msgid ""')
      expect(output).toContain('msgstr ""')
    })

    it("serializes file-level comments", () => {
      const po = createPoFile()
      po.comments = ["Translator comment", "Another comment"]
      const output = stringifyPo(po)

      expect(output).toContain("# Translator comment")
      expect(output).toContain("# Another comment")
    })

    it("serializes empty comments correctly", () => {
      const po = createPoFile()
      po.comments = [""]
      const output = stringifyPo(po)

      expect(output).toContain("#\n")
    })

    it("serializes file-level extracted comments", () => {
      const po = createPoFile()
      po.extractedComments = ["Extracted from source"]
      const output = stringifyPo(po)

      expect(output).toContain("#. Extracted from source")
    })

    it("serializes empty extracted comments correctly", () => {
      const po = createPoFile()
      po.extractedComments = [""]
      const output = stringifyPo(po)

      expect(output).toContain("#.\n")
    })

    it("serializes headers in order", () => {
      const po = createPoFile()
      po.headers = {
        Language: "de",
        "Content-Type": "text/plain; charset=utf-8"
      }
      po.headerOrder = ["Language", "Content-Type"]

      const output = stringifyPo(po)
      const langIndex = output.indexOf("Language:")
      const contentIndex = output.indexOf("Content-Type:")

      expect(langIndex).toBeLessThan(contentIndex)
    })

    it("includes new headers not in headerOrder after ordered ones", () => {
      const po = createPoFile()
      po.headers = {
        Language: "de",
        "X-Custom": "value",
        "Content-Type": "text/plain"
      }
      po.headerOrder = ["Content-Type"]

      const output = stringifyPo(po)

      // Content-Type should come first (from headerOrder)
      // Then Language and X-Custom (alphabetical or insertion order)
      expect(output).toContain('"Content-Type:')
      expect(output).toContain('"Language:')
      expect(output).toContain('"X-Custom:')
    })

    it("serializes items", () => {
      const po = createPoFile()
      const item = createItem()
      item.msgid = "Hello"
      item.msgstr = ["Hallo"]
      po.items = [item]

      const output = stringifyPo(po)

      expect(output).toContain('msgid "Hello"')
      expect(output).toContain('msgstr "Hallo"')
    })

    it("serializes multiple items with blank lines between", () => {
      const po = createPoFile()
      const item1 = createItem()
      item1.msgid = "Hello"
      item1.msgstr = ["Hallo"]
      const item2 = createItem()
      item2.msgid = "World"
      item2.msgstr = ["Welt"]
      po.items = [item1, item2]

      const output = stringifyPo(po)
      const lines = output.split("\n")

      // Find empty lines between items
      const helloIndex = lines.findIndex((l) => l.includes('msgid "Hello"'))
      const worldIndex = lines.findIndex((l) => l.includes('msgid "World"'))

      expect(worldIndex).toBeGreaterThan(helloIndex)
      // There should be a blank line between items
      expect(lines.slice(helloIndex, worldIndex).some((l) => l === "")).toBe(true)
    })

    it("accepts partial input with missing comments", () => {
      const partial: Partial<PoFile> = {
        headers: { Language: "de" },
        items: []
      }

      const output = stringifyPo(partial)

      expect(output).toContain('"Language: de\\n"')
    })

    it("accepts partial input with missing headers", () => {
      const partial: Partial<PoFile> = {
        items: []
      }

      const output = stringifyPo(partial)

      expect(output).toContain('msgid ""')
      expect(output).toContain('msgstr ""')
    })

    it("accepts partial input with missing items", () => {
      const partial: Partial<PoFile> = {
        headers: { Language: "de" }
      }

      const output = stringifyPo(partial)

      expect(output).toContain('"Language: de\\n"')
    })

    it("accepts empty partial input", () => {
      const output = stringifyPo({})

      expect(output).toContain('msgid ""')
      expect(output).toContain('msgstr ""')
    })

    it("respects foldLength option", () => {
      const po = createPoFile()
      const item = createItem()
      item.msgid = "A".repeat(100)
      item.msgstr = ["B".repeat(100)]
      po.items = [item]

      const folded = stringifyPo(po, { foldLength: 40 })
      const unfolded = stringifyPo(po, { foldLength: 0 })

      // Folded output should have more lines
      expect(folded.split("\n").length).toBeGreaterThan(unfolded.split("\n").length)
    })

    it("respects compactMultiline option", () => {
      const po = createPoFile()
      const item = createItem()
      item.msgid = "Line1\nLine2"
      item.msgstr = ["Zeile1\nZeile2"]
      po.items = [item]

      const compact = stringifyPo(po, { compactMultiline: true })
      const traditional = stringifyPo(po, { compactMultiline: false })

      // Traditional format starts with empty msgid ""
      expect(traditional).toContain('msgid ""\n"Line1')
      // Compact format starts with content
      expect(compact).toContain('msgid "Line1')
    })
  })
})
