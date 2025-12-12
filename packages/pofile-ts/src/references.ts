/**
 * Utilities for parsing and formatting PO file references.
 *
 * References in PO files use the format: file:line
 * Example: "src/App.tsx:42"
 */

/** Pre-compiled regex for backslash replacement */
const BACKSLASH_REGEX = /\\/g

/**
 * A parsed source reference.
 */
export interface SourceReference {
  /** File path (always uses forward slashes) */
  file: string
  /** Line number (optional) */
  line?: number
}

/**
 * Options for formatting references.
 */
export interface FormatReferenceOptions {
  /**
   * Include line numbers in the output.
   * @default true
   */
  includeLineNumbers?: boolean
}

/**
 * Parses a PO file reference string into its components.
 *
 * Parses from right to find the line number, handling edge cases like
 * colons in file paths.
 *
 * @throws Error if the reference format is invalid
 *
 * @example
 * parseReference("src/App.tsx:42")
 * // → { file: "src/App.tsx", line: 42 }
 *
 * parseReference("src/App.tsx")
 * // → { file: "src/App.tsx" }
 */
export function parseReference(reference: string): SourceReference {
  const trimmed = reference.trim()

  if (!trimmed) {
    throw new Error("Reference cannot be empty")
  }

  // Find the last colon
  const lastColonIndex = trimmed.lastIndexOf(":")

  // No colon or colon at start (could be Windows drive letter like C:\)
  if (lastColonIndex === -1 || lastColonIndex === 0) {
    return { file: normalizeFilePath(trimmed) }
  }

  // Check if what follows the colon is a valid line number
  const afterColon = trimmed.slice(lastColonIndex + 1)
  const lineNumber = parseInt(afterColon, 10)

  // If it's a valid positive integer, treat it as a line number
  if (!isNaN(lineNumber) && lineNumber > 0 && String(lineNumber) === afterColon) {
    const file = trimmed.slice(0, lastColonIndex)

    if (!file) {
      throw new Error(`Invalid reference format: "${reference}"`)
    }

    return {
      file: normalizeFilePath(file),
      line: lineNumber
    }
  }

  // Not a valid line number, treat entire string as file path
  return { file: normalizeFilePath(trimmed) }
}

/**
 * Formats a source reference back to a string.
 *
 * @example
 * formatReference({ file: "src/App.tsx", line: 42 })
 * // → "src/App.tsx:42"
 *
 * formatReference({ file: "src/App.tsx" })
 * // → "src/App.tsx"
 *
 * formatReference({ file: "src/App.tsx", line: 42 }, { includeLineNumbers: false })
 * // → "src/App.tsx"
 */
export function formatReference(
  ref: SourceReference,
  options: FormatReferenceOptions = {}
): string {
  const { includeLineNumbers = true } = options
  const file = normalizeFilePath(ref.file)

  if (includeLineNumbers && ref.line !== undefined && ref.line > 0) {
    return `${file}:${ref.line}`
  }

  return file
}

/**
 * Normalizes a file path to use forward slashes (Unix-style).
 *
 * Always converts backslashes to forward slashes, regardless of platform.
 * This ensures consistent output in PO files.
 *
 * @example
 * normalizeFilePath("src\\components\\App.tsx")
 * // → "src/components/App.tsx"
 */
export function normalizeFilePath(filePath: string): string {
  return filePath.replace(BACKSLASH_REGEX, "/")
}

/**
 * Checks if a file path is absolute.
 */
function isAbsolutePath(filePath: string): boolean {
  // Unix absolute path
  if (filePath.startsWith("/")) {
    return true
  }
  // Windows absolute path (e.g., C:\, D:\)
  if (/^[A-Za-z]:[/\\]/.test(filePath)) {
    return true
  }
  return false
}

/**
 * Parses multiple references from a single string.
 *
 * References can be separated by spaces or commas.
 *
 * @throws Error if any reference format is invalid
 *
 * @example
 * parseReferences("src/App.tsx:42 src/utils.ts:10")
 * // → [{ file: "src/App.tsx", line: 42 }, { file: "src/utils.ts", line: 10 }]
 */
export function parseReferences(references: string): SourceReference[] {
  if (!references.trim()) {
    return []
  }

  // Split by whitespace
  const parts = references.trim().split(/\s+/)

  return parts.map((part) => parseReference(part))
}

/**
 * Formats multiple references to a string.
 *
 * @example
 * formatReferences([
 *   { file: "src/App.tsx", line: 42 },
 *   { file: "src/utils.ts", line: 10 }
 * ])
 * // → "src/App.tsx:42 src/utils.ts:10"
 */
export function formatReferences(
  refs: SourceReference[],
  options: FormatReferenceOptions = {}
): string {
  return refs.map((ref) => formatReference(ref, options)).join(" ")
}

/**
 * Creates a reference from a file path and optional line number.
 *
 * Validates that the path is relative and normalizes it.
 *
 * @throws Error if the path is absolute
 *
 * @example
 * createReference("src/App.tsx", 42)
 * // → { file: "src/App.tsx", line: 42 }
 */
export function createReference(file: string, line?: number): SourceReference {
  const normalized = normalizeFilePath(file)

  if (isAbsolutePath(normalized)) {
    throw new Error(`Reference paths must be relative, got absolute path: "${file}"`)
  }

  if (line !== undefined && (line < 1 || !Number.isInteger(line))) {
    throw new Error(`Line number must be a positive integer, got: ${line}`)
  }

  return {
    file: normalized,
    line
  }
}
