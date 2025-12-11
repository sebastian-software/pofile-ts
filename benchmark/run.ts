import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Bench } from "tinybench"

// pofile-ts (this library)
import { parsePo, stringifyPo } from "pofile-ts"

// Original pofile library
import PO from "pofile"

// gettext-parser
import gettextParser from "gettext-parser"

// Load fixture
const fixturePath = join(import.meta.dirname, "fixtures", "large.po")
let poContent: string

try {
  poContent = readFileSync(fixturePath, "utf-8")
} catch {
  console.error("Fixture not found. Run 'pnpm generate-fixture' first.")
  process.exit(1)
}

const sizeKb = Math.round(Buffer.byteLength(poContent, "utf-8") / 1024)
console.log(`\nBenchmarking with ${sizeKb} KB PO file\n`)

// Pre-parse for serialization benchmarks
const parsedPofileTs = parsePo(poContent)
const parsedPofile = PO.parse(poContent)
const parsedGettextParser = gettextParser.po.parse(poContent)

// ============================================================================
// PARSING BENCHMARK
// ============================================================================

const parseBench = new Bench({
  name: "Parsing",
  time: 2000,
  warmupTime: 500
})

parseBench
  .add("pofile-ts", () => {
    parsePo(poContent)
  })
  .add("pofile", () => {
    PO.parse(poContent)
  })
  .add("gettext-parser", () => {
    gettextParser.po.parse(poContent)
  })

// ============================================================================
// SERIALIZATION BENCHMARK
// ============================================================================

const serializeBench = new Bench({
  name: "Serialization",
  time: 2000,
  warmupTime: 500
})

serializeBench
  .add("pofile-ts", () => {
    stringifyPo(parsedPofileTs)
  })
  .add("pofile", () => {
    parsedPofile.toString()
  })
  .add("gettext-parser", () => {
    gettextParser.po.compile(parsedGettextParser)
  })

// ============================================================================
// RUN BENCHMARKS
// ============================================================================

async function run() {
  console.log("=".repeat(60))
  console.log("PARSING BENCHMARK")
  console.log("=".repeat(60))

  await parseBench.run()
  console.table(
    parseBench.tasks.map((task) => ({
      Library: task.name,
      "ops/sec": Math.round(task.result!.hz).toLocaleString(),
      "Mean (ms)": task.result!.mean.toFixed(3),
      "Min (ms)": task.result!.min.toFixed(3),
      "Max (ms)": task.result!.max.toFixed(3),
      Samples: task.result!.samples.length
    }))
  )

  // Calculate relative performance
  const parseTasks = parseBench.tasks
  const fastestParse = Math.max(...parseTasks.map((t) => t.result!.hz))
  console.log("\nRelative Performance (parsing):")
  for (const task of parseTasks) {
    const relative = (task.result!.hz / fastestParse) * 100
    const bar = "█".repeat(Math.round(relative / 2))
    console.log(`  ${task.name.padEnd(16)} ${bar} ${relative.toFixed(1)}%`)
  }

  console.log("\n" + "=".repeat(60))
  console.log("SERIALIZATION BENCHMARK")
  console.log("=".repeat(60))

  await serializeBench.run()
  console.table(
    serializeBench.tasks.map((task) => ({
      Library: task.name,
      "ops/sec": Math.round(task.result!.hz).toLocaleString(),
      "Mean (ms)": task.result!.mean.toFixed(3),
      "Min (ms)": task.result!.min.toFixed(3),
      "Max (ms)": task.result!.max.toFixed(3),
      Samples: task.result!.samples.length
    }))
  )

  // Calculate relative performance
  const serializeTasks = serializeBench.tasks
  const fastestSerialize = Math.max(...serializeTasks.map((t) => t.result!.hz))
  console.log("\nRelative Performance (serialization):")
  for (const task of serializeTasks) {
    const relative = (task.result!.hz / fastestSerialize) * 100
    const bar = "█".repeat(Math.round(relative / 2))
    console.log(`  ${task.name.padEnd(16)} ${bar} ${relative.toFixed(1)}%`)
  }

  console.log("\n" + "=".repeat(60))
  console.log("SUMMARY")
  console.log("=".repeat(60))

  const pofileTsParse = parseTasks.find((t) => t.name === "pofile-ts")!
  const pofileTsSerialize = serializeTasks.find((t) => t.name === "pofile-ts")!

  for (const task of parseTasks) {
    if (task.name === "pofile-ts") continue
    const parseRatio = pofileTsParse.result!.hz / task.result!.hz
    const serializeTask = serializeTasks.find((t) => t.name === task.name)!
    const serializeRatio = pofileTsSerialize.result!.hz / serializeTask.result!.hz

    console.log(`\npofile-ts vs ${task.name}:`)
    console.log(
      `  Parsing:       ${parseRatio > 1 ? "+" : ""}${((parseRatio - 1) * 100).toFixed(1)}% (${parseRatio.toFixed(2)}x)`
    )
    console.log(
      `  Serialization: ${serializeRatio > 1 ? "+" : ""}${((serializeRatio - 1) * 100).toFixed(1)}% (${serializeRatio.toFixed(2)}x)`
    )
  }
}

run().catch(console.error)
