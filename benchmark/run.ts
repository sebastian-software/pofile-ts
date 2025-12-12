import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { Bench } from "tinybench"

// pofile-ts (this library)
import { parsePo, stringifyPo } from "pofile-ts"

// Original pofile library
import PO from "pofile"

// gettext-parser
import gettextParser from "gettext-parser"

async function run() {
  const fixturesDir = join(import.meta.dirname, "fixtures")
  const fixturePath = join(fixturesDir, "realistic.po")
  const legacyPath = join(fixturesDir, "large.po")

  // Find fixture
  const path = existsSync(fixturePath) ? fixturePath : legacyPath
  if (!existsSync(path)) {
    console.error("No fixtures found. Run 'pnpm generate-fixture' first.")
    process.exit(1)
  }

  const content = readFileSync(path, "utf-8")
  const sizeKb = Math.round(Buffer.byteLength(content, "utf-8") / 1024)

  // Count entries and plurals
  const lines = content.split("\n")
  let entryCount = 0
  let pluralCount = 0
  for (const line of lines) {
    if (line.startsWith("msgid ") && !line.startsWith('msgid ""')) {
      entryCount++
    }
    if (line.startsWith("msgid_plural ")) {
      pluralCount++
    }
  }

  console.log("\n📊 PO File Benchmark")
  console.log("=".repeat(60))
  console.log(
    `Fixture: ${sizeKb} KB, ${entryCount} entries (~${Math.round((pluralCount / entryCount) * 100)}% plurals)`
  )
  console.log("=".repeat(60))

  // Pre-parse for serialization benchmarks
  const parsedPofileTs = parsePo(content)
  const parsedPofile = PO.parse(content)
  const parsedGettextParser = gettextParser.po.parse(content)

  // Verify data integrity
  const gpTranslationCount = countGettextParserTranslations(parsedGettextParser)
  if (gpTranslationCount < entryCount * 0.9) {
    console.log(
      `\n⚠️  Warning: gettext-parser merged entries (${gpTranslationCount} vs ${entryCount})`
    )
    console.log("   This means gettext-parser benchmark results are not directly comparable.\n")
  }

  // ========== PARSING BENCHMARK ==========
  console.log("\n--- Parsing ---")
  const parseBench = new Bench({ time: 3000, warmupTime: 500 })
  parseBench
    .add("pofile-ts", () => parsePo(content))
    .add("pofile", () => PO.parse(content))
    .add("gettext-parser", () => gettextParser.po.parse(content))

  await parseBench.run()
  printResults(parseBench)

  // ========== SERIALIZATION BENCHMARK ==========
  console.log("\n--- Serialization ---")
  const serializeBench = new Bench({ time: 3000, warmupTime: 500 })
  serializeBench
    .add("pofile-ts", () => stringifyPo(parsedPofileTs))
    .add("pofile", () => parsedPofile.toString())
    .add("gettext-parser", () => gettextParser.po.compile(parsedGettextParser))

  await serializeBench.run()
  printResults(serializeBench)

  // ========== SUMMARY ==========
  console.log("\n" + "=".repeat(60))
  console.log("SUMMARY")
  console.log("=".repeat(60))

  const pofileTsParse = parseBench.tasks.find((t) => t.name === "pofile-ts")!
  const pofileParse = parseBench.tasks.find((t) => t.name === "pofile")!
  const gpParse = parseBench.tasks.find((t) => t.name === "gettext-parser")!

  const pofileTsSerialize = serializeBench.tasks.find((t) => t.name === "pofile-ts")!
  const pofileSerialize = serializeBench.tasks.find((t) => t.name === "pofile")!
  const gpSerialize = serializeBench.tasks.find((t) => t.name === "gettext-parser")!

  console.log("\npofile-ts vs pofile:")
  console.log(
    `  Parsing:       ${(pofileTsParse.result!.hz / pofileParse.result!.hz).toFixed(1)}x faster`
  )
  console.log(
    `  Serialization: ${(pofileTsSerialize.result!.hz / pofileSerialize.result!.hz).toFixed(1)}x faster`
  )

  console.log("\npofile-ts vs gettext-parser:")
  console.log(
    `  Parsing:       ${(pofileTsParse.result!.hz / gpParse.result!.hz).toFixed(1)}x faster`
  )
  console.log(
    `  Serialization: ${(pofileTsSerialize.result!.hz / gpSerialize.result!.hz).toFixed(1)}x faster`
  )

  // Markdown table
  console.log("\n" + "=".repeat(60))
  console.log("MARKDOWN TABLE (for README)")
  console.log("=".repeat(60))
  console.log("\n| Library | Parsing | Serialization |")
  console.log("| ------- | ------: | ------------: |")
  console.log(
    `| **pofile-ts** | **${Math.round(pofileTsParse.result!.hz)} ops/s** | **${Math.round(pofileTsSerialize.result!.hz)} ops/s** |`
  )
  console.log(
    `| gettext-parser | ${Math.round(gpParse.result!.hz)} ops/s | ${Math.round(gpSerialize.result!.hz)} ops/s |`
  )
  console.log(
    `| pofile | ${Math.round(pofileParse.result!.hz)} ops/s | ${Math.round(pofileSerialize.result!.hz)} ops/s |`
  )
}

function printResults(bench: Bench): void {
  console.table(
    bench.tasks.map((task) => ({
      Library: task.name,
      "ops/sec": Math.round(task.result!.hz).toLocaleString(),
      "Mean (ms)": task.result!.mean.toFixed(3)
    }))
  )

  // Relative performance bars
  const fastest = Math.max(...bench.tasks.map((t) => t.result!.hz))
  for (const task of bench.tasks) {
    const relative = (task.result!.hz / fastest) * 100
    const bar = "█".repeat(Math.round(relative / 2))
    console.log(`  ${task.name.padEnd(16)} ${bar} ${relative.toFixed(1)}%`)
  }
}

function countGettextParserTranslations(parsed: ReturnType<typeof gettextParser.po.parse>): number {
  let count = 0
  for (const ctx of Object.values(parsed.translations)) {
    count += Object.keys(ctx).length
  }
  return count - 1 // Subtract header entry
}

run().catch(console.error)
