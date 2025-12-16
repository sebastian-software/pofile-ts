import { describe, it, expect } from "vitest"
import {
  extractPluralVariable,
  safeVarName,
  sanitizeStyle,
  escapeTemplateString,
  escapeComment,
  getNumberOptionsForStyle,
  generatePluralFunctionCode,
  generateFormatterDeclarations,
  createCodeGenContext,
  generateNodesCode,
  generateNodeCode
} from "./codegen"
import type { IcuNode, IcuLiteralNode, IcuArgumentNode } from "../icu/types"

describe("codegen", () => {
  describe("extractPluralVariable", () => {
    it("extracts variable from msgid_plural first", () => {
      const result = extractPluralVariable("{count} item", "{count} items")
      expect(result).toBe("count")
    })

    it("falls back to msgid if no variable in plural", () => {
      const result = extractPluralVariable("{n} item", "items")
      expect(result).toBe("n")
    })

    it("returns null when no variable found", () => {
      const result = extractPluralVariable("One item", "Many items")
      expect(result).toBeNull()
    })

    it("handles ICU-style variables with formats", () => {
      const result = extractPluralVariable("{count, number} item", "{count, number} items")
      expect(result).toBe("count")
    })

    it("handles underscore in variable names", () => {
      const result = extractPluralVariable("{item_count} items")
      expect(result).toBe("item_count")
    })

    it("handles dollar sign in variable names", () => {
      const result = extractPluralVariable("{$count} items")
      expect(result).toBe("$count")
    })
  })

  describe("safeVarName", () => {
    it("returns simple names unchanged", () => {
      expect(safeVarName("count")).toBe("count")
      expect(safeVarName("userName")).toBe("userName")
      expect(safeVarName("_private")).toBe("_private")
      expect(safeVarName("$special")).toBe("$special")
    })

    it("wraps names with special characters in brackets", () => {
      expect(safeVarName("user-name")).toBe('["user-name"]')
      expect(safeVarName("user.name")).toBe('["user.name"]')
      expect(safeVarName("123")).toBe('["123"]')
      expect(safeVarName("hello world")).toBe('["hello world"]')
    })

    it("wraps names starting with numbers", () => {
      expect(safeVarName("0")).toBe('["0"]')
      expect(safeVarName("1st")).toBe('["1st"]')
    })
  })

  describe("sanitizeStyle", () => {
    it("replaces non-alphanumeric characters with underscores", () => {
      expect(sanitizeStyle("currency/EUR")).toBe("currency_EUR")
      expect(sanitizeStyle("::compact-short")).toBe("compact_short")
    })

    it("removes leading and trailing underscores", () => {
      expect(sanitizeStyle("::style")).toBe("style")
      expect(sanitizeStyle("style::")).toBe("style")
    })

    it("handles simple styles unchanged", () => {
      expect(sanitizeStyle("short")).toBe("short")
      expect(sanitizeStyle("medium")).toBe("medium")
    })
  })

  describe("escapeTemplateString", () => {
    it("escapes backticks", () => {
      expect(escapeTemplateString("hello`world")).toBe("hello\\`world")
    })

    it("escapes template literal placeholders", () => {
      expect(escapeTemplateString("${value}")).toBe("\\${value}")
    })

    it("escapes backslashes", () => {
      expect(escapeTemplateString("path\\to\\file")).toBe("path\\\\to\\\\file")
    })

    it("handles multiple escapes", () => {
      expect(escapeTemplateString("`${a}`")).toBe("\\`\\${a}\\`")
    })
  })

  describe("escapeComment", () => {
    it("escapes comment end sequences", () => {
      expect(escapeComment("test */ code")).toBe("test * / code")
    })

    it("replaces newlines with spaces", () => {
      expect(escapeComment("line1\nline2")).toBe("line1 line2")
    })

    it("handles both escapes together", () => {
      expect(escapeComment("end */\nnew line")).toBe("end * / new line")
    })
  })

  describe("getNumberOptionsForStyle", () => {
    it("returns percent style options", () => {
      expect(getNumberOptionsForStyle("percent")).toEqual({ style: "percent" })
    })

    it("returns currency style options with USD default", () => {
      expect(getNumberOptionsForStyle("currency")).toEqual({
        style: "currency",
        currency: "USD"
      })
    })

    it("returns empty object for unknown styles", () => {
      expect(getNumberOptionsForStyle("unknown")).toEqual({})
      expect(getNumberOptionsForStyle("")).toEqual({})
    })
  })

  describe("generatePluralFunctionCode", () => {
    it("generates simple function for single category", () => {
      const code = generatePluralFunctionCode("zh", ["other"])
      expect(code).toBe("const _pf = () => 0")
    })

    it("generates inline function for one/other pattern", () => {
      const code = generatePluralFunctionCode("en", ["one", "other"])
      expect(code).toBe("const _pf = (n) => n !== 1 ? 1 : 0")
    })

    it("generates Intl.PluralRules for complex patterns", () => {
      const code = generatePluralFunctionCode("ru", ["one", "few", "many", "other"])
      expect(code).toContain('new Intl.PluralRules("ru")')
      expect(code).toContain("_pr.select(n)")
    })
  })

  describe("generateFormatterDeclarations", () => {
    const emptyFormatters = {
      number: new Set<string>(),
      date: new Set<string>(),
      time: new Set<string>(),
      list: new Set<string>(),
      relativeTime: new Set<string>(),
      displayNames: new Set<string>()
    }

    it("returns null when no formatters used", () => {
      expect(generateFormatterDeclarations("en", emptyFormatters)).toBeNull()
    })

    it("generates number formatter without style", () => {
      const used = { ...emptyFormatters, number: new Set<string>([""]) }
      const code = generateFormatterDeclarations("en", used)
      expect(code).toContain('const _nf = new Intl.NumberFormat("en")')
    })

    it("generates number formatter with style", () => {
      const used = { ...emptyFormatters, number: new Set<string>(["percent"]) }
      const code = generateFormatterDeclarations("en", used)
      expect(code).toContain("_nf_percent")
      expect(code).toContain('"style":"percent"')
    })

    it("generates date formatter", () => {
      const used = { ...emptyFormatters, date: new Set<string>(["short"]) }
      const code = generateFormatterDeclarations("de", used)
      expect(code).toContain("_df_short")
      expect(code).toContain('dateStyle: "short"')
    })

    it("generates time formatter", () => {
      const used = { ...emptyFormatters, time: new Set<string>(["medium"]) }
      const code = generateFormatterDeclarations("de", used)
      expect(code).toContain("_tf_medium")
      expect(code).toContain('timeStyle: "medium"')
    })

    it("generates list formatter", () => {
      const used = { ...emptyFormatters, list: new Set<string>([""]) }
      const code = generateFormatterDeclarations("en", used)
      expect(code).toContain('const _lf = new Intl.ListFormat("en"')
      expect(code).toContain('type: "conjunction"')
    })

    it("generates list formatter with disjunction style", () => {
      const used = { ...emptyFormatters, list: new Set<string>(["disjunction"]) }
      const code = generateFormatterDeclarations("en", used)
      expect(code).toContain("_lf_disjunction")
      expect(code).toContain('type: "disjunction"')
    })

    it("generates relativeTime formatter", () => {
      const used = { ...emptyFormatters, relativeTime: new Set<string>(["day_long"]) }
      const code = generateFormatterDeclarations("en", used)
      expect(code).toContain("_rtf_day_long")
      expect(code).toContain('new Intl.RelativeTimeFormat("en"')
      expect(code).toContain('style: "long"')
    })

    it("generates displayNames formatter", () => {
      const used = { ...emptyFormatters, displayNames: new Set<string>(["language"]) }
      const code = generateFormatterDeclarations("en", used)
      expect(code).toContain("_dn_language")
      expect(code).toContain('new Intl.DisplayNames("en"')
      expect(code).toContain('type: "language"')
    })

    it("generates multiple formatters", () => {
      const used = {
        ...emptyFormatters,
        number: new Set<string>([""]),
        date: new Set<string>(["short"]),
        time: new Set<string>(["medium"])
      }
      const code = generateFormatterDeclarations("en", used)
      expect(code).toContain("_nf")
      expect(code).toContain("_df_short")
      expect(code).toContain("_tf_medium")
    })
  })

  describe("createCodeGenContext", () => {
    it("creates context with locale and categories", () => {
      const ctx = createCodeGenContext("de", ["one", "other"])

      expect(ctx.locale).toBe("de")
      expect(ctx.pluralCategories).toEqual(["one", "other"])
      expect(ctx.pluralVar).toBeNull()
      expect(ctx.pluralOffset).toBe(0)
      expect(ctx.needsPluralFn).toBe(false)
      expect(ctx.hasTags).toBe(false)
    })

    it("initializes empty formatter sets", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])

      expect(ctx.formatters.number.size).toBe(0)
      expect(ctx.formatters.date.size).toBe(0)
      expect(ctx.formatters.time.size).toBe(0)
    })
  })

  describe("generateNodeCode", () => {
    it("generates code for literal node", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      const node: IcuLiteralNode = { type: "literal", value: "Hello" }

      expect(generateNodeCode(node, ctx)).toBe('"Hello"')
    })

    it("generates code for argument node", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      const node: IcuArgumentNode = { type: "argument", value: "name" }

      expect(generateNodeCode(node, ctx)).toBe('(v?.name ?? "{name}")')
    })

    it("generates code for number node", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      const node: IcuNode = { type: "number", value: "count", style: null }

      const code = generateNodeCode(node, ctx)
      expect(code).toContain("_nf.format")
      expect(ctx.formatters.number.has("")).toBe(true)
    })

    it("generates code for pound node with plural context", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      ctx.pluralVar = "count"

      const node: IcuNode = { type: "pound" }
      const code = generateNodeCode(node, ctx)

      expect(code).toContain("_nf.format")
      expect(code).toContain("v?.count")
    })

    it("generates code for time node", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      const node: IcuNode = { type: "time", value: "t", style: "short" }
      const code = generateNodeCode(node, ctx)
      expect(code).toContain("_tf_short")
      expect(ctx.formatters.time.has("short")).toBe(true)
    })

    it("generates # as literal when no plural context", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])

      const node: IcuNode = { type: "pound" }
      expect(generateNodeCode(node, ctx)).toBe('"#"')
    })

    it("generates # with offset when pluralOffset is set", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      ctx.pluralVar = "count"
      ctx.pluralOffset = 2

      const node: IcuNode = { type: "pound" }
      const code = generateNodeCode(node, ctx)
      expect(code).toContain("- 2")
    })

    it("falls back to empty string for unknown node type", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      expect(generateNodeCode({ type: 999 } as unknown as IcuNode, ctx)).toBe('""')
    })
  })

  describe("generateNodesCode", () => {
    it("returns empty string for empty array", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      expect(generateNodesCode([], ctx)).toBe('""')
    })

    it("returns simple string for single literal", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      const nodes: IcuNode[] = [{ type: "literal", value: "Hello" }]

      expect(generateNodesCode(nodes, ctx)).toBe('"Hello"')
    })

    it("generates template literal for multiple nodes", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      const nodes: IcuNode[] = [
        { type: "literal", value: "Hello " },
        { type: "argument", value: "name" }
      ]

      const code = generateNodesCode(nodes, ctx)
      expect(code).toContain("`Hello ")
      expect(code).toContain("${")
    })

    it("generates array for nodes with tags", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      const nodes: IcuNode[] = [
        { type: "literal", value: "Click " },
        {
          type: "tag",
          value: "link",
          children: [{ type: "literal", value: "here" }]
        }
      ]

      const code = generateNodesCode(nodes, ctx)
      expect(code).toContain("[")
      expect(ctx.hasTags).toBe(true)
    })

    it("returns empty string for an array containing only undefined (runtime safety)", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      expect(generateNodesCode([undefined] as unknown as IcuNode[], ctx)).toBe('""')
    })
  })

  describe("generatePluralCode / generateSelectCode edge cases", () => {
    it("adds fallback when plural 'other' is missing in options", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      const node = {
        type: "plural",
        value: "count",
        offset: 0,
        pluralType: "cardinal",
        options: {
          one: { value: [{ type: "literal", value: "one" }] }
        }
      } as unknown as import("../icu/types").IcuPluralNode

      const code = generateNodeCode(node, ctx)
      expect(code).toContain('"{count}"')
    })

    it("handles plural with only exact matches (no categories)", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      const node = {
        type: "plural",
        value: "count",
        offset: 0,
        pluralType: "cardinal",
        options: {
          "=0": { value: [{ type: "literal", value: "zero" }] }
        }
      } as unknown as import("../icu/types").IcuPluralNode

      const code = generateNodeCode(node, ctx)
      expect(code).toContain('"{count}"')
    })

    it("adds fallback when select 'other' is missing", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      const node = {
        type: "select",
        value: "gender",
        options: {
          male: { value: [{ type: "literal", value: "He" }] }
        }
      } as unknown as import("../icu/types").IcuSelectNode

      const code = generateNodeCode(node, ctx)
      expect(code).toContain('"{gender}"')
    })
  })
})
