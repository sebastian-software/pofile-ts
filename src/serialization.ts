import type { SerializeOptions } from "./types"
import { escapeString } from "./utils"

/** Default serialization options */
export const DEFAULT_SERIALIZE_OPTIONS: Required<SerializeOptions> = {
  foldLength: 80,
  compactMultiline: true
}

/**
 * Folds a string into multiple lines at word boundaries.
 *
 * @param text - The text to fold (already escaped)
 * @param maxLength - Maximum line length
 * @returns Array of folded line segments
 */
export function foldLine(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text]
  }

  const lines: string[] = []
  let start = 0

  while (start < text.length) {
    const remaining = text.length - start
    if (remaining <= maxLength) {
      lines.push(text.substring(start))
      break
    }

    const breakAt = findBreakPointAt(text, start, maxLength)
    lines.push(text.substring(start, breakAt))
    start = breakAt
  }

  return lines
}

/** Finds a good break point for line folding starting at offset */
function findBreakPointAt(text: string, start: number, maxLength: number): number {
  const end = start + maxLength

  // Look for a space to break at
  for (let i = end; i > start; i--) {
    if (text[i] === " ") {
      return i + 1 // Include the space in the current line
    }
  }

  // No space found, break at maxLength but avoid breaking escape sequences
  if (text[end - 1] === "\\") {
    return end - 1
  }

  return end
}

/** Escapes parts and adds \n back to represent line breaks */
function escapeAndJoinParts(parts: string[]): string[] {
  const len = parts.length
  const escaped: string[] = new Array<string>(len)

  // Escape and add \n in a single pass
  for (let i = 0; i < len; i++) {
    const part = escapeString(parts[i] ?? "")
    // Add \n to all parts except the last
    escaped[i] = i < len - 1 ? part + "\\n" : part
  }

  return escaped
}

/** Applies line folding to escaped parts */
function applyFolding(
  escapedParts: string[],
  foldLength: number,
  keywordPrefixLength: number,
  hasMultipleLines: boolean
): string[] {
  if (foldLength <= 0) {
    return escapedParts
  }

  const firstLineMax = foldLength - keywordPrefixLength - 2 // -2 for quotes
  const otherLineMax = foldLength - 2 // -2 for quotes
  const allSegments: string[] = []

  for (let i = 0; i < escapedParts.length; i++) {
    const part = escapedParts[i] ?? ""
    const maxLen = i === 0 && !hasMultipleLines ? firstLineMax : otherLineMax
    const folded = foldLine(part, maxLen)
    // Avoid spread operator for better performance
    for (const segment of folded) {
      allSegments.push(segment)
    }
  }

  return allSegments
}

/** Builds output lines in compact or traditional format */
function buildOutputLines(
  segments: string[],
  keywordPrefix: string,
  useCompactFormat: boolean
): string[] {
  const lines: string[] = []

  if (useCompactFormat) {
    lines.push(`${keywordPrefix}"${segments[0] ?? ""}"`)
    for (let i = 1; i < segments.length; i++) {
      lines.push(`"${segments[i] ?? ""}"`)
    }
  } else {
    lines.push(`${keywordPrefix}""`)
    for (const segment of segments) {
      lines.push(`"${segment}"`)
    }
  }

  return lines
}

/**
 * Formats a keyword and text into PO file lines.
 *
 * Handles:
 * 1. Multiline strings (containing \n characters)
 * 2. Long strings that need folding (when foldLength > 0)
 * 3. Compact vs traditional GNU gettext format
 *
 * @param keyword - The PO keyword (msgid, msgstr, etc.)
 * @param text - The text value
 * @param index - Optional plural index
 * @param options - Serialization options
 */
// eslint-disable-next-line complexity -- optimized for performance
export function formatKeyword(
  keyword: string,
  text: string,
  index?: number,
  options: SerializeOptions = {}
): string[] {
  const {
    foldLength = DEFAULT_SERIALIZE_OPTIONS.foldLength,
    compactMultiline = DEFAULT_SERIALIZE_OPTIONS.compactMultiline
  } = options

  // Build keyword prefix (e.g., "msgstr[0] ")
  const keywordPrefix = index !== undefined ? keyword + "[" + String(index) + "] " : keyword + " "

  // Fast path: simple single-line string without newlines
  // This is the most common case and avoids split/map/fold overhead
  if (!text.includes("\n")) {
    const escaped = escapeString(text)
    const fullLine = keywordPrefix + '"' + escaped + '"'

    // If it fits in one line (or folding disabled), return directly
    if (foldLength <= 0 || fullLine.length <= foldLength) {
      return [fullLine]
    }
  }

  // Full path for multiline or long strings
  const parts = text.split("\n")
  const hasMultipleLines = parts.length > 1
  const firstPartIsEmpty = parts[0] === ""

  // Escape parts and add \n markers
  const escapedParts = escapeAndJoinParts(parts)

  // Apply folding if enabled
  const segments = applyFolding(escapedParts, foldLength, keywordPrefix.length, hasMultipleLines)

  // Determine format: single line, compact multiline, or traditional
  const isSingleLine = segments.length === 1 && !hasMultipleLines
  if (isSingleLine) {
    return [keywordPrefix + '"' + (segments[0] ?? "") + '"']
  }

  // Use compact format only if enabled AND first part has content
  const useCompactFormat = compactMultiline && !firstPartIsEmpty
  return buildOutputLines(segments, keywordPrefix, useCompactFormat)
}
