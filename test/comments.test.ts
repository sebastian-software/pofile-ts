import { describe, it, expect, beforeAll } from "vitest"
import { PO } from "../src/po"

describe("Comments", () => {
  let po: PO

  beforeAll(async () => {
    po = await new Promise<PO>((resolve, reject) => {
      PO.load(__dirname + "/fixtures/big.po", (err, result) => {
        if (err) {
          reject(err)
          return
        }
        if (result) {
          resolve(result)
        }
      })
    })
  })

  it("parses the po file", () => {
    expect(po).not.toBeNull()
  })

  it("parses the comments", () => {
    expect(po.comments.length).toBe(3)
    expect(po.comments[0]).toBe("French translation of Link (6.x-2.9)")
    expect(po.comments[1]).toBe("Copyright (c) 2011 by the French translation team")
    expect(po.comments[2]).toBe("")
  })
})
