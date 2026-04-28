import type { IcuNode } from "./icu/types"
import { parseIcu } from "./icu/parser"

/**
 * Options for pseudolocalizing messages.
 */
export interface PseudoLocalizeOptions {
  /** Wrap localized messages with visible boundary markers. @default true */
  wrap?: boolean
  /** Prefix used when wrapping is enabled. @default "[" */
  prefix?: string
  /** Suffix used when wrapping is enabled. @default "]" */
  suffix?: string
  /** Expand alphabetic text to make layout issues easier to spot. @default 0.3 */
  expansion?: number
}

const DEFAULT_OPTIONS: Required<PseudoLocalizeOptions> = {
  wrap: true,
  prefix: "[",
  suffix: "]",
  expansion: 0.3
}

const ACCENTS: Record<string, string> = {
  a: "à",
  b: "ƀ",
  c: "ç",
  d: "ð",
  e: "ë",
  f: "ƒ",
  g: "ğ",
  h: "ĥ",
  i: "ï",
  j: "ĵ",
  k: "ķ",
  l: "ľ",
  m: "ɱ",
  n: "ñ",
  o: "ø",
  p: "þ",
  q: "ɋ",
  r: "ř",
  s: "š",
  t: "ŧ",
  u: "ü",
  v: "ṽ",
  w: "ŵ",
  x: "ẋ",
  y: "ÿ",
  z: "ž",
  A: "À",
  B: "Ɓ",
  C: "Ç",
  D: "Ð",
  E: "Ë",
  F: "Ƒ",
  G: "Ğ",
  H: "Ĥ",
  I: "Ï",
  J: "Ĵ",
  K: "Ķ",
  L: "Ľ",
  M: "Ṁ",
  N: "Ñ",
  O: "Ø",
  P: "Þ",
  Q: "Ɋ",
  R: "Ř",
  S: "Š",
  T: "Ŧ",
  U: "Ü",
  V: "Ṽ",
  W: "Ŵ",
  X: "Ẋ",
  Y: "Ÿ",
  Z: "Ž"
}

/**
 * Pseudolocalizes a message while preserving ICU placeholders, plural/select
 * structure, number/date/time/list formatters, # plural markers, and tag syntax.
 *
 * @example
 * pseudoLocalize("Hello {name} in <b>{count, plural, one {# file} other {# files}}</b>")
 * // → "[Ĥëľľø~~ {name} ïñ~ <b>{count, plural, one {# ƒïľë~} other {# ƒïľëš~~}}</b>]"
 */
export function pseudoLocalize(message: string): string {
  return pseudoLocalizeWithOptions(message)
}

/**
 * Pseudolocalizes a message with configurable wrapping and expansion.
 */
export function pseudoLocalizeWithOptions(
  message: string,
  options: PseudoLocalizeOptions = {}
): string {
  const normalizedOptions = { ...DEFAULT_OPTIONS, ...options }
  const parsed = parseIcu(message, { requiresOtherClause: false })

  if (!parsed.success) {
    return wrap(pseudoTextPreservingSimpleSyntax(message, normalizedOptions), normalizedOptions)
  }

  const localized = serializeNodes(parsed.ast, normalizedOptions)
  return wrap(localized, normalizedOptions)
}

function serializeNodes(nodes: IcuNode[], options: Required<PseudoLocalizeOptions>): string {
  return nodes.map((node) => serializeNode(node, options)).join("")
}

function serializeNode(node: IcuNode, options: Required<PseudoLocalizeOptions>): string {
  if (node.type === "literal") {
    return escapeLiteral(pseudoText(node.value, options.expansion))
  }

  if (node.type === "argument") {
    return `{${node.value}}`
  }

  if (node.type === "plural") {
    return serializePluralNode(node, options)
  }

  if (node.type === "select") {
    return serializeSelectNode(node, options)
  }

  if (node.type === "pound") {
    return "#"
  }

  if (node.type === "tag") {
    return `<${node.value}>${serializeNodes(node.children, options)}</${node.value}>`
  }

  return formatArgument(node.value, node.type, node.style)
}

function serializePluralNode(
  node: Extract<IcuNode, { type: "plural" }>,
  options: Required<PseudoLocalizeOptions>
): string {
  const argumentType = node.pluralType === "ordinal" ? "selectordinal" : "plural"
  const offset = node.offset === 0 ? "" : ` offset:${node.offset}`
  const variants = serializeOptions(node.options, options)
  return `{${node.value}, ${argumentType},${offset} ${variants}}`
}

function serializeSelectNode(
  node: Extract<IcuNode, { type: "select" }>,
  options: Required<PseudoLocalizeOptions>
): string {
  return `{${node.value}, select, ${serializeOptions(node.options, options)}}`
}

function serializeOptions(
  variants: Extract<IcuNode, { type: "plural" | "select" }>["options"],
  options: Required<PseudoLocalizeOptions>
): string {
  return Object.entries(variants)
    .map(([selector, option]) => `${selector} {${serializeNodes(option.value, options)}}`)
    .join(" ")
}

function formatArgument(value: string, type: string, style: string | null): string {
  return style == null || style === "" ? `{${value}, ${type}}` : `{${value}, ${type}, ${style}}`
}

function pseudoText(text: string, expansion: number): string {
  const accented = Array.from(text, (char) => ACCENTS[char] ?? char).join("")
  const letters = Array.from(text).filter((char) => /\p{L}/u.test(char)).length
  const extra = Math.max(0, Math.round(letters * expansion))
  if (extra === 0) {
    return accented
  }

  const trailingWhitespace = /\s+$/u.exec(accented)?.[0] ?? ""
  const body = trailingWhitespace ? accented.slice(0, -trailingWhitespace.length) : accented
  return `${body}${"~".repeat(extra)}${trailingWhitespace}`
}

function escapeLiteral(text: string): string {
  return text.replace(/[{}<>#']/g, (char) => {
    if (char === "'") {
      return "''"
    }
    return `'${char}'`
  })
}

function wrap(text: string, options: Required<PseudoLocalizeOptions>): string {
  if (!options.wrap) {
    return text
  }
  return `${escapeLiteral(options.prefix)}${text}${escapeLiteral(options.suffix)}`
}

function pseudoTextPreservingSimpleSyntax(
  message: string,
  options: Required<PseudoLocalizeOptions>
): string {
  const protectedToken =
    /(<\/?[A-Za-z][\w.-]*(?:\s+[^<>]*)?>|<\/?\d+>|\{[A-Za-z_$][\w$]*(?:\s*,\s*[^{}]+)?\})/g
  let result = ""
  let lastIndex = 0

  for (const match of message.matchAll(protectedToken)) {
    result += pseudoText(message.slice(lastIndex, match.index), options.expansion)
    result += match[0]
    lastIndex = match.index + match[0].length
  }

  result += pseudoText(message.slice(lastIndex), options.expansion)
  return result
}
