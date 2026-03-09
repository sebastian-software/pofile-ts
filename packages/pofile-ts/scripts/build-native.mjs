import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageDir = resolve(scriptDir, "..")
const repoRoot = resolve(packageDir, "../..")
const profile = process.argv.includes("--release") ? "release" : "debug"

const cargoArgs = ["build", "-p", "pofile-node"]
if (profile === "release") {
  cargoArgs.push("--release")
}

const cargoResult = spawnSync("cargo", cargoArgs, {
  cwd: repoRoot,
  stdio: "inherit"
})

if (cargoResult.status !== 0) {
  process.exit(cargoResult.status ?? 1)
}

const libPrefix = process.platform === "win32" ? "" : "lib"
const libExtension =
  process.platform === "win32" ? "dll" : process.platform === "darwin" ? "dylib" : "so"

const sourcePath = resolve(repoRoot, "target", profile, `${libPrefix}pofile_node.${libExtension}`)
if (!existsSync(sourcePath)) {
  throw new Error(`Native library not found at ${sourcePath}`)
}

const outputPath = resolve(packageDir, "native", "pofile-node.node")
mkdirSync(dirname(outputPath), { recursive: true })
copyFileSync(sourcePath, outputPath)

process.stdout.write(`Copied native binding to ${outputPath}\n`)
