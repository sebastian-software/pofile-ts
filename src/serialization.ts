import { escapeString } from "./utils"

/**
 * Formats a keyword and text into PO file lines.
 * Handles multi-line strings by splitting on newlines.
 */
export function formatKeyword(keyword: string, text: string, index?: number): string[] {
  const lines: string[] = []
  const parts = text.split(/\n/)
  const indexStr = typeof index !== "undefined" ? `[${index}]` : ""

  if (parts.length > 1) {
    lines.push(`${keyword}${indexStr} ""`)
    for (const part of parts) {
      lines.push(`"${escapeString(part)}"`)
    }
  } else {
    lines.push(`${keyword}${indexStr} "${escapeString(text)}"`)
  }

  return lines
}

/**
 * Formats a keyword and text, adding \n to multi-line strings.
 */
export function formatKeywordWithLineBreaks(
  keyword: string,
  text: string,
  index?: number
): string[] {
  const lines = formatKeyword(keyword, text, index)

  // Add \n to all lines except first and last
  for (let i = 1; i < lines.length - 1; i++) {
    const current = lines[i]
    if (current) {
      lines[i] = current.slice(0, -1) + '\\n"'
    }
  }

  return lines
}

