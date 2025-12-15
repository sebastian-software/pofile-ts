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
import { IcuNodeType } from "../icu/types"
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
    it("returns null when no formatters used", () => {
      const used = { number: new Set<string>(), date: new Set<string>(), time: new Set<string>() }
      expect(generateFormatterDeclarations("en", used)).toBeNull()
    })

    it("generates number formatter without style", () => {
      const used = {
        number: new Set<string>([""]),
        date: new Set<string>(),
        time: new Set<string>()
      }
      const code = generateFormatterDeclarations("en", used)
      expect(code).toContain('const _nf = new Intl.NumberFormat("en")')
    })

    it("generates number formatter with style", () => {
      const used = {
        number: new Set<string>(["percent"]),
        date: new Set<string>(),
        time: new Set<string>()
      }
      const code = generateFormatterDeclarations("en", used)
      expect(code).toContain("_nf_percent")
      expect(code).toContain('"style":"percent"')
    })

    it("generates date formatter", () => {
      const used = {
        number: new Set<string>(),
        date: new Set<string>(["short"]),
        time: new Set<string>()
      }
      const code = generateFormatterDeclarations("de", used)
      expect(code).toContain("_df_short")
      expect(code).toContain('dateStyle: "short"')
    })

    it("generates time formatter", () => {
      const used = {
        number: new Set<string>(),
        date: new Set<string>(),
        time: new Set<string>(["medium"])
      }
      const code = generateFormatterDeclarations("de", used)
      expect(code).toContain("_tf_medium")
      expect(code).toContain('timeStyle: "medium"')
    })

    it("generates multiple formatters", () => {
      const used = {
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
      const node: IcuLiteralNode = { type: IcuNodeType.literal, value: "Hello" }

      expect(generateNodeCode(node, ctx)).toBe('"Hello"')
    })

    it("generates code for argument node", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      const node: IcuArgumentNode = { type: IcuNodeType.argument, value: "name" }

      expect(generateNodeCode(node, ctx)).toBe('(v?.name ?? "{name}")')
    })

    it("generates code for number node", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      const node: IcuNode = { type: IcuNodeType.number, value: "count", style: null }

      const code = generateNodeCode(node, ctx)
      expect(code).toContain("_nf.format")
      expect(ctx.formatters.number.has("")).toBe(true)
    })

    it("generates code for pound node with plural context", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      ctx.pluralVar = "count"

      const node: IcuNode = { type: IcuNodeType.pound }
      const code = generateNodeCode(node, ctx)

      expect(code).toContain("_nf.format")
      expect(code).toContain("v?.count")
    })

    it("generates # as literal when no plural context", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])

      const node: IcuNode = { type: IcuNodeType.pound }
      expect(generateNodeCode(node, ctx)).toBe('"#"')
    })
  })

  describe("generateNodesCode", () => {
    it("returns empty string for empty array", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      expect(generateNodesCode([], ctx)).toBe('""')
    })

    it("returns simple string for single literal", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      const nodes: IcuNode[] = [{ type: IcuNodeType.literal, value: "Hello" }]

      expect(generateNodesCode(nodes, ctx)).toBe('"Hello"')
    })

    it("generates template literal for multiple nodes", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      const nodes: IcuNode[] = [
        { type: IcuNodeType.literal, value: "Hello " },
        { type: IcuNodeType.argument, value: "name" }
      ]

      const code = generateNodesCode(nodes, ctx)
      expect(code).toContain("`Hello ")
      expect(code).toContain("${")
    })

    it("generates array for nodes with tags", () => {
      const ctx = createCodeGenContext("en", ["one", "other"])
      const nodes: IcuNode[] = [
        { type: IcuNodeType.literal, value: "Click " },
        {
          type: IcuNodeType.tag,
          value: "link",
          children: [{ type: IcuNodeType.literal, value: "here" }]
        }
      ]

      const code = generateNodesCode(nodes, ctx)
      expect(code).toContain("[")
      expect(ctx.hasTags).toBe(true)
    })
  })
})
