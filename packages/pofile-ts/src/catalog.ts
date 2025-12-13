/**
 * Catalog conversion helpers for working with simple key-value formats.
 *
 * Provides utilities to convert between a simple catalog format and PO items.
 */

import type { PoItem } from "./types"
import { createItem } from "./Item"
import { parseReference, formatReference, type SourceReference } from "./references"

/** Checks if an object has any own properties (faster than Object.keys().length) */
function hasOwnProperties(obj: object): boolean {
  for (const _ in obj) {
    return true
  }
  return false
}

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
   * Optional for extraction workflows where translations don't exist yet.
   */
  translation?: string | string[]

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

/** Applies translation to an item */
function applyTranslation(item: PoItem, entry: CatalogEntry): void {
  if (entry.translation === undefined) {
    // No translation yet (extraction workflow)
    item.msgstr = entry.pluralSource ? ["", ""] : [""]
    if (entry.pluralSource) {
      item.msgid_plural = entry.pluralSource
    }
  } else if (Array.isArray(entry.translation)) {
    item.msgstr = entry.translation
    if (entry.pluralSource) {
      item.msgid_plural = entry.pluralSource
    }
  } else {
    item.msgstr = [entry.translation]
  }
}

/** Applies optional fields from entry to item */
function applyOptionalFields(
  item: PoItem,
  entry: CatalogEntry,
  options: { includeOrigins: boolean; includeLineNumbers: boolean }
): void {
  if (entry.context) {
    item.msgctxt = entry.context
  }
  if (entry.comments) {
    item.comments = entry.comments
  }
  if (entry.extractedComments) {
    item.extractedComments = entry.extractedComments
  }
  if (options.includeOrigins && entry.origins) {
    item.references = entry.origins.map((ref) =>
      formatReference(ref, { includeLineNumbers: options.includeLineNumbers })
    )
  }
  if (entry.obsolete) {
    item.obsolete = true
  }
  if (entry.flags) {
    item.flags = { ...entry.flags }
  }
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

  return Object.entries(catalog).map(([key, entry]) => {
    const item = createItem({ nplurals })
    item.msgid = entry.message ?? key
    applyTranslation(item, entry)
    applyOptionalFields(item, entry, { includeOrigins, includeLineNumbers })
    return item
  })
}

/** Gets the catalog key for an item */
function getCatalogKey(
  item: PoItem,
  useMsgidAsKey: boolean,
  keyGenerator?: (item: PoItem) => string
): string {
  if (useMsgidAsKey) {
    return item.msgid
  }
  if (keyGenerator) {
    return keyGenerator(item)
  }
  return item.msgid
}

/** Adds message field if key differs from msgid */
function addMessageField(
  entry: CatalogEntry,
  item: PoItem,
  key: string,
  useMsgidAsKey: boolean
): void {
  if (!useMsgidAsKey && item.msgid !== key) {
    entry.message = item.msgid
  }
  if (item.msgid_plural) {
    entry.pluralSource = item.msgid_plural
  }
  if (item.msgctxt) {
    entry.context = item.msgctxt
  }
}

/** Adds comments fields to entry if non-empty (handles incomplete items) */
function addCommentsFields(entry: CatalogEntry, item: PoItem): void {
  const comments = item.comments as string[] | undefined
  const extractedComments = item.extractedComments as string[] | undefined
  if (comments && comments.length > 0) {
    entry.comments = comments
  }
  if (extractedComments && extractedComments.length > 0) {
    entry.extractedComments = extractedComments
  }
}

/** Adds metadata fields to an entry (handles incomplete items gracefully) */
function addMetadataFields(entry: CatalogEntry, item: PoItem, includeOrigins: boolean): void {
  addCommentsFields(entry, item)

  const references = item.references as string[] | undefined
  if (includeOrigins && references && references.length > 0) {
    entry.origins = references.map((ref) => parseReference(ref))
  }

  if (item.obsolete) {
    entry.obsolete = true
  }

  const flags = item.flags as Record<string, boolean> | undefined
  if (flags && hasOwnProperties(flags)) {
    entry.flags = { ...flags }
  }
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
    if (!item.msgid) {
      continue
    }

    const key = getCatalogKey(item, useMsgidAsKey, keyGenerator)
    const msgstr = item.msgstr as string[] | undefined
    const entry: CatalogEntry = {
      translation: item.msgid_plural ? (msgstr ?? []) : (msgstr?.[0] ?? "")
    }

    addMessageField(entry, item, key, useMsgidAsKey)
    addMetadataFields(entry, item, includeOrigins)
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
    const existing = merged[key]
    if (existing) {
      // Merge with existing entry
      merged[key] = {
        ...existing,
        ...update,
        // Merge arrays instead of replacing
        comments: update.comments ?? existing.comments,
        extractedComments: update.extractedComments ?? existing.extractedComments,
        origins: update.origins ?? existing.origins,
        flags: { ...existing.flags, ...update.flags }
      }
    } else {
      merged[key] = { ...update }
    }
  }

  return merged
}
