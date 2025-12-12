import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { Bench } from "tinybench"

// pofile-ts (this library)
import { parsePo, stringifyPo } from "pofile-ts"

// Original pofile library
import PO from "pofile"

// gettext-parser
import gettextParser from "gettext-parser"

interface BenchmarkResult {
  library: string
  parseOps: number
  serializeOps: number
}

async function benchmarkFixture(
  name: string,
  content: string,
  sizeKb: number
): Promise<BenchmarkResult[]> {
  console.log(`\n${"=".repeat(70)}`)
  console.log(`BENCHMARK: ${name} (${sizeKb} KB)`)
  console.log("=".repeat(70))

  // Pre-parse for serialization benchmarks
  const parsedPofileTs = parsePo(content)
  const parsedPofile = PO.parse(content)
  const parsedGettextParser = gettextParser.po.parse(content)

  // Parsing benchmark
  const parseBench = new Bench({ time: 2000, warmupTime: 500 })
  parseBench
    .add("pofile-ts", () => parsePo(content))
    .add("pofile", () => PO.parse(content))
    .add("gettext-parser", () => gettextParser.po.parse(content))

  console.log("\nParsing:")
  await parseBench.run()
  console.table(
    parseBench.tasks.map((task) => ({
      Library: task.name,
      "ops/sec": Math.round(task.result!.hz).toLocaleString(),
      "Mean (ms)": task.result!.mean.toFixed(3)
    }))
  )

  // Serialization benchmark
  const serializeBench = new Bench({ time: 2000, warmupTime: 500 })
  serializeBench
    .add("pofile-ts", () => stringifyPo(parsedPofileTs))
    .add("pofile", () => parsedPofile.toString())
    .add("gettext-parser", () => gettextParser.po.compile(parsedGettextParser))

  console.log("\nSerialization:")
  await serializeBench.run()
  console.table(
    serializeBench.tasks.map((task) => ({
      Library: task.name,
      "ops/sec": Math.round(task.result!.hz).toLocaleString(),
      "Mean (ms)": task.result!.mean.toFixed(3)
    }))
  )

  return parseBench.tasks.map((task) => ({
    library: task.name,
    parseOps: Math.round(task.result!.hz),
    serializeOps: Math.round(serializeBench.tasks.find((t) => t.name === task.name)!.result!.hz)
  }))
}

async function run() {
  const fixturesDir = join(import.meta.dirname, "fixtures")

  // Check for fixtures
  const simplePath = join(fixturesDir, "simple.po")
  const pluralPath = join(fixturesDir, "plural.po")
  const legacyPath = join(fixturesDir, "large.po")

  // Determine which fixtures exist
  const hasNewFixtures = existsSync(simplePath) && existsSync(pluralPath)
  const hasLegacyFixture = existsSync(legacyPath)

  if (!hasNewFixtures && !hasLegacyFixture) {
    console.error("No fixtures found. Run 'pnpm generate-fixture' first.")
    process.exit(1)
  }

  const results: Map<string, BenchmarkResult[]> = new Map()

  if (hasNewFixtures) {
    // New benchmark with both formats
    const simpleContent = readFileSync(simplePath, "utf-8")
    const pluralContent = readFileSync(pluralPath, "utf-8")

    const simpleSizeKb = Math.round(Buffer.byteLength(simpleContent, "utf-8") / 1024)
    const pluralSizeKb = Math.round(Buffer.byteLength(pluralContent, "utf-8") / 1024)

    console.log("\n📊 PO File Benchmark")
    console.log("Comparing pofile-ts with alternatives on different PO formats\n")
    console.log("Fixtures:")
    console.log(`  • simple.po: ${simpleSizeKb} KB - Singular translations (typical UI strings)`)
    console.log(
      `  • plural.po: ${pluralSizeKb} KB - Native Gettext plurals (msgid_plural/msgstr[n])`
    )

    results.set(
      "Simple (singular)",
      await benchmarkFixture("Simple (singular)", simpleContent, simpleSizeKb)
    )
    results.set(
      "Plural (native Gettext)",
      await benchmarkFixture("Plural (native Gettext)", pluralContent, pluralSizeKb)
    )
  } else {
    // Legacy benchmark with single file
    const content = readFileSync(legacyPath, "utf-8")
    const sizeKb = Math.round(Buffer.byteLength(content, "utf-8") / 1024)
    results.set("Mixed", await benchmarkFixture("Mixed", content, sizeKb))
  }

  // Summary
  console.log("\n" + "=".repeat(70))
  console.log("SUMMARY")
  console.log("=".repeat(70))

  for (const [fixtureName, benchResults] of results) {
    console.log(`\n${fixtureName}:`)

    const pofileTs = benchResults.find((r) => r.library === "pofile-ts")!
    const pofile = benchResults.find((r) => r.library === "pofile")!
    const gettextParser = benchResults.find((r) => r.library === "gettext-parser")!

    console.log(`  pofile-ts vs pofile:`)
    console.log(`    Parsing:       ${(pofileTs.parseOps / pofile.parseOps).toFixed(1)}x faster`)
    console.log(
      `    Serialization: ${(pofileTs.serializeOps / pofile.serializeOps).toFixed(1)}x faster`
    )

    console.log(`  pofile-ts vs gettext-parser:`)
    console.log(
      `    Parsing:       ${(pofileTs.parseOps / gettextParser.parseOps).toFixed(1)}x faster`
    )
    console.log(
      `    Serialization: ${(pofileTs.serializeOps / gettextParser.serializeOps).toFixed(1)}x faster`
    )
  }

  // Markdown table for README
  console.log("\n" + "=".repeat(70))
  console.log("MARKDOWN TABLE (for README)")
  console.log("=".repeat(70))

  console.log("\n| Format | Library | Parsing | Serialization |")
  console.log("| ------ | ------- | ------: | ------------: |")

  for (const [fixtureName, benchResults] of results) {
    const formatName = fixtureName.includes("Simple")
      ? "Simple"
      : fixtureName.includes("Plural")
        ? "Plural"
        : "Mixed"
    for (const result of benchResults) {
      const isFastest = result.library === "pofile-ts"
      const libraryCell = isFastest ? `**${result.library}**` : result.library
      const parseCell = isFastest ? `**${result.parseOps} ops/s**` : `${result.parseOps} ops/s`
      const serializeCell = isFastest
        ? `**${result.serializeOps} ops/s**`
        : `${result.serializeOps} ops/s`
      console.log(`| ${formatName} | ${libraryCell} | ${parseCell} | ${serializeCell} |`)
    }
  }
}

run().catch(console.error)
