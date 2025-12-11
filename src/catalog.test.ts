import { describe, it, expect } from "vitest"
import { catalogToItems, itemsToCatalog, mergeCatalogs, type Catalog } from "./catalog"
import { createItem } from "./Item"

describe("catalogToItems", () => {
  it("converts simple catalog to items", () => {
    const catalog: Catalog = {
      Hello: { translation: "Hallo" },
      World: { translation: "Welt" }
    }

    const items = catalogToItems(catalog)

    expect(items).toHaveLength(2)
    expect(items[0].msgid).toBe("Hello")
    expect(items[0].msgstr).toEqual(["Hallo"])
    expect(items[1].msgid).toBe("World")
    expect(items[1].msgstr).toEqual(["Welt"])
  })

  it("uses explicit message when provided", () => {
    const catalog: Catalog = {
      greeting_id: {
        message: "Hello {name}",
        translation: "Hallo {name}"
      }
    }

    const items = catalogToItems(catalog)

    expect(items[0].msgid).toBe("Hello {name}")
  })

  it("handles plural translations", () => {
    const catalog: Catalog = {
      "{count} item": {
        translation: ["{count} Element", "{count} Elemente"],
        pluralSource: "{count} items"
      }
    }

    const items = catalogToItems(catalog)

    expect(items[0].msgid).toBe("{count} item")
    expect(items[0].msgid_plural).toBe("{count} items")
    expect(items[0].msgstr).toEqual(["{count} Element", "{count} Elemente"])
  })

  it("handles context", () => {
    const catalog: Catalog = {
      Open: {
        translation: "Öffnen",
        context: "menu.file"
      }
    }

    const items = catalogToItems(catalog)

    expect(items[0].msgctxt).toBe("menu.file")
  })

  it("handles comments", () => {
    const catalog: Catalog = {
      Hello: {
        translation: "Hallo",
        comments: ["Translator note"],
        extractedComments: ["From source code"]
      }
    }

    const items = catalogToItems(catalog)

    expect(items[0].comments).toEqual(["Translator note"])
    expect(items[0].extractedComments).toEqual(["From source code"])
  })

  it("handles origins", () => {
    const catalog: Catalog = {
      Hello: {
        translation: "Hallo",
        origins: [
          { file: "src/App.tsx", line: 42 },
          { file: "src/utils.ts", line: 10 }
        ]
      }
    }

    const items = catalogToItems(catalog)

    expect(items[0].references).toEqual(["src/App.tsx:42", "src/utils.ts:10"])
  })

  it("excludes origins when includeOrigins is false", () => {
    const catalog: Catalog = {
      Hello: {
        translation: "Hallo",
        origins: [{ file: "src/App.tsx", line: 42 }]
      }
    }

    const items = catalogToItems(catalog, { includeOrigins: false })

    expect(items[0].references).toEqual([])
  })

  it("excludes line numbers when includeLineNumbers is false", () => {
    const catalog: Catalog = {
      Hello: {
        translation: "Hallo",
        origins: [{ file: "src/App.tsx", line: 42 }]
      }
    }

    const items = catalogToItems(catalog, { includeLineNumbers: false })

    expect(items[0].references).toEqual(["src/App.tsx"])
  })

  it("handles obsolete entries", () => {
    const catalog: Catalog = {
      OldMessage: {
        translation: "Alte Nachricht",
        obsolete: true
      }
    }

    const items = catalogToItems(catalog)

    expect(items[0].obsolete).toBe(true)
  })

  it("handles flags", () => {
    const catalog: Catalog = {
      Hello: {
        translation: "Hallo",
        flags: { fuzzy: true }
      }
    }

    const items = catalogToItems(catalog)

    expect(items[0].flags).toEqual({ fuzzy: true })
  })

  it("respects nplurals option", () => {
    const catalog: Catalog = {
      Hello: { translation: "Hallo" }
    }

    const items = catalogToItems(catalog, { nplurals: 3 })

    expect(items[0].nplurals).toBe(3)
  })
})

describe("itemsToCatalog", () => {
  it("converts simple items to catalog", () => {
    const items = [
      { ...createItem(), msgid: "Hello", msgstr: ["Hallo"] },
      { ...createItem(), msgid: "World", msgstr: ["Welt"] }
    ]

    const catalog = itemsToCatalog(items)

    expect(catalog.Hello).toEqual({ translation: "Hallo" })
    expect(catalog.World).toEqual({ translation: "Welt" })
  })

  it("skips header item (empty msgid)", () => {
    const items = [
      { ...createItem(), msgid: "", msgstr: ["header content"] },
      { ...createItem(), msgid: "Hello", msgstr: ["Hallo"] }
    ]

    const catalog = itemsToCatalog(items)

    expect(Object.keys(catalog)).toEqual(["Hello"])
  })

  it("handles plural items", () => {
    const item = {
      ...createItem(),
      msgid: "{count} item",
      msgid_plural: "{count} items",
      msgstr: ["{count} Element", "{count} Elemente"]
    }

    const catalog = itemsToCatalog([item])

    expect(catalog["{count} item"]).toEqual({
      translation: ["{count} Element", "{count} Elemente"],
      pluralSource: "{count} items"
    })
  })

  it("handles context", () => {
    const item = {
      ...createItem(),
      msgid: "Open",
      msgctxt: "menu.file",
      msgstr: ["Öffnen"]
    }

    const catalog = itemsToCatalog([item])

    expect(catalog.Open.context).toBe("menu.file")
  })

  it("handles comments", () => {
    const item = {
      ...createItem(),
      msgid: "Hello",
      msgstr: ["Hallo"],
      comments: ["Translator note"],
      extractedComments: ["From source"]
    }

    const catalog = itemsToCatalog([item])

    expect(catalog.Hello.comments).toEqual(["Translator note"])
    expect(catalog.Hello.extractedComments).toEqual(["From source"])
  })

  it("handles references as origins", () => {
    const item = {
      ...createItem(),
      msgid: "Hello",
      msgstr: ["Hallo"],
      references: ["src/App.tsx:42", "src/utils.ts:10"]
    }

    const catalog = itemsToCatalog([item])

    expect(catalog.Hello.origins).toEqual([
      { file: "src/App.tsx", line: 42 },
      { file: "src/utils.ts", line: 10 }
    ])
  })

  it("excludes origins when includeOrigins is false", () => {
    const item = {
      ...createItem(),
      msgid: "Hello",
      msgstr: ["Hallo"],
      references: ["src/App.tsx:42"]
    }

    const catalog = itemsToCatalog([item], { includeOrigins: false })

    expect(catalog.Hello.origins).toBeUndefined()
  })

  it("handles obsolete items", () => {
    const item = {
      ...createItem(),
      msgid: "OldMessage",
      msgstr: ["Alte Nachricht"],
      obsolete: true
    }

    const catalog = itemsToCatalog([item])

    expect(catalog.OldMessage.obsolete).toBe(true)
  })

  it("handles flags", () => {
    const item = {
      ...createItem(),
      msgid: "Hello",
      msgstr: ["Hallo"],
      flags: { fuzzy: true }
    }

    const catalog = itemsToCatalog([item])

    expect(catalog.Hello.flags).toEqual({ fuzzy: true })
  })

  it("uses custom key generator", () => {
    const item = {
      ...createItem(),
      msgid: "Hello World",
      msgstr: ["Hallo Welt"]
    }

    const catalog = itemsToCatalog([item], {
      useMsgidAsKey: false,
      keyGenerator: (item) => `key_${item.msgid.replace(/\s+/g, "_")}`
    })

    expect(catalog["key_Hello_World"]).toBeDefined()
    expect(catalog["key_Hello_World"].message).toBe("Hello World")
  })
})

describe("mergeCatalogs", () => {
  it("merges two catalogs", () => {
    const base: Catalog = {
      Hello: { translation: "Hallo" },
      World: { translation: "Welt" }
    }

    const updates: Catalog = {
      World: { translation: "Welt!" },
      New: { translation: "Neu" }
    }

    const merged = mergeCatalogs(base, updates)

    expect(merged.Hello.translation).toBe("Hallo")
    expect(merged.World.translation).toBe("Welt!")
    expect(merged.New.translation).toBe("Neu")
  })

  it("merges flags from both catalogs", () => {
    const base: Catalog = {
      Hello: { translation: "Hallo", flags: { fuzzy: true } }
    }

    const updates: Catalog = {
      Hello: { translation: "Hallo", flags: { reviewed: true } }
    }

    const merged = mergeCatalogs(base, updates)

    expect(merged.Hello.flags).toEqual({ fuzzy: true, reviewed: true })
  })

  it("preserves comments from base when not in update", () => {
    const base: Catalog = {
      Hello: { translation: "Hallo", comments: ["Original comment"] }
    }

    const updates: Catalog = {
      Hello: { translation: "Hallo!" }
    }

    const merged = mergeCatalogs(base, updates)

    expect(merged.Hello.comments).toEqual(["Original comment"])
    expect(merged.Hello.translation).toBe("Hallo!")
  })

  it("replaces comments when provided in update", () => {
    const base: Catalog = {
      Hello: { translation: "Hallo", comments: ["Old comment"] }
    }

    const updates: Catalog = {
      Hello: { translation: "Hallo", comments: ["New comment"] }
    }

    const merged = mergeCatalogs(base, updates)

    expect(merged.Hello.comments).toEqual(["New comment"])
  })

  it("does not mutate original catalogs", () => {
    const base: Catalog = {
      Hello: { translation: "Hallo" }
    }

    const updates: Catalog = {
      Hello: { translation: "Hallo!" }
    }

    mergeCatalogs(base, updates)

    expect(base.Hello.translation).toBe("Hallo")
    expect(updates.Hello.translation).toBe("Hallo!")
  })
})
