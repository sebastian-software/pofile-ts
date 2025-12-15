import { describe, it, expect } from "vitest"
import {
  extractVariables,
  extractVariableInfo,
  validateIcu,
  compareVariables,
  hasPlural,
  hasSelect,
  hasIcuSyntax
} from "./utils"

describe("extractVariables", () => {
  it("extracts simple variables", () => {
    expect(extractVariables("Hello {name}")).toEqual(["name"])
  })

  it("extracts multiple variables", () => {
    expect(extractVariables("{first} {last}")).toEqual(["first", "last"])
  })

  it("extracts variables from plural", () => {
    expect(extractVariables("{count, plural, one {# item} other {# items}}")).toEqual(["count"])
  })

  it("extracts nested variables", () => {
    expect(
      extractVariables(
        "Hello {name}, you have {count, plural, one {# message from {sender}} other {# messages}}"
      )
    ).toEqual(["name", "count", "sender"])
  })

  it("extracts variables from select", () => {
    expect(
      extractVariables("{gender, select, male {He} female {She} other {They}} said {text}")
    ).toEqual(["gender", "text"])
  })

  it("extracts variables from number/date/time", () => {
    expect(extractVariables("{n, number} {d, date} {t, time}")).toEqual(["n", "d", "t"])
  })

  it("returns empty array for plain text", () => {
    expect(extractVariables("Hello world")).toEqual([])
  })

  it("returns empty array for invalid messages", () => {
    expect(extractVariables("{unclosed")).toEqual([])
  })

  it("deduplicates variables", () => {
    expect(extractVariables("{name} and {name} again")).toEqual(["name"])
  })
})

describe("extractVariableInfo", () => {
  it("extracts argument info", () => {
    expect(extractVariableInfo("{name}")).toEqual([{ name: "name", type: "argument" }])
  })

  it("extracts number info with style", () => {
    expect(extractVariableInfo("{price, number, currency}")).toEqual([
      { name: "price", type: "number", style: "currency" }
    ])
  })

  it("extracts number info without style", () => {
    expect(extractVariableInfo("{count, number}")).toEqual([
      { name: "count", type: "number", style: undefined }
    ])
  })

  it("extracts date info", () => {
    expect(extractVariableInfo("{d, date, short}")).toEqual([
      { name: "d", type: "date", style: "short" }
    ])
  })

  it("extracts time info", () => {
    expect(extractVariableInfo("{t, time, medium}")).toEqual([
      { name: "t", type: "time", style: "medium" }
    ])
  })

  it("extracts plural info", () => {
    expect(extractVariableInfo("{count, plural, one {#} other {#}}")).toEqual([
      { name: "count", type: "plural" }
    ])
  })

  it("extracts select info", () => {
    expect(extractVariableInfo("{gender, select, male {He} other {They}}")).toEqual([
      { name: "gender", type: "select" }
    ])
  })

  it("extracts skeleton style (as opaque string)", () => {
    expect(extractVariableInfo("{n, number, ::currency/EUR}")).toEqual([
      { name: "n", type: "number", style: "::currency/EUR" }
    ])
  })
})

describe("validateIcu", () => {
  it("validates correct messages", () => {
    const result = validateIcu("Hello {name}")
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it("validates plural messages", () => {
    const result = validateIcu("{count, plural, one {#} other {#}}")
    expect(result.valid).toBe(true)
  })

  it("reports errors for invalid messages", () => {
    const result = validateIcu("{unclosed")
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]!.kind).toBe("SYNTAX_ERROR")
  })

  it("reports missing other clause", () => {
    const result = validateIcu("{n, plural, one {one}}")
    expect(result.valid).toBe(false)
    expect(result.errors[0]!.kind).toBe("SYNTAX_ERROR")
    expect(result.errors[0]!.message).toContain("other")
  })

  it("respects requiresOtherClause option", () => {
    const result = validateIcu("{n, plural, one {one}}", { requiresOtherClause: false })
    expect(result.valid).toBe(true)
  })
})

describe("compareVariables", () => {
  it("detects matching variables", () => {
    const result = compareVariables("Hello {name}", "Hallo {name}")
    expect(result.isMatch).toBe(true)
    expect(result.missing).toEqual([])
    expect(result.extra).toEqual([])
  })

  it("detects missing variables", () => {
    const result = compareVariables("Hello {name} {age}", "Hallo {name}")
    expect(result.isMatch).toBe(false)
    expect(result.missing).toEqual(["age"])
    expect(result.extra).toEqual([])
  })

  it("detects extra variables", () => {
    const result = compareVariables("Hello {name}", "Hallo {name} {extra}")
    expect(result.isMatch).toBe(false)
    expect(result.missing).toEqual([])
    expect(result.extra).toEqual(["extra"])
  })

  it("detects renamed variables", () => {
    const result = compareVariables("Hello {name}", "Hallo {userName}")
    expect(result.isMatch).toBe(false)
    expect(result.missing).toEqual(["name"])
    expect(result.extra).toEqual(["userName"])
  })

  it("handles complex messages", () => {
    const result = compareVariables(
      "{count, plural, one {# item} other {# items}} for {user}",
      "{count, plural, one {# Artikel} other {# Artikel}} für {user}"
    )
    expect(result.isMatch).toBe(true)
  })
})

describe("hasPlural", () => {
  it("returns true for plural messages", () => {
    expect(hasPlural("{count, plural, one {#} other {#}}")).toBe(true)
  })

  it("returns true for selectordinal", () => {
    expect(hasPlural("{n, selectordinal, one {#st} other {#th}}")).toBe(true)
  })

  it("returns false for non-plural messages", () => {
    expect(hasPlural("Hello {name}")).toBe(false)
  })

  it("returns false for select messages", () => {
    expect(hasPlural("{g, select, male {He} other {They}}")).toBe(false)
  })

  it("detects nested plural", () => {
    expect(
      hasPlural("{g, select, male {{n, plural, one {He has #} other {He has #}}} other {They}}")
    ).toBe(true)
  })
})

describe("hasSelect", () => {
  it("returns true for select messages", () => {
    expect(hasSelect("{g, select, male {He} other {They}}")).toBe(true)
  })

  it("returns false for plural messages", () => {
    expect(hasSelect("{n, plural, one {#} other {#}}")).toBe(false)
  })

  it("returns false for simple messages", () => {
    expect(hasSelect("Hello {name}")).toBe(false)
  })
})

describe("hasIcuSyntax", () => {
  it("returns true for variables", () => {
    expect(hasIcuSyntax("Hello {name}")).toBe(true)
  })

  it("returns true for plural", () => {
    expect(hasIcuSyntax("{n, plural, one {#} other {#}}")).toBe(true)
  })

  it("returns false for plain text", () => {
    expect(hasIcuSyntax("Hello world")).toBe(false)
  })

  it("returns false for empty string", () => {
    expect(hasIcuSyntax("")).toBe(false)
  })
})
