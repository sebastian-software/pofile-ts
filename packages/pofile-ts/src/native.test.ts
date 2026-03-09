import { describe, expect, it } from "vitest"
import { getNativeBinding, parseIcuWithNative } from "./native"

describe("native helpers", () => {
  it("parses ICU messages through the native binding when available", () => {
    const binding = getNativeBinding()
    const result = parseIcuWithNative("Hello {name}")

    if (!binding) {
      expect(result).toBeNull()
      return
    }

    expect(result).toEqual({
      success: true,
      ast: [
        { type: "literal", value: "Hello " },
        { type: "argument", value: "name" }
      ],
      errors: []
    })
  })

  it("returns native ICU parse errors with structured locations", () => {
    const binding = getNativeBinding()
    const result = parseIcuWithNative("first line\n{broken")

    if (!binding) {
      expect(result).toBeNull()
      return
    }

    expect(result).toMatchObject({
      success: false,
      ast: null,
      errors: [
        {
          kind: "SYNTAX_ERROR",
          location: {
            start: {
              offset: 11,
              line: 2,
              column: 1
            }
          }
        }
      ]
    })
  })
})
