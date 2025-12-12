import { describe, it, expect } from "vitest"
import { generateMessageId, generateMessageIdSync, generateMessageIds } from "./messageId"

/** Base64URL pattern: A-Z, a-z, 0-9, -, _ */
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]{8}$/

describe("generateMessageId", () => {
  it("generates an 8-character Base64URL ID", async () => {
    const id = await generateMessageId("Hello")

    expect(id).toMatch(BASE64URL_PATTERN)
    expect(id).toHaveLength(8)
  })

  it("generates consistent IDs for same input", async () => {
    const id1 = await generateMessageId("Hello World")
    const id2 = await generateMessageId("Hello World")

    expect(id1).toBe(id2)
  })

  it("generates different IDs for different inputs", async () => {
    const id1 = await generateMessageId("Hello")
    const id2 = await generateMessageId("World")

    expect(id1).not.toBe(id2)
  })

  it("includes context in hash", async () => {
    const id1 = await generateMessageId("Open")
    const id2 = await generateMessageId("Open", "menu.file")
    const id3 = await generateMessageId("Open", "dialog.button")

    expect(id1).not.toBe(id2)
    expect(id2).not.toBe(id3)
    expect(id1).not.toBe(id3)
  })

  it("handles empty string", async () => {
    const id = await generateMessageId("")

    expect(id).toMatch(BASE64URL_PATTERN)
  })

  it("handles unicode characters", async () => {
    const id = await generateMessageId("Привет мир 🌍")

    expect(id).toMatch(BASE64URL_PATTERN)
  })

  it("handles special characters", async () => {
    const id = await generateMessageId("Hello {name}, you have {count} messages!")

    expect(id).toMatch(BASE64URL_PATTERN)
  })
})

describe("generateMessageIdSync", () => {
  it("generates an 8-character Base64URL ID", () => {
    const id = generateMessageIdSync("Hello")

    expect(id).toMatch(BASE64URL_PATTERN)
    expect(id).toHaveLength(8)
  })

  it("generates consistent IDs for same input", () => {
    const id1 = generateMessageIdSync("Hello World")
    const id2 = generateMessageIdSync("Hello World")

    expect(id1).toBe(id2)
  })

  it("generates same ID as async version", async () => {
    const syncId = generateMessageIdSync("Hello World")
    const asyncId = await generateMessageId("Hello World")

    expect(syncId).toBe(asyncId)
  })

  it("includes context in hash", () => {
    const id1 = generateMessageIdSync("Open")
    const id2 = generateMessageIdSync("Open", "menu.file")

    expect(id1).not.toBe(id2)
  })
})

describe("generateMessageIds", () => {
  it("generates IDs for multiple messages", async () => {
    const ids = await generateMessageIds(["Hello", "World"])

    expect(ids.size).toBe(2)
    expect(ids.get("Hello")).toMatch(BASE64URL_PATTERN)
    expect(ids.get("World")).toMatch(BASE64URL_PATTERN)
  })

  it("handles mixed string and object inputs", async () => {
    const ids = await generateMessageIds(["Hello", { message: "Open", context: "menu.file" }])

    expect(ids.size).toBe(2)
    expect(ids.get("Hello")).toBeDefined()
    expect(ids.get("Open\u0004menu.file")).toBeDefined()
  })

  it("handles empty array", async () => {
    const ids = await generateMessageIds([])

    expect(ids.size).toBe(0)
  })

  it("generates consistent IDs", async () => {
    const ids1 = await generateMessageIds(["Hello", "World"])
    const ids2 = await generateMessageIds(["Hello", "World"])

    expect(ids1.get("Hello")).toBe(ids2.get("Hello"))
    expect(ids1.get("World")).toBe(ids2.get("World"))
  })
})
