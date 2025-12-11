/**
 * Catalog conversion helpers for working with simple key-value formats.
 *
 * Provides utilities to convert between a simple catalog format and PO items.
 */

import type { PoItem } from "./types"
import { createItem } from "./Item"
import { parseReference, formatReference, type SourceReference } from "./references"

/**
 * A single entry in the catalog.
 */
export interface CatalogEntry {
  /**
   * The source message (msgid content).
   * Used when the catalog key is a generated ID rather than the source text.
   */
  message?: string

  /**
   * The translated string(s).
   * Use an array for plural forms: [singular, plural, ...]
   */
  translation: string | string[]

  /**
   * Source string for plural forms (msgid_plural).
   * Required when translation is an array.
   */
  pluralSource?: string

  /**
   * Message context for disambiguation (msgctxt).
   */
  context?: string

  /**
   * Translator comments.
   */
  comments?: string[]

  /**
   * Extracted comments (from source code).
   */
  extractedComments?: string[]

  /**
   * Source file references.
   */
  origins?: SourceReference[]

  /**
   * Whether this entry is obsolete.
   */
  obsolete?: boolean

  /**
   * Flags like "fuzzy".
   */
  flags?: Record<string, boolean>
}

/**
 * A catalog is a record of message IDs to their entries.
 */
export type Catalog = Record<string, CatalogEntry>

/**
 * Options for converting catalog to items.
 */
export interface CatalogToItemsOptions {
  /**
   * Include source references in the output.
   * @default true
   */
  includeOrigins?: boolean

  /**
   * Include line numbers in references.
   * @default true
   */
  includeLineNumbers?: boolean

  /**
   * Number of plural forms for the target language.
   * @default 2
   */
  nplurals?: number
}

/**
 * Options for converting items to catalog.
 */
export interface ItemsToCatalogOptions {
  /**
   * Use msgid as the catalog key (true) or use a custom key generator (false).
   * @default true
   */
  useMsgidAsKey?: boolean

  /**
   * Custom function to generate catalog keys from items.
   * Only used when useMsgidAsKey is false.
   */
  keyGenerator?: (item: PoItem) => string

  /**
   * Include origins in the catalog entries.
   * @default true
   */
  includeOrigins?: boolean
}

/**
 * Converts a catalog to PO items.
 *
 * @example
 * const items = catalogToItems({
 *   "Hello": { translation: "Hallo" },
 *   "greeting": {
 *     message: "Hello {name}",
 *     translation: "Hallo {name}",
 *     context: "informal"
 *   },
 *   "{count} item": {
 *     translation: ["{count} Element", "{count} Elemente"],
 *     pluralSource: "{count} items"
 *   }
 * })
 */
export function catalogToItems(catalog: Catalog, options: CatalogToItemsOptions = {}): PoItem[] {
  const { includeOrigins = true, includeLineNumbers = true, nplurals = 2 } = options

  const items: PoItem[] = []

  for (const [key, entry] of Object.entries(catalog)) {
    const item = createItem({ nplurals })

    // msgid is either the explicit message or the key itself
    item.msgid = entry.message ?? key

    // Context
    if (entry.context) {
      item.msgctxt = entry.context
    }

    // Translation(s)
    if (Array.isArray(entry.translation)) {
      item.msgstr = entry.translation
      // Plural source is required for plural translations
      if (entry.pluralSource) {
        item.msgid_plural = entry.pluralSource
      }
    } else {
      item.msgstr = [entry.translation]
    }

    // Comments
    if (entry.comments) {
      item.comments = entry.comments
    }
    if (entry.extractedComments) {
      item.extractedComments = entry.extractedComments
    }

    // References/Origins
    if (includeOrigins && entry.origins) {
      item.references = entry.origins.map((ref) => formatReference(ref, { includeLineNumbers }))
    }

    // Obsolete
    if (entry.obsolete) {
      item.obsolete = true
    }

    // Flags
    if (entry.flags) {
      item.flags = { ...entry.flags }
    }

    items.push(item)
  }

  return items
}

/**
 * Converts PO items to a catalog.
 *
 * @example
 * const catalog = itemsToCatalog(items)
 * // → { "Hello": { translation: "Hallo", ... } }
 */
export function itemsToCatalog(items: PoItem[], options: ItemsToCatalogOptions = {}): Catalog {
  const { useMsgidAsKey = true, keyGenerator, includeOrigins = true } = options

  const catalog: Catalog = {}

  for (const item of items) {
    // Skip header item (empty msgid)
    if (!item.msgid) {
      continue
    }

    // Determine the catalog key
    let key: string
    if (useMsgidAsKey) {
      key = item.msgid
    } else if (keyGenerator) {
      key = keyGenerator(item)
    } else {
      key = item.msgid
    }

    // Build the entry
    const entry: CatalogEntry = {
      translation: item.msgid_plural ? item.msgstr : (item.msgstr[0] ?? "")
    }

    // Only include message if it differs from the key
    if (!useMsgidAsKey && item.msgid !== key) {
      entry.message = item.msgid
    }

    // Plural source
    if (item.msgid_plural) {
      entry.pluralSource = item.msgid_plural
    }

    // Context
    if (item.msgctxt) {
      entry.context = item.msgctxt
    }

    // Comments
    if (item.comments.length > 0) {
      entry.comments = item.comments
    }
    if (item.extractedComments.length > 0) {
      entry.extractedComments = item.extractedComments
    }

    // Origins
    if (includeOrigins && item.references.length > 0) {
      entry.origins = item.references.map((ref) => parseReference(ref))
    }

    // Obsolete
    if (item.obsolete) {
      entry.obsolete = true
    }

    // Flags
    if (Object.keys(item.flags).length > 0) {
      entry.flags = { ...item.flags }
    }

    catalog[key] = entry
  }

  return catalog
}

/**
 * Merges two catalogs, with the second catalog taking precedence.
 *
 * Useful for merging extracted messages with existing translations.
 *
 * @example
 * const merged = mergeCatalogs(existingCatalog, newCatalog)
 */
export function mergeCatalogs(base: Catalog, updates: Catalog): Catalog {
  const merged: Catalog = {}

  // Copy base entries
  for (const [key, entry] of Object.entries(base)) {
    merged[key] = { ...entry }
  }

  // Merge updates
  for (const [key, update] of Object.entries(updates)) {
    if (merged[key]) {
      // Merge with existing entry
      merged[key] = {
        ...merged[key],
        ...update,
        // Merge arrays instead of replacing
        comments: update.comments ?? merged[key].comments,
        extractedComments: update.extractedComments ?? merged[key].extractedComments,
        origins: update.origins ?? merged[key].origins,
        flags: { ...merged[key].flags, ...update.flags }
      }
    } else {
      merged[key] = { ...update }
    }
  }

  return merged
}
