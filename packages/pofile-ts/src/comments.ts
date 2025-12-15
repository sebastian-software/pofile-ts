/**
 * Comment processing utilities.
 *
 * Provides helpers for handling comments in PO files,
 * particularly for integration with build tools that extract
 * comments from source code.
 */

/**
 * Splits multiline comments into individual lines.
 *
 * Source code comments often contain newlines, but PO format expects
 * one comment per line. This helper normalizes comments for PO output.
 *
 * Features:
 * - Splits on newlines (\n, \r\n, \r)
 * - Trims whitespace from each line
 * - Filters out empty lines
 * - Flattens arrays (handles both single strings and arrays)
 *
 * @example
 * // Split a multiline comment
 * splitMultilineComments(["Line1\nLine2", "Line3"])
 * // → ["Line1", "Line2", "Line3"]
 *
 * @example
 * // Handles whitespace
 * splitMultilineComments(["  Line1\n  Line2  "])
 * // → ["Line1", "Line2"]
 *
 * @example
 * // Windows line endings
 * splitMultilineComments(["First\r\nSecond"])
 * // → ["First", "Second"]
 *
 * @example
 * // Empty lines are filtered out
 * splitMultilineComments(["Line1\n\n\nLine2"])
 * // → ["Line1", "Line2"]
 *
 * @example
 * // Single-line comments pass through unchanged
 * splitMultilineComments(["Simple comment"])
 * // → ["Simple comment"]
 */
export function splitMultilineComments(comments: string[]): string[] {
  return comments
    .flatMap((comment) => comment.split(/\r?\n|\r/))
    .map((line) => line.trim())
    .filter(Boolean)
}
