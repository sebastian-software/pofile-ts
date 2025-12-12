// Main functions
export { parsePo, stringifyPo, createPoFile, parsePluralForms } from "./PO"
export { createItem, stringifyItem } from "./Item"

// Header utilities
export { createDefaultHeaders, formatPoDate } from "./headers"

// Reference utilities
export {
  parseReference,
  formatReference,
  parseReferences,
  formatReferences,
  createReference,
  normalizeFilePath
} from "./references"

// Catalog utilities
export { catalogToItems, itemsToCatalog, mergeCatalogs } from "./catalog"

// Message ID generation
export { generateMessageId, generateMessageIdSync, generateMessageIds } from "./messageId"

// Plural utilities
export { getPluralCategories, getPluralCount, getPluralFormsHeader } from "./plurals"

// ICU conversion
export {
  gettextToIcu,
  isPluralItem,
  normalizeItemToIcu,
  normalizeToIcu,
  icuToGettextSource
} from "./icu"

// Serialization utilities
export { DEFAULT_SERIALIZE_OPTIONS } from "./serialization"

// Types
export type {
  Headers,
  ParsedPluralForms,
  PoFile,
  PoItem,
  CreateItemOptions,
  SerializeOptions
} from "./types"

export type { CreateHeadersOptions } from "./headers"
export type { SourceReference, FormatReferenceOptions } from "./references"
export type { Catalog, CatalogEntry, CatalogToItemsOptions, ItemsToCatalogOptions } from "./catalog"
export type { GenerateIdsOptions } from "./messageId"
export type { GettextToIcuOptions, NormalizeToIcuOptions } from "./icu"
