/**
 * ICU MessageFormat utilities.
 *
 * - Parsing: parseIcu, validateIcu, extractVariables
 * - Conversion: gettextToIcu, icuToGettextSource, normalizeToIcu
 * - Compilation: compileIcu
 */

export { parseIcu, IcuParser, IcuSyntaxError } from "./parser"

export {
  compileIcu,
  type CompileIcuOptions,
  type CompiledMessageFunction,
  type MessageValues,
  type MessageResult
} from "./compile"

export {
  gettextToIcu,
  isPluralItem,
  normalizeItemToIcu,
  normalizeToIcu,
  icuToGettextSource,
  type GettextToIcuOptions,
  type NormalizeToIcuOptions,
  type IcuToGettextOptions
} from "./conversion"

export {
  extractVariables,
  extractVariableInfo,
  validateIcu,
  compareVariables,
  hasPlural,
  hasSelect,
  hasSelectOrdinal,
  hasIcuSyntax,
  type IcuVariable,
  type IcuValidationResult,
  type IcuVariableComparison
} from "./utils"

export {
  IcuNodeType,
  IcuErrorKind,
  getNodeTypeName,
  type IcuNode,
  type IcuLiteralNode,
  type IcuArgumentNode,
  type IcuNumberNode,
  type IcuDateNode,
  type IcuTimeNode,
  type IcuSelectNode,
  type IcuPluralNode,
  type IcuPoundNode,
  type IcuTagNode,
  type IcuPluralOption,
  type IcuSelectOption,
  type IcuLocation,
  type IcuPosition,
  type IcuParserOptions,
  type IcuParseError,
  type IcuParseResult
} from "./types"
