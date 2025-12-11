/**
 * Message ID generation utilities.
 *
 * Provides functions to generate stable, content-based message IDs
 * from source strings. Compatible with Lingui's ID generation.
 */

/**
 * Generates a message ID from content using SHA-256.
 *
 * This is an async function that works in both Node.js and browser environments.
 * The generated ID is a 6-character hex string derived from the SHA-256 hash.
 *
 * @param message - The source message text
 * @param context - Optional message context for disambiguation
 * @returns A 6-character hexadecimal ID
 *
 * @example
 * const id = await generateMessageId("Hello {name}")
 * // → "a1b2c3"
 *
 * const idWithContext = await generateMessageId("Open", "menu.file")
 * // → "d4e5f6"
 */
export async function generateMessageId(message: string, context?: string): Promise<string> {
  // Combine message and context (matching Lingui's approach)
  const input = context ? `${context}${message}` : message

  const hash = await sha256(input)
  return hash.slice(0, 6)
}

/**
 * Generates a message ID synchronously (Node.js only).
 *
 * This function uses Node.js's crypto module and will not work in browsers.
 * Use `generateMessageId` for isomorphic code.
 *
 * @param message - The source message text
 * @param context - Optional message context for disambiguation
 * @returns A 6-character hexadecimal ID
 *
 * @example
 * const id = generateMessageIdSync("Hello {name}")
 * // → "a1b2c3"
 */
export function generateMessageIdSync(message: string, context?: string): string {
  const input = context ? `${context}${message}` : message
  return nodeCryptoHash(input).slice(0, 6)
}

/**
 * Computes SHA-256 hash using Node.js crypto module.
 */
function nodeCryptoHash(input: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("node:crypto") as typeof import("node:crypto")
  return crypto.createHash("sha256").update(input).digest("hex")
}

/**
 * Computes SHA-256 hash of a string.
 *
 * Uses the Web Crypto API which is available in browsers and Node.js 15+.
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data)
  const hashArray = [...new Uint8Array(hashBuffer)]
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
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
