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

// Compilation
export { compileCatalog, generateCompiledCode } from "./compile"

// Message ID generation
export { generateMessageId, generateMessageIdSync, generateMessageIds } from "./messageId"

// Plural utilities
export { parsePluralForms, getPluralCategories, getPluralCount, getPluralFunction } from "./plurals"

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
  icuToGettextSource,
  // Compilation
  compileIcu
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
export type { CompileCatalogOptions, CompiledCatalog, GenerateCodeOptions } from "./compile"
export type { GenerateIdsOptions } from "./messageId"

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
  IcuVariableComparison,
  // Compile types
  CompileIcuOptions,
  CompiledMessageFunction,
  MessageValues,
  MessageResult
} from "./icu/index"
