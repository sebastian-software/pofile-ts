import { describe, it, expect } from "vitest"
import { parseIcu, IcuParser } from "./parser"
import { IcuNodeType } from "./types"

describe("parseIcu", () => {
  describe("literals", () => {
    it("parses plain text", () => {
      const result = parseIcu("Hello world")
      expect(result.success).toBe(true)
      expect(result.ast).toHaveLength(1)
      expect(result.ast![0]).toEqual({
        type: IcuNodeType.literal,
        value: "Hello world"
      })
    })

    it("parses empty string", () => {
      const result = parseIcu("")
      expect(result.success).toBe(true)
      expect(result.ast).toEqual([])
    })

    it("handles escaped apostrophe", () => {
      const result = parseIcu("It''s a test")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.literal,
        value: "It's a test"
      })
    })

    it("handles quoted literal", () => {
      const result = parseIcu("This is a '{placeholder}' not a variable")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.literal,
        value: "This is a {placeholder} not a variable"
      })
    })
  })

  describe("simple arguments", () => {
    it("parses simple argument", () => {
      const result = parseIcu("Hello {name}")
      expect(result.success).toBe(true)
      expect(result.ast).toHaveLength(2)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.literal,
        value: "Hello "
      })
      expect(result.ast![1]).toMatchObject({
        type: IcuNodeType.argument,
        value: "name"
      })
    })

    it("parses multiple arguments", () => {
      const result = parseIcu("{firstName} {lastName}")
      expect(result.success).toBe(true)
      expect(result.ast).toHaveLength(3)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.argument,
        value: "firstName"
      })
      expect(result.ast![1]).toMatchObject({
        type: IcuNodeType.literal,
        value: " "
      })
      expect(result.ast![2]).toMatchObject({
        type: IcuNodeType.argument,
        value: "lastName"
      })
    })

    it("handles @ before argument", () => {
      const result = parseIcu("hi @{there}")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.literal,
        value: "hi @"
      })
      expect(result.ast![1]).toMatchObject({
        type: IcuNodeType.argument,
        value: "there"
      })
    })
  })

  describe("number format", () => {
    it("parses number without style", () => {
      const result = parseIcu("{count, number}")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.number,
        value: "count",
        style: null
      })
    })

    it("parses number with style", () => {
      const result = parseIcu("{price, number, currency}")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.number,
        value: "price",
        style: "currency"
      })
    })

    it("parses number with skeleton (as opaque string)", () => {
      const result = parseIcu("{amount, number, ::currency/EUR}")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.number,
        value: "amount",
        style: "::currency/EUR"
      })
    })

    it("parses number with complex skeleton", () => {
      const result = parseIcu("{num, number, ::compact-short currency/USD}")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.number,
        value: "num",
        style: "::compact-short currency/USD"
      })
    })
  })

  describe("date/time format", () => {
    it("parses date without style", () => {
      const result = parseIcu("{d, date}")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.date,
        value: "d",
        style: null
      })
    })

    it("parses date with style", () => {
      const result = parseIcu("{d, date, short}")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.date,
        value: "d",
        style: "short"
      })
    })

    it("parses date with skeleton (as opaque string)", () => {
      const result = parseIcu("{d, date, ::yyyyMMdd}")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.date,
        value: "d",
        style: "::yyyyMMdd"
      })
    })

    it("parses time with style", () => {
      const result = parseIcu("{t, time, medium}")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.time,
        value: "t",
        style: "medium"
      })
    })
  })

  describe("plural", () => {
    it("parses simple plural", () => {
      const result = parseIcu("{count, plural, one {# item} other {# items}}")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.plural,
        value: "count",
        pluralType: "cardinal",
        offset: 0
      })
      const plural = result.ast![0] as { options: Record<string, unknown> }
      expect(plural.options).toHaveProperty("one")
      expect(plural.options).toHaveProperty("other")
    })

    it("parses plural with exact match", () => {
      const result = parseIcu("{count, plural, =0 {no items} =1 {one item} other {# items}}")
      expect(result.success).toBe(true)
      const plural = result.ast![0] as { options: Record<string, unknown> }
      expect(plural.options).toHaveProperty("=0")
      expect(plural.options).toHaveProperty("=1")
      expect(plural.options).toHaveProperty("other")
    })

    it("parses plural with offset", () => {
      const result = parseIcu(
        "{guests, plural, offset:1 =0 {no one} =1 {the host} one {the host and # guest} other {the host and # guests}}"
      )
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.plural,
        value: "guests",
        offset: 1
      })
    })

    it("parses # symbol inside plural", () => {
      const result = parseIcu("{count, plural, one {# apple} other {# apples}}")
      expect(result.success).toBe(true)

      const plural = result.ast![0] as {
        type: typeof IcuNodeType.plural
        options: Record<string, { value: Array<{ type: number }> }>
      }
      const oneOption = plural.options["one"]!
      expect(oneOption.value[0]).toMatchObject({ type: IcuNodeType.pound })
    })

    it("parses negative offset", () => {
      const result = parseIcu("{num, plural, offset:-1 =-1 {negative one} one {one} other {other}}")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.plural,
        offset: -1
      })
    })
  })

  describe("selectordinal", () => {
    it("parses selectordinal", () => {
      const result = parseIcu("{year, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.plural,
        value: "year",
        pluralType: "ordinal"
      })
    })
  })

  describe("select", () => {
    it("parses simple select", () => {
      const result = parseIcu("{gender, select, male {He} female {She} other {They}}")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.select,
        value: "gender"
      })
      const select = result.ast![0] as { options: Record<string, unknown> }
      expect(select.options).toHaveProperty("male")
      expect(select.options).toHaveProperty("female")
      expect(select.options).toHaveProperty("other")
    })

    it("parses nested select in plural", () => {
      const result = parseIcu(
        "{gender, select, male {He has {count, plural, one {# car} other {# cars}}} other {They have cars}}"
      )
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.select,
        value: "gender"
      })
    })
  })

  describe("tags", () => {
    it("parses simple tag", () => {
      const result = parseIcu("hello <b>world</b>")
      expect(result.success).toBe(true)
      expect(result.ast).toHaveLength(2)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.literal,
        value: "hello "
      })
      expect(result.ast![1]).toMatchObject({
        type: IcuNodeType.tag,
        value: "b"
      })
    })

    it("parses self-closing tag as literal", () => {
      const result = parseIcu("hello <br/>")
      expect(result.success).toBe(true)
      expect(result.ast![1]).toMatchObject({
        type: IcuNodeType.literal,
        value: "<br/>"
      })
    })

    it("parses nested tags", () => {
      const result = parseIcu("hello <b>world<i>!</i></b>")
      expect(result.success).toBe(true)
      const tag = result.ast![1] as { children: Array<{ type: number }> }
      expect(tag.children).toHaveLength(2)
      expect(tag.children[1]).toMatchObject({
        type: IcuNodeType.tag,
        value: "i"
      })
    })

    it("ignores tags when ignoreTag is true", () => {
      const result = parseIcu("hello <b>world</b>", { ignoreTag: true })
      expect(result.success).toBe(true)
      expect(result.ast).toHaveLength(1)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.literal,
        value: "hello <b>world</b>"
      })
    })

    it("parses tag with argument inside", () => {
      const result = parseIcu("<a>{placeholder}</a>")
      expect(result.success).toBe(true)
      const tag = result.ast![0] as { children: Array<{ type: number; value?: string }> }
      expect(tag).toMatchObject({
        type: IcuNodeType.tag,
        value: "a"
      })
      expect(tag.children[0]).toMatchObject({
        type: IcuNodeType.argument,
        value: "placeholder"
      })
    })

    it("handles escaped tag", () => {
      const result = parseIcu("hello '<b>world</b>'")
      expect(result.success).toBe(true)
      expect(result.ast![0]).toMatchObject({
        type: IcuNodeType.literal,
        value: "hello <b>world</b>"
      })
    })
  })

  describe("complex messages", () => {
    it("parses message with multiple types", () => {
      const result = parseIcu(
        "Hello {name}, you have {count, plural, one {# message} other {# messages}}."
      )
      expect(result.success).toBe(true)
      expect(result.ast).toHaveLength(5)
    })

    it("parses French gender agreement", () => {
      const result = parseIcu("{NAME} est {GENDER, select, female {allée} other {allé}} à {CITY}.")
      expect(result.success).toBe(true)
    })

    it("parses Russian plural forms", () => {
      const result = parseIcu(
        "{COMPANY_COUNT, plural, =1 {Одна компания опубликовала} one {# компания опубликовала} few {# компании опубликовали} many {# компаний опубликовали} other {# компаний опубликовали}} новые книги."
      )
      expect(result.success).toBe(true)
    })
  })

  describe("error handling", () => {
    it("reports empty argument error", () => {
      const result = parseIcu("{}")
      expect(result.success).toBe(false)
      expect(result.errors[0]!.kind).toBe("SYNTAX_ERROR")
    })

    it("reports unclosed argument error", () => {
      const result = parseIcu("{name")
      expect(result.success).toBe(false)
      expect(result.errors[0]!.kind).toBe("SYNTAX_ERROR")
    })

    it("reports invalid argument type error", () => {
      const result = parseIcu("{name, invalid}")
      expect(result.success).toBe(false)
      expect(result.errors[0]!.kind).toBe("SYNTAX_ERROR")
    })

    it("reports missing other clause", () => {
      const result = parseIcu("{count, plural, one {one}}")
      expect(result.success).toBe(false)
      expect(result.errors[0]!.kind).toBe("SYNTAX_ERROR")
    })

    it("does not require other clause when disabled", () => {
      const result = parseIcu("{count, plural, one {one}}", { requiresOtherClause: false })
      expect(result.success).toBe(true)
    })

    it("reports unmatched closing tag", () => {
      const result = parseIcu("hello </b>")
      expect(result.success).toBe(false)
      expect(result.errors[0]!.kind).toBe("SYNTAX_ERROR")
    })

    it("reports mismatched tag names", () => {
      const result = parseIcu("<a>text</b>")
      expect(result.success).toBe(false)
      expect(result.errors[0]!.kind).toBe("SYNTAX_ERROR")
    })

    it("reports unclosed tag", () => {
      const result = parseIcu("<a>text")
      expect(result.success).toBe(false)
      expect(result.errors[0]!.kind).toBe("SYNTAX_ERROR")
    })

    it("reports duplicate selector", () => {
      const result = parseIcu("{count, plural, one {one} one {uno} other {other}}")
      expect(result.success).toBe(false)
      expect(result.errors[0]!.kind).toBe("SYNTAX_ERROR")
    })

    it("includes error message with details", () => {
      const result = parseIcu("{name, invalid}")
      expect(result.success).toBe(false)
      expect(result.errors[0]!.message).toContain("Invalid argument type")
    })
  })
})
