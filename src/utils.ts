import { ESCAPE_MAP, UNESCAPE_MAP, RE_ESCAPE, RE_UNESCAPE } from "./constants"

/**
 * Escapes special characters in a string for PO file format.
 * Handles bell, backspace, tab, vertical tab, form feed, carriage return,
 * double quotes, and backslashes.
 */
export function escapeString(str: string): string {
  // Fast path: check if any escapable characters exist
  // Common case: most strings don't need escaping
  // eslint-disable-next-line no-control-regex
  if (!/[\x07\b\t\v\f\r"\\]/.test(str)) {
    return str
  }

  return str.replace(RE_ESCAPE, (match) => {
    return ESCAPE_MAP[match] ?? "\\" + match
  })
}

/**
 * Unescapes C-style escape sequences in a string.
 * Handles: \a \b \t \n \v \f \r \' \" \\ \? and octal/hex escapes.
 * Octal escapes can be 1-3 digits (e.g., \0, \77, \123).
 */
export function unescapeString(str: string): string {
  // Fast path: no backslash means no escape sequences
  if (!str.includes("\\")) {
    return str
  }

  return str.replace(
    RE_UNESCAPE,
    (_, esc: string, oct: string | undefined, hex: string | undefined) => {
      if (oct) {
        return String.fromCharCode(parseInt(oct, 8))
      }
      if (hex) {
        return String.fromCharCode(parseInt(hex, 16))
      }
      return UNESCAPE_MAP[esc] ?? esc
    }
  )
}

/**
 * Extracts the string value from a PO line.
 * Removes the keyword prefix and surrounding quotes, then unescapes.
 */
export function extractString(line: string): string {
  // Find first and last quote positions (faster than regex)
  const firstQuote = line.indexOf('"')
  if (firstQuote === -1) {
    return ""
  }

  const lastQuote = line.lastIndexOf('"')
  if (lastQuote <= firstQuote) {
    return ""
  }

  const str = line.substring(firstQuote + 1, lastQuote)
  return unescapeString(str)
}
