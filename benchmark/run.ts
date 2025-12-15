import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { Bench } from "tinybench"

// pofile-ts (this library)
import { parsePo, stringifyPo, parseIcu } from "pofile-ts"

// Competitors
import PO from "pofile"
import gettextParser from "gettext-parser"
import { parse as parseFormatJs } from "@formatjs/icu-messageformat-parser"

// ICU test messages
const icuMessages = {
  simple: "Hello, world!",
  argument: "Hello, {name}!",
  number: "{price, number, ::currency/EUR}",
  plural: "{count, plural, one {# item} other {# items}}",
  select: "{gender, select, male {He} female {She} other {They}} liked your post.",
  nested:
    "{gender, select, male {{count, plural, one {He has # car} other {He has # cars}}} female {{count, plural, one {She has # car} other {She has # cars}}} other {{count, plural, one {They have # car} other {They have # cars}}}}",
  tags: "Click <b>here</b> to <a>continue</a>.",
  realistic:
    "{userName}, you have {unreadCount, plural, =0 {no unread messages} one {<b>#</b> unread message} other {<b>#</b> unread messages}} in your <link>inbox</link>."
}

async function run() {
  console.log("\n" + "═".repeat(70))
  console.log("  📊 pofile-ts Benchmark Suite")
  console.log("═".repeat(70))

  await runPoFileBenchmark()
  await runIcuBenchmark()

  console.log("\n" + "═".repeat(70))
  console.log("  Done!")
  console.log("═".repeat(70) + "\n")
}

// ============================================================================
// PO FILE BENCHMARK
// ============================================================================

async function runPoFileBenchmark() {
  const fixturesDir = join(import.meta.dirname, "fixtures")
  const fixturePath = join(fixturesDir, "realistic.po")
  const legacyPath = join(fixturesDir, "large.po")

  const path = existsSync(fixturePath) ? fixturePath : legacyPath
  if (!existsSync(path)) {
    console.error("\n⚠️  No PO fixtures found. Run 'pnpm generate-fixture' first.")
    return
  }

  const content = readFileSync(path, "utf-8")
  const sizeKb = Math.round(Buffer.byteLength(content, "utf-8") / 1024)

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

  console.log("\n┌─ PO File Parsing & Serialization ─────────────────────────────────┐")
  console.log(
    `│  Fixture: ${sizeKb} KB, ${entryCount} entries (~${Math.round((pluralCount / entryCount) * 100)}% plurals)`
  )
  console.log("└────────────────────────────────────────────────────────────────────┘")

  const parsedPofileTs = parsePo(content)
  const parsedPofile = PO.parse(content)
  const parsedGettextParser = gettextParser.po.parse(content)

  // Parsing
  console.log("\n  Parsing:")
  const parseBench = new Bench({ time: 2000, warmupTime: 300 })
  parseBench
    .add("pofile-ts", () => parsePo(content))
    .add("pofile", () => PO.parse(content))
    .add("gettext-parser", () => gettextParser.po.parse(content))

  await parseBench.run()
  printCompactResults(parseBench)

  // Serialization
  console.log("\n  Serialization:")
  const serializeBench = new Bench({ time: 2000, warmupTime: 300 })
  serializeBench
    .add("pofile-ts", () => stringifyPo(parsedPofileTs))
    .add("pofile", () => parsedPofile.toString())
    .add("gettext-parser", () => gettextParser.po.compile(parsedGettextParser))

  await serializeBench.run()
  printCompactResults(serializeBench)

  // Summary
  const pofileTsParse = parseBench.tasks.find((t) => t.name === "pofile-ts")!
  const pofileParse = parseBench.tasks.find((t) => t.name === "pofile")!
  const gpParse = parseBench.tasks.find((t) => t.name === "gettext-parser")!
  const pofileTsSerialize = serializeBench.tasks.find((t) => t.name === "pofile-ts")!
  const pofileSerialize = serializeBench.tasks.find((t) => t.name === "pofile")!
  const gpSerialize = serializeBench.tasks.find((t) => t.name === "gettext-parser")!

  console.log("\n  Summary:")
  console.log(
    `    vs pofile:         ${(pofileTsParse.result!.hz / pofileParse.result!.hz).toFixed(1)}x parse, ${(pofileTsSerialize.result!.hz / pofileSerialize.result!.hz).toFixed(1)}x serialize`
  )
  console.log(
    `    vs gettext-parser: ${(pofileTsParse.result!.hz / gpParse.result!.hz).toFixed(1)}x parse, ${(pofileTsSerialize.result!.hz / gpSerialize.result!.hz).toFixed(1)}x serialize`
  )
}

// ============================================================================
// ICU PARSER BENCHMARK
// ============================================================================

async function runIcuBenchmark() {
  console.log("\n┌─ ICU MessageFormat Parsing ───────────────────────────────────────┐")
  console.log(`│  ${Object.keys(icuMessages).length} message patterns (simple → nested)`)
  console.log("└────────────────────────────────────────────────────────────────────┘")

  const patternResults: Array<{ name: string; pofileTsHz: number; formatJsHz: number }> = []

  // Per-pattern benchmarks
  for (const [name, message] of Object.entries(icuMessages)) {
    console.log(`\n  ${name}:`)
    const bench = new Bench({ time: 800, warmupTime: 150 })
    bench
      .add("pofile-ts", () => parseIcu(message))
      .add("@formatjs", () => parseFormatJs(message, { ignoreTag: false }))

    await bench.run()
    printCompactResults(bench)

    const pofileTsHz = bench.tasks.find((t) => t.name === "pofile-ts")!.result!.hz
    const formatJsHz = bench.tasks.find((t) => t.name === "@formatjs")!.result!.hz
    patternResults.push({ name, pofileTsHz, formatJsHz })
  }

  // Batch benchmark
  const allMessages = Object.values(icuMessages)
  console.log("\n  batch (all patterns):")
  const batchBench = new Bench({ time: 2000, warmupTime: 300 })
  batchBench
    .add("pofile-ts", () => {
      for (const msg of allMessages) {
        parseIcu(msg)
      }
    })
    .add("@formatjs", () => {
      for (const msg of allMessages) {
        parseFormatJs(msg, { ignoreTag: false })
      }
    })

  await batchBench.run()
  printCompactResults(batchBench)

  // Summary
  const batchPofileTs = batchBench.tasks.find((t) => t.name === "pofile-ts")!
  const batchFormatJs = batchBench.tasks.find((t) => t.name === "@formatjs")!
  const avgRatio =
    patternResults.reduce((sum, r) => sum + r.pofileTsHz / r.formatJsHz, 0) / patternResults.length

  console.log("\n  Summary:")
  console.log(
    `    vs @formatjs: ${avgRatio.toFixed(1)}x faster (avg), ${(batchPofileTs.result!.hz / batchFormatJs.result!.hz).toFixed(1)}x faster (batch)`
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function printCompactResults(bench: Bench): void {
  const fastest = Math.max(...bench.tasks.map((t) => t.result!.hz))

  for (const task of bench.tasks) {
    const hz = task.result!.hz
    const relative = (hz / fastest) * 100
    const barLength = Math.round(relative / 4)
    const bar = "█".repeat(barLength) + "░".repeat(25 - barLength)
    const isFastest = hz === fastest

    console.log(
      `    ${task.name.padEnd(16)} ${bar} ${Math.round(hz).toLocaleString().padStart(8)} ops/s ${isFastest ? "⚡" : ""}`
    )
  }
}

run().catch(console.error)
