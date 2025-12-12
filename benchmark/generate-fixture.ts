import { writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const ENTRY_COUNT = 10000
const PLURAL_RATIO = 0.1 // 10% plurals - realistic for typical apps

/**
 * Generates a realistic PO file with mixed singular and plural translations.
 * Approximately 10% of entries are plurals, reflecting real-world usage.
 */
function generateRealisticPo(entryCount: number, pluralRatio: number): string {
  const lines: string[] = []

  // Header
  lines.push(`# Realistic PO file for benchmarking`)
  lines.push(`# Generated with ${entryCount} entries (~${Math.round(pluralRatio * 100)}% plurals)`)
  lines.push(`#`)
  lines.push(`msgid ""`)
  lines.push(`msgstr ""`)
  lines.push(`"Project-Id-Version: Benchmark\\n"`)
  lines.push(`"POT-Creation-Date: 2024-01-01 00:00+0000\\n"`)
  lines.push(`"PO-Revision-Date: 2024-01-01 00:00+0000\\n"`)
  lines.push(`"Language-Team: German\\n"`)
  lines.push(`"MIME-Version: 1.0\\n"`)
  lines.push(`"Content-Type: text/plain; charset=UTF-8\\n"`)
  lines.push(`"Content-Transfer-Encoding: 8bit\\n"`)
  lines.push(`"Plural-Forms: nplurals=2; plural=(n != 1);\\n"`)
  lines.push(`"Language: de\\n"`)
  lines.push(``)

  let pluralCount = 0

  for (let i = 0; i < entryCount; i++) {
    const isPlural = Math.random() < pluralRatio
    const hasComment = i % 4 === 0
    const hasReference = i % 3 === 0
    const isMultiLine = i % 50 === 0

    if (hasComment) {
      lines.push(`#. Auto-generated comment for entry ${i}`)
    }

    if (hasReference) {
      lines.push(`#: src/components/Component${i % 100}.tsx:${10 + (i % 50)}`)
    }

    // Every msgid is unique (entry index ensures no duplicates)
    if (isPlural) {
      pluralCount++
      lines.push(`msgid "msg_${i}_one item"`)
      lines.push(`msgid_plural "msg_${i}_{count} items"`)
      lines.push(`msgstr[0] "msg_${i}_ein Element"`)
      lines.push(`msgstr[1] "msg_${i}_{count} Elemente"`)
    } else if (isMultiLine) {
      lines.push(`msgid ""`)
      lines.push(`"msg_${i}_This is a longer message that spans "`)
      lines.push(`"multiple lines."`)
      lines.push(`msgstr ""`)
      lines.push(`"msg_${i}_Dies ist eine längere Nachricht, die sich über "`)
      lines.push(`"mehrere Zeilen erstreckt."`)
    } else {
      lines.push(`msgid "msg_${i}_Click to save"`)
      lines.push(`msgstr "msg_${i}_Klicken zum Speichern"`)
    }

    lines.push(``)
  }

  console.log(`  - Actual plural ratio: ${((pluralCount / entryCount) * 100).toFixed(1)}%`)
  return lines.join("\n")
}

// Create fixtures directory
mkdirSync(join(import.meta.dirname, "fixtures"), { recursive: true })

// Generate realistic fixture (main benchmark)
const realisticContent = generateRealisticPo(ENTRY_COUNT, PLURAL_RATIO)
const realisticPath = join(import.meta.dirname, "fixtures", "realistic.po")
writeFileSync(realisticPath, realisticContent, "utf-8")
const realisticSizeKb = Math.round(Buffer.byteLength(realisticContent, "utf-8") / 1024)
console.log(`Generated ${realisticPath}`)
console.log(`  - ${ENTRY_COUNT} entries (~${Math.round(PLURAL_RATIO * 100)}% plurals)`)
console.log(`  - ${realisticSizeKb} KB`)

// Keep large.po as alias for backwards compatibility
const largePath = join(import.meta.dirname, "fixtures", "large.po")
writeFileSync(largePath, realisticContent, "utf-8")
console.log(`\nGenerated ${largePath} (alias for realistic.po)`)
