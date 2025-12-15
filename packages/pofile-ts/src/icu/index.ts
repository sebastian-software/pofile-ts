/**
 * ICU MessageFormat utilities.
 *
 * - Parsing: parseIcu, validateIcu, extractVariables
 * - Conversion: gettextToIcu, icuToGettextSource, normalizeToIcu
 */

export { parseIcu, IcuParser, IcuSyntaxError } from "./parser"

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
  hasIcuSyntax,
  type IcuVariable,
  type IcuValidationResult,
  type IcuVariableComparison
} from "./utils"

export {
  IcuNodeType,
  IcuErrorKind,
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
