// Core API
export { parsePo, createPoFile } from "./parse"
export { stringifyPo } from "./stringify"
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
export {
  parsePluralForms,
  getPluralCategories,
  getPluralCount,
  getPluralFormsHeader,
  getPluralFunction,
  getPluralSamples,
  parsePluralFormsHeader
} from "./plurals"

// Comment utilities
export { splitMultilineComments } from "./comments"

// ICU MessageFormat utilities
export {
  // Parsing
  parseIcu,
  IcuParser,
  IcuSyntaxError,
  extractVariables,
  extractVariableInfo,
  validateIcu,
  compareVariables,
  hasPlural,
  hasSelect,
  hasIcuSyntax,
  IcuNodeType,
  IcuErrorKind,
  // Conversion (Gettext ↔ ICU)
  gettextToIcu,
  isPluralItem,
  normalizeItemToIcu,
  normalizeToIcu,
  icuToGettextSource
} from "./icu/index"

// Serialization utilities
export { DEFAULT_SERIALIZE_OPTIONS } from "./internal/serialization"

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
export type { ParsedPluralFormsResult } from "./plurals"

// ICU MessageFormat types
export type {
  // Conversion types
  GettextToIcuOptions,
  NormalizeToIcuOptions,
  IcuToGettextOptions,
  // Parser types
  IcuNode,
  IcuLiteralNode,
  IcuArgumentNode,
  IcuNumberNode,
  IcuDateNode,
  IcuTimeNode,
  IcuSelectNode,
  IcuPluralNode,
  IcuPoundNode,
  IcuTagNode,
  IcuPluralOption,
  IcuSelectOption,
  IcuLocation,
  IcuPosition,
  IcuParserOptions,
  IcuParseError,
  IcuParseResult,
  IcuVariable,
  IcuValidationResult,
  IcuVariableComparison
} from "./icu/index"
