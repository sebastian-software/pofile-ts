import { ESCAPE_MAP, UNESCAPE_MAP } from "./constants"

/**
 * Trims whitespace from both ends of a string
 */
export function trim(str: string): string {
  return str.replace(/^\s+|\s+$/g, "")
}

/**
 * Escapes special characters in a string for PO file format.
 * Handles bell, backspace, tab, vertical tab, form feed, carriage return,
 * double quotes, and backslashes.
 */
export function escapeString(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x07\b\t\v\f\r"\\]/g, (match) => {
    return ESCAPE_MAP[match] ?? "\\" + match
  })
}

/**
 * Unescapes C-style escape sequences in a string.
 * Handles: \a \b \t \n \v \f \r \' \" \\ \? and octal/hex escapes.
 * Octal escapes can be 1-3 digits (e.g., \0, \77, \123).
 */
export function unescapeString(str: string): string {
  return str.replace(
    /\\([abtnvfr'"\\?]|([0-7]{1,3})|x([0-9a-fA-F]{2}))/g,
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
  let str = trim(line)
  str = str.replace(/^[^"]*"|"$/g, "")
  return unescapeString(str)
}
