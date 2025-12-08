import { describe, it, expect, beforeAll } from "vitest"
import { PO } from "../src/index"

describe("Headers", () => {
  let po: PO

  beforeAll(async () => {
    po = await PO.load(__dirname + "/fixtures/big.po")
  })

  it("parses the po file", () => {
    expect(po).not.toBeNull()
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

describe("PO files with no headers", () => {
  it("parses an empty string", () => {
    const po = PO.parse("")
    expect(po).not.toBeNull()
    // All headers should be empty
    for (const key in po.headers) {
      expect(po.headers[key]).toBe("")
    }
    expect(po.items.length).toBe(0)
  })

  it("parses a minimal example", () => {
    const po = PO.parse('msgid "minimal PO"\nmsgstr ""')
    expect(po).not.toBeNull()
    // All headers should be empty
    for (const key in po.headers) {
      expect(po.headers[key]).toBe("")
    }
    expect(po.items.length).toBe(1)
  })

  describe("advanced example", () => {
    let po: PO

    beforeAll(async () => {
      po = await PO.load(__dirname + "/fixtures/no_header.po")
    })

    it("parses the po file", () => {
      expect(po).not.toBeNull()
    })

    it("finds all items", () => {
      expect(po.items.length).toBe(2)
    })
  })

  describe("advanced example with extra spaces", () => {
    let po: PO

    beforeAll(async () => {
      po = await PO.load(__dirname + "/fixtures/no_header_extra_spaces.po")
    })

    it("parses the po file", () => {
      expect(po).not.toBeNull()
    })

    it("finds all items", () => {
      expect(po.items.length).toBe(2)
    })
  })
})
