/**
 * Message ID generation utilities.
 *
 * Provides functions to generate stable, content-based message IDs
 * from source strings. Uses SHA-256 hashing with Base64URL encoding
 * for compact, URL-safe identifiers.
 */

/** Length of generated message IDs (8 Base64URL chars = 281 trillion possibilities) */
const ID_LENGTH = 8

/**
 * Generates a message ID from content using SHA-256.
 *
 * This is an async function that works in both Node.js and browser environments.
 * The generated ID is an 8-character Base64URL string derived from the SHA-256 hash.
 *
 * @param message - The source message text
 * @param context - Optional message context for disambiguation
 * @returns An 8-character Base64URL ID
 *
 * @example
 * const id = await generateMessageId("Hello {name}")
 * // → "Kj9xMnPq"
 *
 * const idWithContext = await generateMessageId("Open", "menu.file")
 * // → "Xp2wLmNr"
 */
export async function generateMessageId(message: string, context?: string): Promise<string> {
  const input = context ? `${context}${message}` : message
  const hashBytes = await sha256Bytes(input)
  return bytesToBase64Url(hashBytes).slice(0, ID_LENGTH)
}

/**
 * Generates a message ID synchronously (Node.js only).
 *
 * This function uses Node.js's crypto module and will not work in browsers.
 * Use `generateMessageId` for isomorphic code.
 *
 * @param message - The source message text
 * @param context - Optional message context for disambiguation
 * @returns An 8-character Base64URL ID
 *
 * @example
 * const id = generateMessageIdSync("Hello {name}")
 * // → "Kj9xMnPq"
 */
export function generateMessageIdSync(message: string, context?: string): string {
  const input = context ? `${context}${message}` : message
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("node:crypto") as typeof import("node:crypto")
  return crypto.createHash("sha256").update(input).digest("base64url").slice(0, ID_LENGTH)
}

/**
 * Computes SHA-256 hash bytes using Web Crypto API.
 */
async function sha256Bytes(input: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data)
  return new Uint8Array(hashBuffer)
}

/** Base64URL alphabet */
const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

/**
 * Converts bytes to Base64URL string.
 * Optimized for short output (only processes bytes needed for ID_LENGTH chars).
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  // We need ceil(ID_LENGTH * 6 / 8) = 6 bytes for 8 Base64 chars
  const chars: string[] = []
  let bits = 0
  let value = 0

  for (let i = 0; i < bytes.length && chars.length < ID_LENGTH; i++) {
    const byte = bytes[i] ?? 0
    value = (value << 8) | byte
    bits += 8

    while (bits >= 6 && chars.length < ID_LENGTH) {
      bits -= 6
      chars.push(BASE64URL.charAt((value >> bits) & 0x3f))
    }
  }

  return chars.join("")
}

/**
 * Options for batch message ID generation.
 */
export interface GenerateIdsOptions {
  /**
   * Whether to include the original message in the result.
   * @default false
   */
  includeMessage?: boolean
}

/**
 * Generates message IDs for multiple messages.
 *
 * @param messages - Array of messages (strings or { message, context } objects)
 * @returns Map of input to generated ID
 *
 * @example
 * const ids = await generateMessageIds([
 *   "Hello",
 *   { message: "Open", context: "menu.file" }
 * ])
 * // → Map { "Hello" => "a1b2c3", "Open" => "d4e5f6" }
 */
export async function generateMessageIds(
  messages: (string | { message: string; context?: string })[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>()

  await Promise.all(
    messages.map(async (entry) => {
      const message = typeof entry === "string" ? entry : entry.message
      const context = typeof entry === "string" ? undefined : entry.context
      const id = await generateMessageId(message, context)

      // Use message as key (with context suffix if present)
      const key = context ? `${message}\u0004${context}` : message
      results.set(key, id)
    })
  )

  return results
}
