import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import type { PoFile, SerializeOptions } from "./types"

const require = createRequire(import.meta.url)
const NATIVE_BINDING_PATH = fileURLToPath(new URL("../native/pofile-node.node", import.meta.url))

interface NativeBinding {
  parsePoJson(input: string): string
  stringifyPoJson(input: string, optionsJson?: string | null): string
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

export function parsePoWithNative(input: string): PoFile | null {
  const binding = loadBinding()
  if (!binding) {
    return null
  }
  return JSON.parse(binding.parsePoJson(input)) as PoFile
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
