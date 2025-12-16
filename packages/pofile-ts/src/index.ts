// Core API
export { parsePo, createPoFile } from "./parse"
export { stringifyPo } from "./stringify"
export { createItem, stringifyItem } from "./Item"

// Header utilities
export { createDefaultHeaders, formatPoDate, getPluralFormsHeader } from "./headers"

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
  hasSelectOrdinal,
  hasIcuSyntax,
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
export { DEFAULT_SERIALIZE_OPTIONS, foldLine, formatKeyword } from "./internal/serialization"

// Low-level parsing utilities
export { escapeString, unescapeString, extractString } from "./internal/utils"
export { splitHeaderAndBody, parseHeaders, parseItems } from "./internal/parser"

// Code generation utilities (for build tools)
export {
  extractPluralVariable,
  safeVarName,
  sanitizeStyle,
  escapeTemplateString,
  escapeComment,
  getNumberOptionsForStyle,
  generatePluralFunctionCode,
  generateFormatterDeclarations,
  createCodeGenContext,
  generateNodesCode,
  generateNodeCode
} from "./internal/codegen"

// Types
export type {
  Headers,
  ParsedPluralForms,
  PoFile,
  PoItem,
  CreateItemOptions,
  SerializeOptions,
  ParserState
} from "./types"

// Internal types (for advanced use cases)
export type { CodeGenContext, MessageCodeResult } from "./internal/codegen"

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
  IcuListNode,
  IcuDurationNode,
  IcuAgoNode,
  IcuNameNode,
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
