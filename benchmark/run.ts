import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { Bench, type Task } from "tinybench"

// Number of benchmark runs for median calculation (improves stability)
const MULTI_RUN_COUNT = 3

// pofile-ts (this library)
import {
  parsePo,
  stringifyPo,
  parseIcu,
  compileIcu,
  compileCatalog,
  generateCompiledCode
} from "pofile-ts"
import type { Catalog } from "pofile-ts"

// Competitors
import PO from "pofile"
import gettextParser from "gettext-parser"
import { parse as parseFormatJs } from "@formatjs/icu-messageformat-parser"
import { IntlMessageFormat } from "intl-messageformat"
import { i18n } from "@lingui/core"

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
  await runCompilerBenchmark()
  showFormatComparison()

  console.log("\n" + "═".repeat(70))
  console.log("  Done!")
  console.log("═".repeat(70) + "\n")
}

// ============================================================================
// MULTI-RUN BENCHMARK HELPER
// ============================================================================

interface MultiRunResult {
  name: string
  medianHz: number
  allHz: number[]
  rme: number
}

/**
 * Run a benchmark multiple times and return median results.
 * This provides much more stable numbers for slow benchmarks.
 */
async function runMultiple(
  setupBench: () => Bench,
  runs: number = MULTI_RUN_COUNT
): Promise<MultiRunResult[]> {
  const allResults: Map<string, number[]> = new Map()

  for (let i = 0; i < runs; i++) {
    process.stdout.write(`    Run ${i + 1}/${runs}...`)
    const bench = setupBench()
    await bench.run()

    for (const task of bench.tasks) {
      const existing = allResults.get(task.name) ?? []
      existing.push(task.result!.hz)
      allResults.set(task.name, existing)
    }
    process.stdout.write(` done\n`)
  }

  const results: MultiRunResult[] = []
  for (const [name, hzValues] of allResults) {
    const sorted = [...hzValues].sort((a, b) => a - b)
    const medianHz = sorted[Math.floor(sorted.length / 2)]
    const mean = hzValues.reduce((a, b) => a + b, 0) / hzValues.length
    const variance = hzValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / hzValues.length
    const stdDev = Math.sqrt(variance)
    const rme = (stdDev / mean) * 100 // Relative margin of error

    results.push({ name, medianHz, allHz: hzValues, rme })
  }

  return results
}

function printMultiRunResults(results: MultiRunResult[]): void {
  const fastest = Math.max(...results.map((r) => r.medianHz))

  for (const result of results) {
    const relative = (result.medianHz / fastest) * 100
    const barLength = Math.round(relative / 4)
    const bar = "█".repeat(barLength) + "░".repeat(25 - barLength)
    const isFastest = result.medianHz === fastest
    const rmeStr = result.rme > 2 ? ` ±${result.rme.toFixed(1)}%` : ""

    console.log(
      `    ${result.name.padEnd(16)} ${bar} ${Math.round(result.medianHz).toLocaleString().padStart(8)} ops/s${rmeStr} ${isFastest ? "⚡" : ""}`
    )
  }
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

  // Parsing - use multi-run with median for stable results
  // pofile at ~9 ops/s needs longer time per run to get enough samples
  console.log("\n  Parsing (median of 3 runs):")
  const parseResults = await runMultiple(() => {
    const bench = new Bench({ time: 8000, warmupTime: 500, warmupIterations: 3 })
    bench
      .add("pofile-ts", () => parsePo(content))
      .add("pofile", () => PO.parse(content))
      .add("gettext-parser", () => gettextParser.po.parse(content))
    return bench
  }, MULTI_RUN_COUNT)
  printMultiRunResults(parseResults)

  // Serialization
  console.log("\n  Serialization (median of 3 runs):")
  const serializeResults = await runMultiple(() => {
    const bench = new Bench({ time: 8000, warmupTime: 500, warmupIterations: 3 })
    bench
      .add("pofile-ts", () => stringifyPo(parsedPofileTs))
      .add("pofile", () => parsedPofile.toString())
      .add("gettext-parser", () => gettextParser.po.compile(parsedGettextParser))
    return bench
  }, MULTI_RUN_COUNT)
  printMultiRunResults(serializeResults)

  // Summary using median values
  const pofileTsParse = parseResults.find((r) => r.name === "pofile-ts")!
  const pofileParse = parseResults.find((r) => r.name === "pofile")!
  const gpParse = parseResults.find((r) => r.name === "gettext-parser")!
  const pofileTsSerialize = serializeResults.find((r) => r.name === "pofile-ts")!
  const pofileSerialize = serializeResults.find((r) => r.name === "pofile")!
  const gpSerialize = serializeResults.find((r) => r.name === "gettext-parser")!

  console.log("\n  Summary (median):")
  console.log(
    `    vs pofile:         ${(pofileTsParse.medianHz / pofileParse.medianHz).toFixed(1)}x parse, ${(pofileTsSerialize.medianHz / pofileSerialize.medianHz).toFixed(1)}x serialize`
  )
  console.log(
    `    vs gettext-parser: ${(pofileTsParse.medianHz / gpParse.medianHz).toFixed(1)}x parse, ${(pofileTsSerialize.medianHz / gpSerialize.medianHz).toFixed(1)}x serialize`
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
    const bench = new Bench({ time: 1500, warmupTime: 300, warmupIterations: 5 })
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
  const batchBench = new Bench({ time: 3000, warmupTime: 500, warmupIterations: 5 })
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
// COMPILER & RUNTIME BENCHMARK
// ============================================================================

async function runCompilerBenchmark() {
  console.log("\n┌─ ICU Message Compilation & Runtime ──────────────────────────────┐")
  console.log(`│  pofile-ts (JS functions) vs intl-messageformat vs @lingui (AST)`)
  console.log(`│  Note: @lingui compiles to AST arrays, still interpreted at runtime`)
  console.log("└────────────────────────────────────────────────────────────────────┘")

  // Setup Lingui
  i18n.load("en", {})
  i18n.activate("en")

  // Test messages
  const messages = {
    simple: "Hello, {name}!",
    plural: "{count, plural, one {# item} other {# items}}",
    complex:
      "{userName}, you have {unreadCount, plural, =0 {no messages} one {# message} other {# messages}}"
  }

  // Pre-compile all messages for runtime benchmarks
  const compiledPofileTs = Object.fromEntries(
    Object.entries(messages).map(([k, v]) => [k, compileIcu(v, { locale: "en" })])
  )

  const compiledIntlMF = Object.fromEntries(
    Object.entries(messages).map(([k, v]) => [k, new IntlMessageFormat(v, "en")])
  )

  // Lingui's compiled format is an Array/AST structure
  // We'll test both: raw ICU and pre-compiled AST format
  const linguiMessagesRaw = Object.fromEntries(Object.entries(messages).map(([k, v]) => [k, v]))
  // Pre-compiled AST format (what `lingui compile` produces)
  const linguiMessagesCompiled: Record<string, unknown> = {
    simple: ["Hello, ", ["name"], "!"],
    plural: [["count", "plural", { one: ["#", " item"], other: ["#", " items"] }]],
    complex: [
      ["userName"],
      ", you have ",
      [
        "unreadCount",
        "plural",
        {
          "0": ["no messages"],
          one: ["#", " message"],
          other: ["#", " messages"]
        }
      ]
    ]
  }
  i18n.load("en", linguiMessagesRaw)
  i18n.load("en-compiled", linguiMessagesCompiled)

  // Test values
  const values = {
    simple: { name: "World" },
    plural: { count: 5 },
    complex: { userName: "Alice", unreadCount: 3 }
  }

  // 1. Compilation speed (one-time cost)
  console.log("\n  Compilation (one-time):")
  const compileBench = new Bench({ time: 2000, warmupTime: 400, warmupIterations: 5 })

  compileBench
    .add("pofile-ts compileIcu", () => {
      for (const msg of Object.values(messages)) {
        compileIcu(msg, { locale: "en" })
      }
    })
    .add("intl-messageformat", () => {
      for (const msg of Object.values(messages)) {
        new IntlMessageFormat(msg, "en")
      }
    })

  await compileBench.run()
  printCompactResults(compileBench)

  // 2. Runtime formatting speed (hot path)
  console.log("\n  Runtime formatting (hot path):")
  const runtimeBench = new Bench({ time: 3000, warmupTime: 500, warmupIterations: 10 })

  runtimeBench
    .add("pofile-ts (compiled)", () => {
      compiledPofileTs.simple!(values.simple)
      compiledPofileTs.plural!(values.plural)
      compiledPofileTs.complex!(values.complex)
    })
    .add("intl-messageformat", () => {
      compiledIntlMF.simple!.format(values.simple)
      compiledIntlMF.plural!.format(values.plural)
      compiledIntlMF.complex!.format(values.complex)
    })
    .add("@lingui (raw ICU)", () => {
      i18n.activate("en")
      i18n._("simple", values.simple)
      i18n._("plural", values.plural)
      i18n._("complex", values.complex)
    })
    .add("@lingui (compiled AST)", () => {
      i18n.activate("en-compiled")
      i18n._("simple", values.simple)
      i18n._("plural", values.plural)
      i18n._("complex", values.complex)
    })

  await runtimeBench.run()
  printCompactResults(runtimeBench)

  // 3. Catalog compilation - simulates batch compile at build time
  console.log("\n  Catalog compilation (200 ICU messages):")

  // Create a test catalog with 200 entries
  const testCatalog: Catalog = {}
  for (let i = 0; i < 100; i++) {
    testCatalog[`Message ${i}: {name}`] = {
      translation: `Nachricht ${i}: {name}`
    }
    testCatalog[`{count} item ${i}`] = {
      translation: "{count, plural, one {# Artikel} other {# Artikel}}"
    }
  }

  // Also build equivalent intl-messageformat catalog for comparison
  const catalogBench = new Bench({ time: 3000, warmupTime: 500, warmupIterations: 5 })

  catalogBench
    .add("pofile-ts", () => {
      compileCatalog(testCatalog, { locale: "de", useMessageId: false })
    })
    .add("intl-messageformat", () => {
      const result: Record<string, IntlMessageFormat> = {}
      for (const [key, entry] of Object.entries(testCatalog)) {
        if (entry.translation && typeof entry.translation === "string") {
          result[key] = new IntlMessageFormat(entry.translation, "de")
        }
      }
    })

  await catalogBench.run()
  printCompactResults(catalogBench)

  const pofileTask = catalogBench.tasks.find((t) => t.name === "pofile-ts")!
  const intlTask = catalogBench.tasks.find((t) => t.name === "intl-messageformat")!
  const catalogRatio = pofileTask.result!.hz / intlTask.result!.hz

  console.log(
    `    → ${catalogRatio.toFixed(1)}x faster, ~${Math.round(pofileTask.result!.hz * 200).toLocaleString()} messages/s`
  )

  // Summary
  const compilePofileTs = compileBench.tasks.find((t) => t.name === "pofile-ts compileIcu")!
  const compileIntlMF = compileBench.tasks.find((t) => t.name === "intl-messageformat")!
  const runtimePofileTs = runtimeBench.tasks.find((t) => t.name === "pofile-ts (compiled)")!
  const runtimeIntlMF = runtimeBench.tasks.find((t) => t.name === "intl-messageformat")!
  const runtimeLinguiRaw = runtimeBench.tasks.find((t) => t.name === "@lingui (raw ICU)")!
  const runtimeLinguiCompiled = runtimeBench.tasks.find((t) => t.name === "@lingui (compiled AST)")!

  console.log("\n  Summary:")
  console.log(
    `    Compilation: ${(compilePofileTs.result!.hz / compileIntlMF.result!.hz).toFixed(1)}x vs intl-messageformat`
  )
  console.log(
    `    Runtime:     ${(runtimePofileTs.result!.hz / runtimeIntlMF.result!.hz).toFixed(1)}x vs intl-messageformat`
  )
  console.log(
    `                 ${(runtimePofileTs.result!.hz / runtimeLinguiRaw.result!.hz).toFixed(1)}x vs @lingui (raw), ${(runtimePofileTs.result!.hz / runtimeLinguiCompiled.result!.hz).toFixed(1)}x vs @lingui (compiled)`
  )
}

// ============================================================================
// FORMAT COMPARISON
// ============================================================================

function showFormatComparison() {
  console.log("\n┌─ Format Comparison: Input → Output ─────────────────────────────┐")
  console.log("│  How each library handles the same ICU message")
  console.log("└────────────────────────────────────────────────────────────────────┘")

  const examples = [
    {
      name: "Simple interpolation",
      input: "Hello {name}!",
      values: { name: "World" }
    },
    {
      name: "Plural",
      input: "{count, plural, one {# item} other {# items}}",
      values: { count: 5 }
    },
    {
      name: "Select + Plural (nested)",
      input:
        "{gender, select, male {He has {n, plural, one {# car} other {# cars}}} female {She has {n, plural, one {# car} other {# cars}}} other {They have {n, plural, one {# car} other {# cars}}}}",
      values: { gender: "female", n: 2 }
    }
  ]

  for (const { name, input, values } of examples) {
    console.log(`\n  ${name}:`)
    console.log(`  ┌─ Input: ${input.length > 50 ? input.slice(0, 50) + "..." : input}`)
    console.log(`  │`)

    // pofile-ts compiled output
    const pofileTsFn = compileIcu(input, { locale: "en" })
    const pofileTsResult = pofileTsFn(values)
    console.log(`  ├─ pofile-ts (compiled fn):`)
    console.log(`  │    Result: "${pofileTsResult}"`)

    // intl-messageformat output
    const intlMF = new IntlMessageFormat(input, "en")
    const intlResult = intlMF.format(values)
    console.log(`  ├─ intl-messageformat:`)
    console.log(`  │    Result: "${intlResult}"`)

    // Lingui output (raw ICU)
    i18n.load("en-US", { example: input })
    i18n.activate("en-US")
    const linguiResult = i18n._("example", values)
    console.log(`  ├─ @lingui/core (raw ICU):`)
    console.log(`  │    Result: "${linguiResult}"`)

    console.log(`  │`)
    console.log(
      `  └─ All produce same output: ${pofileTsResult === intlResult && intlResult === linguiResult ? "✓" : "✗"}`
    )
  }

  // Show generated code comparison
  console.log("\n  Generated Code Comparison (Build Output):")
  console.log("  ─────────────────────────────────────────")

  const sampleCatalog: Catalog = {
    "Hello {name}!": { translation: "Hallo {name}!" },
    "{count, plural, one {# item} other {# items}}": {
      translation: "{count, plural, one {# Artikel} other {# Artikel}}"
    }
  }

  console.log("\n  pofile-ts generateCompiledCode():")
  const generatedCode = generateCompiledCode(sampleCatalog, { locale: "de", useMessageId: false })
  // Show first ~20 lines
  const codeLines = generatedCode.split("\n").slice(0, 25)
  for (const line of codeLines) {
    console.log(`    ${line}`)
  }
  if (generatedCode.split("\n").length > 25) {
    console.log(`    ... (${generatedCode.split("\n").length - 25} more lines)`)
  }

  console.log("\n  @lingui compiled catalog format:")
  console.log(`    // Lingui compiles to Array/AST format, interpreted at runtime:`)
  console.log(`    {`)
  console.log(`      "abc123": ["Hallo ", ["name"], "!"],`)
  console.log(`      "def456": [["count", "plural", {`)
  console.log(`        "one": ["#", " Artikel"],`)
  console.log(`        "other": ["#", " Artikel"]`)
  console.log(`      }]]`)
  console.log(`    }`)
  console.log(`    // Runtime walks this AST structure to produce output`)

  console.log("\n  intl-messageformat (for comparison):")
  console.log(`    // No static compilation - creates IntlMessageFormat at runtime:`)
  console.log(`    new IntlMessageFormat("Hallo {name}!", "de")`)
}

// ============================================================================
// HELPERS
// ============================================================================

function printCompactResults(bench: Bench): void {
  const fastest = Math.max(...bench.tasks.map((t) => t.result!.hz))

  for (const task of bench.tasks) {
    const hz = task.result!.hz
    const rme = task.result!.rme // Relative Margin of Error (%)
    const relative = (hz / fastest) * 100
    const barLength = Math.round(relative / 4)
    const bar = "█".repeat(barLength) + "░".repeat(25 - barLength)
    const isFastest = hz === fastest

    // Show RME if > 2% (indicates less stable measurement)
    const rmeStr = rme > 2 ? ` ±${rme.toFixed(1)}%` : ""
    console.log(
      `    ${task.name.padEnd(16)} ${bar} ${Math.round(hz).toLocaleString().padStart(8)} ops/s${rmeStr} ${isFastest ? "⚡" : ""}`
    )
  }
}

run().catch(console.error)
