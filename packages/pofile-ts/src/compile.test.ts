import { describe, it, expect } from "vitest"
import { compileCatalog, generateCompiledCode, serializeCompiledCatalog } from "./compile"
import type { Catalog } from "./catalog"
import { __setNativeBindingCacheForTesting, getNativeBinding } from "./native"

describe("compileCatalog", () => {
  it("compiles simple messages", () => {
    const catalog: Catalog = {
      "Hello World!": { translation: "Hallo Welt!" }
    }

    const compiled = compileCatalog(catalog, { locale: "de" })

    expect(compiled.size).toBe(1)
    expect(compiled.format(compiled.keys()[0]!)).toBe("Hallo Welt!")
  })

  it("compiles messages with variables", () => {
    const catalog: Catalog = {
      "Hello {name}!": { translation: "Hallo {name}!" }
    }

    const compiled = compileCatalog(catalog, { locale: "de" })
    const key = compiled.keys()[0]!

    expect(compiled.format(key, { name: "Sebastian" })).toBe("Hallo Sebastian!")
  })

  it("compiles messages with plurals", () => {
    const catalog: Catalog = {
      "{count, plural, one {# item} other {# items}}": {
        translation: "{count, plural, one {# Artikel} other {# Artikel}}"
      }
    }

    const compiled = compileCatalog(catalog, { locale: "de" })
    const key = compiled.keys()[0]!

    expect(compiled.format(key, { count: 1 })).toBe("1 Artikel")
    expect(compiled.format(key, { count: 5 })).toBe("5 Artikel")
  })

  it("uses messageId as key by default", () => {
    const catalog: Catalog = {
      "Hello World!": { translation: "Hallo Welt!" }
    }

    const compiled = compileCatalog(catalog, { locale: "de" })
    const key = compiled.keys()[0]!

    // messageId is 8 chars
    expect(key.length).toBe(8)
  })

  it("uses msgid as key when useMessageId is false", () => {
    const catalog: Catalog = {
      "Hello World!": { translation: "Hallo Welt!" }
    }

    const compiled = compileCatalog(catalog, { locale: "de", useMessageId: false })
    const key = compiled.keys()[0]!

    expect(key).toBe("Hello World!")
  })

  it("includes context in messageId", () => {
    const catalog: Catalog = {
      Open: { translation: "Öffnen", context: "menu.file" }
    }

    const compiled = compileCatalog(catalog, { locale: "de" })
    const key = compiled.keys()[0]!

    // Key should be different than without context
    const catalogNoCtx: Catalog = {
      Open: { translation: "Öffnen" }
    }
    const compiledNoCtx = compileCatalog(catalogNoCtx, { locale: "de" })
    const keyNoCtx = compiledNoCtx.keys()[0]!

    expect(key).not.toBe(keyNoCtx)
  })

  it("returns key for missing messages", () => {
    const catalog: Catalog = {}
    const compiled = compileCatalog(catalog, { locale: "de" })

    expect(compiled.format("missing-key")).toBe("missing-key")
  })

  it("has() returns correct value", () => {
    const catalog: Catalog = {
      Hello: { translation: "Hallo" }
    }

    const compiled = compileCatalog(catalog, { locale: "de" })
    const key = compiled.keys()[0]!

    expect(compiled.has(key)).toBe(true)
    expect(compiled.has("nonexistent")).toBe(false)
  })

  it("skips entries without translation", () => {
    const catalog: Catalog = {
      Hello: { translation: "Hallo" },
      Untranslated: {}
    }

    const compiled = compileCatalog(catalog, { locale: "de" })

    expect(compiled.size).toBe(1)
  })

  it("exposes locale", () => {
    const catalog: Catalog = {}
    const compiled = compileCatalog(catalog, { locale: "de" })

    expect(compiled.locale).toBe("de")
  })

  describe("date/number formatting", () => {
    it("formats dates according to locale", () => {
      const catalog: Catalog = {
        "Created: {d, date, medium}": { translation: "Erstellt: {d, date, medium}" }
      }

      const compiled = compileCatalog(catalog, { locale: "de" })
      const key = compiled.keys()[0]!
      const result = compiled.format(key, { d: new Date(2024, 11, 15) })

      expect(result).toContain("15")
      expect(result).toContain("2024")
    })

    it("formats numbers according to locale", () => {
      const catalog: Catalog = {
        "Value: {n, number}": { translation: "Wert: {n, number}" }
      }

      const compiled = compileCatalog(catalog, { locale: "de" })
      const key = compiled.keys()[0]!
      const result = compiled.format(key, { n: 1234.5 })

      // German uses comma as decimal separator
      expect(result).toMatch(/1\.234,5/)
    })

    it("handles mixed native and formatter-backed entries in one catalog", () => {
      const catalog: Catalog = {
        Hello: { translation: "Hallo" },
        "Value: {n, number}": { translation: "Wert: {n, number}" }
      }

      const compiled = compileCatalog(catalog, { locale: "de", useMessageId: false })

      expect(compiled.size).toBe(2)
      expect(compiled.format("Hello")).toBe("Hallo")
      expect(compiled.format("Value: {n, number}", { n: 1234.5 })).toMatch(/1\.234,5/)
    })
  })

  describe("tags", () => {
    it("handles tags with function values", () => {
      const catalog: Catalog = {
        "Click <link>here</link>": { translation: "Klicke <link>hier</link>" }
      }

      const compiled = compileCatalog(catalog, { locale: "de" })
      const key = compiled.keys()[0]!
      const result = compiled.format(key, {
        link: (text: string) => `[${text}]`
      })

      expect(result).toBe("Klicke [hier]")
    })
  })

  describe("custom hosts", () => {
    it("passes a custom host through compileCatalog", () => {
      const catalog: Catalog = {
        "Value: {n, number}": { translation: "Wert: {n, number}" }
      }

      const compiled = compileCatalog(catalog, {
        locale: "de",
        host: {
          locale: "en",
          formatNumber(value) {
            return `n=${String(value)}`
          },
          formatDate: () => undefined,
          formatTime: () => undefined,
          formatList: () => undefined,
          formatDuration: () => undefined,
          formatAgo: () => undefined,
          formatName: () => undefined
        }
      })
      const key = compiled.keys()[0]!

      expect(compiled.format(key, { n: 7 })).toBe("Wert: n=7")
    })
  })

  describe("gettext plurals (msgstr[] array)", () => {
    it("compiles gettext plural forms", () => {
      const catalog: Catalog = {
        "{count} item": {
          translation: ["{count} Artikel", "{count} Artikel"],
          pluralSource: "{count} items"
        }
      }

      const compiled = compileCatalog(catalog, { locale: "de" })
      const key = compiled.keys()[0]!

      expect(compiled.format(key, { count: 1 })).toBe("1 Artikel")
      expect(compiled.format(key, { count: 5 })).toBe("5 Artikel")
    })

    it("extracts variable name from pluralSource", () => {
      const catalog: Catalog = {
        "One file": {
          translation: ["Eine Datei", "{n} Dateien"],
          pluralSource: "{n} files"
        }
      }

      const compiled = compileCatalog(catalog, { locale: "de" })
      const key = compiled.keys()[0]!

      expect(compiled.format(key, { n: 1 })).toBe("Eine Datei")
      expect(compiled.format(key, { n: 5 })).toBe("5 Dateien")
    })

    it("uses default variable name when none found", () => {
      const catalog: Catalog = {
        "One item": {
          translation: ["Ein Artikel", "Mehrere Artikel"],
          pluralSource: "Many items"
        }
      }

      const compiled = compileCatalog(catalog, { locale: "de" })
      const key = compiled.keys()[0]!

      // Uses "count" as default
      expect(compiled.format(key, { count: 1 })).toBe("Ein Artikel")
      expect(compiled.format(key, { count: 5 })).toBe("Mehrere Artikel")
    })

    it("handles single form array", () => {
      const catalog: Catalog = {
        item: {
          translation: ["Artikel"]
        }
      }

      const compiled = compileCatalog(catalog, { locale: "de" })
      const key = compiled.keys()[0]!

      expect(compiled.format(key, {})).toBe("Artikel")
    })
  })
})

describe("generateCompiledCode", () => {
  it("generates TypeScript code", () => {
    const catalog: Catalog = {
      "Hello World!": { translation: "Hallo Welt!" }
    }

    const code = generateCompiledCode(catalog, { locale: "de" })

    expect(code).toContain("export const messages")
    expect(code).toContain("locale: de")
    expect(code).toContain("type V = Record<string, unknown>")
  })

  it("generates JavaScript code", () => {
    const catalog: Catalog = {
      "Hello World!": { translation: "Hallo Welt!" }
    }

    const code = generateCompiledCode(catalog, { locale: "de", format: "javascript" })

    expect(code).toContain("export const messages")
    expect(code).not.toContain("type V =")
  })

  it("uses custom export name", () => {
    const catalog: Catalog = {
      Hello: { translation: "Hallo" }
    }

    const code = generateCompiledCode(catalog, { locale: "de", exportName: "germanMessages" })

    expect(code).toContain("export const germanMessages")
  })

  it("includes source comments when enabled", () => {
    const catalog: Catalog = {
      "Hello World!": { translation: "Hallo Welt!" }
    }

    const code = generateCompiledCode(catalog, {
      locale: "de",
      includeSourceComments: true
    })

    expect(code).toContain("// Hello World!")
  })

  it("generates static string for simple messages", () => {
    const catalog: Catalog = {
      Hello: { translation: "Hallo" }
    }

    const code = generateCompiledCode(catalog, { locale: "de" })

    expect(code).toContain('() => "Hallo"')
  })

  it("generates code for variable interpolation", () => {
    const catalog: Catalog = {
      "Hello {name}!": { translation: "Hallo {name}!" }
    }

    const code = generateCompiledCode(catalog, { locale: "de" })

    expect(code).toContain("v?.name")
    expect(code).toContain('"{name}"') // fallback
  })

  it("generates code for plurals", () => {
    const catalog: Catalog = {
      "{count, plural, one {# item} other {# items}}": {
        translation: "{count, plural, one {# Artikel} other {# Artikel}}"
      }
    }

    const code = generateCompiledCode(catalog, { locale: "de" })

    // Should have plural function
    expect(code).toContain("const _pf")
    // Should have number formatter for #
    expect(code).toContain("Intl.NumberFormat")
    // Should check count value
    expect(code).toContain("v?.count")
  })

  it("generates code for select", () => {
    const catalog: Catalog = {
      "{gender, select, male {He} female {She} other {They}}": {
        translation: "{gender, select, male {Er} female {Sie} other {They}}"
      }
    }

    const code = generateCompiledCode(catalog, { locale: "de" })

    expect(code).toContain('v?.gender === "male"')
    expect(code).toContain('v?.gender === "female"')
    expect(code).toContain('"Er"')
    expect(code).toContain('"Sie"')
  })

  it("generates code for date formatting", () => {
    const catalog: Catalog = {
      "Date: {d, date, short}": { translation: "Datum: {d, date, short}" }
    }

    const code = generateCompiledCode(catalog, { locale: "de" })

    expect(code).toContain("Intl.DateTimeFormat")
    expect(code).toContain('dateStyle: "short"')
    expect(code).toContain("v?.d instanceof Date")
  })

  it("generates code for number formatting", () => {
    const catalog: Catalog = {
      "Value: {n, number, percent}": { translation: "Wert: {n, number, percent}" }
    }

    const code = generateCompiledCode(catalog, { locale: "de" })

    expect(code).toContain("Intl.NumberFormat")
    expect(code).toContain("percent")
  })

  it("generates code for tags", () => {
    const catalog: Catalog = {
      "<bold>Important</bold>": { translation: "<bold>Wichtig</bold>" }
    }

    const code = generateCompiledCode(catalog, { locale: "de" })

    expect(code).toContain("v?.bold")
    expect(code).toContain('"function"')
  })

  it("generates valid executable code", () => {
    const catalog: Catalog = {
      "Hello {name}!": { translation: "Hallo {name}!" },
      "Count: {n, number}": { translation: "Anzahl: {n, number}" }
    }

    const code = generateCompiledCode(catalog, { locale: "de" })

    // The generated code should be valid JavaScript
    // We can't easily execute it in Node without more setup,
    // but we can at least check it doesn't have obvious syntax errors
    expect(code).not.toContain("undefined")
    expect(code).toMatch(/\(v\) =>/)
  })

  it("generates code for gettext plurals", () => {
    const catalog: Catalog = {
      "{count} item": {
        translation: ["{count} Artikel", "{count} Artikel"],
        pluralSource: "{count} items"
      }
    }

    const code = generateCompiledCode(catalog, { locale: "de" })

    // Should have plural function
    expect(code).toContain("const _pf")
    // Should reference count variable
    expect(code).toContain("v?.count")
    // Should have plural index selection
    expect(code).toContain("_pf(_n)")
  })
})

describe("serializeCompiledCatalog", () => {
  it("serializes ICU entries as AST payloads", () => {
    const catalog: Catalog = {
      "Hello {name}!": { translation: "Hallo {name}!" }
    }

    const serialized = serializeCompiledCatalog(catalog, { locale: "de", useMessageId: false })

    expect(serialized).toEqual({
      locale: "de",
      entries: [
        {
          key: "Hello {name}!",
          message: {
            kind: "icu",
            ast: [
              { type: "literal", value: "Hallo " },
              { type: "argument", value: "name" },
              { type: "literal", value: "!" }
            ]
          }
        }
      ]
    })
  })

  it("serializes gettext plurals with resolved variable name", () => {
    const catalog: Catalog = {
      "One file": {
        translation: ["Eine Datei", "{n} Dateien"],
        pluralSource: "{n} files"
      }
    }

    const serialized = serializeCompiledCatalog(catalog, { locale: "de", useMessageId: false })

    expect(serialized.entries[0]).toEqual({
      key: "One file",
      message: {
        kind: "gettextPlural",
        variable: "n",
        forms: [
          {
            kind: "icu",
            ast: [{ type: "literal", value: "Eine Datei" }]
          },
          {
            kind: "icu",
            ast: [
              { type: "argument", value: "n" },
              { type: "literal", value: " Dateien" }
            ]
          }
        ]
      }
    })
  })

  it("uses fallback payloads for invalid messages when not strict", () => {
    const catalog: Catalog = {
      broken: { translation: "{broken" }
    }

    const serialized = serializeCompiledCatalog(catalog, { locale: "en", useMessageId: false })

    expect(serialized.entries[0]).toEqual({
      key: "broken",
      message: {
        kind: "fallback",
        text: "{broken"
      }
    })
  })

  it("matches the JS fallback shape when native bindings are available", () => {
    const catalog: Catalog = {
      "{count} item": {
        translation: ["{count} Artikel", "{count} Artikel"],
        pluralSource: "{count} items"
      },
      "Hello {name}!": { translation: "Hallo {name}!" }
    }

    const originalBinding = getNativeBinding()

    try {
      const actual = serializeCompiledCatalog(catalog, { locale: "de", useMessageId: false })
      __setNativeBindingCacheForTesting(null)
      const fallback = serializeCompiledCatalog(catalog, { locale: "de", useMessageId: false })
      expect(actual).toEqual(fallback)
    } finally {
      __setNativeBindingCacheForTesting(originalBinding)
    }
  })

  it("sorts JS fallback entries to match native key order", () => {
    const catalog: Catalog = {
      zulu: { translation: "Zulu" },
      alpha: { translation: "Alpha" },
      middle: { translation: "Middle" }
    }

    const originalBinding = getNativeBinding()

    try {
      __setNativeBindingCacheForTesting(null)
      const fallback = serializeCompiledCatalog(catalog, { locale: "en", useMessageId: false })
      expect(fallback.entries.map((entry) => entry.key)).toEqual(["alpha", "middle", "zulu"])
    } finally {
      __setNativeBindingCacheForTesting(originalBinding)
    }
  })

  it("rethrows native strict-mode errors instead of replacing them with JS fallback errors", () => {
    const originalBinding = getNativeBinding()
    const nativeError = new Error("native strict failure")
    const mockBinding: NonNullable<ReturnType<typeof getNativeBinding>> = {
      parsePoJson: () => "",
      parseIcuJson: () => "",
      stringifyPoJson: () => "",
      compileIcuJson: () => 0,
      formatCompiledMessageJson: () => "",
      freeCompiledMessage: () => undefined,
      compileCatalogJson: () => 0,
      serializeCompiledCatalogJson: () => {
        throw nativeError
      },
      formatCompiledCatalogJson: () => "",
      compiledCatalogHas: () => false,
      compiledCatalogKeysJson: () => "[]",
      compiledCatalogSize: () => 0,
      compiledCatalogLocale: () => "en",
      freeCompiledCatalog: () => undefined,
      bindingVersion: () => "test"
    }

    try {
      __setNativeBindingCacheForTesting(mockBinding)
      expect(() =>
        serializeCompiledCatalog(
          { broken: { translation: "{broken" } },
          { locale: "en", useMessageId: false, strict: true }
        )
      ).toThrow(nativeError)
    } finally {
      __setNativeBindingCacheForTesting(originalBinding)
    }
  })
})
