import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import type { PoFile, SerializeOptions } from "./types"
import type { IcuParseResult, IcuParserOptions } from "./icu/types"

const require = createRequire(import.meta.url)
const NATIVE_BINDING_PATH = fileURLToPath(new URL("../native/pofile-node.node", import.meta.url))

interface NativeBinding {
  parsePoJson(input: string): string
  parseIcuJson(message: string, optionsJson?: string | null): string
  stringifyPoJson(input: string, optionsJson?: string | null): string
  compileIcuJson(message: string, optionsJson: string): number
  formatCompiledMessageJson(handle: number, valuesJson?: string | null): string
  freeCompiledMessage(handle: number): void
  compileCatalogJson(catalogJson: string, optionsJson: string): number
  serializeCompiledCatalogJson(catalogJson: string, optionsJson: string): string
  formatCompiledCatalogJson(handle: number, key: string, valuesJson?: string | null): string
  compiledCatalogHas(handle: number, key: string): boolean
  compiledCatalogKeysJson(handle: number): string
  compiledCatalogSize(handle: number): number
  compiledCatalogLocale(handle: number): string
  freeCompiledCatalog(handle: number): void
  bindingVersion(): string
}

let bindingCache: NativeBinding | null | undefined

function shouldForceNative(): boolean {
  return process.env.POFILE_USE_NATIVE === "1"
}

function loadBinding(): NativeBinding | null {
  if (bindingCache !== undefined) {
    return bindingCache
  }

  if (!existsSync(NATIVE_BINDING_PATH)) {
    if (shouldForceNative()) {
      throw new Error(
        `Native binding missing at ${NATIVE_BINDING_PATH}. Run \`pnpm --filter pofile-ts build:native\` first.`
      )
    }
    bindingCache = null
    return bindingCache
  }

  try {
    bindingCache = require(NATIVE_BINDING_PATH) as NativeBinding
    return bindingCache
  } catch (error) {
    if (shouldForceNative()) {
      throw error
    }
    bindingCache = null
    return bindingCache
  }
}

export function getNativeBinding(): NativeBinding | null {
  return loadBinding()
}

export function __setNativeBindingCacheForTesting(binding: NativeBinding | null | undefined): void {
  bindingCache = binding
}

export function parsePoWithNative(input: string): PoFile | null {
  const binding = loadBinding()
  if (!binding) {
    return null
  }
  return JSON.parse(binding.parsePoJson(input)) as PoFile
}

export function parseIcuWithNative(
  message: string,
  options?: IcuParserOptions
): IcuParseResult | null {
  const binding = loadBinding()
  if (!binding) {
    return null
  }

  return JSON.parse(
    binding.parseIcuJson(message, options ? JSON.stringify(options) : null)
  ) as IcuParseResult
}

export function stringifyPoWithNative(
  po: Partial<PoFile>,
  options?: SerializeOptions
): string | null {
  const binding = loadBinding()
  if (!binding) {
    return null
  }

  return binding.stringifyPoJson(JSON.stringify(po), options ? JSON.stringify(options) : null)
}

type NativeValue = string | number | boolean | NativeValue[]

export function canSerializeNativeValues(values: Record<string, unknown> | undefined): boolean {
  if (!values) {
    return true
  }

  return Object.values(values).every(isNativeValue)
}

export function stringifyNativeValues(values: Record<string, unknown> | undefined): string | null {
  if (!values || Object.keys(values).length === 0) {
    return null
  }

  const normalized = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, normalizeNativeValue(value)])
  )

  return JSON.stringify(normalized)
}

function isNativeValue(value: unknown): value is NativeValue {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true
  }

  if (Array.isArray(value)) {
    return value.every(isNativeValue)
  }

  return false
}

function normalizeNativeValue(value: unknown): NativeValue {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(normalizeNativeValue)
  }

  throw new Error("Unsupported native message value")
}
