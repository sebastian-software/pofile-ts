import { writeFileSync } from "node:fs"
import { join } from "node:path"

const ENTRY_COUNT = 10000

function generatePo(entryCount: number): string {
  const lines: string[] = []

  // Header
  lines.push(`# Large PO file for benchmarking`)
  lines.push(`# Generated with ${entryCount} entries`)
  lines.push(`#`)
  lines.push(`msgid ""`)
  lines.push(`msgstr ""`)
  lines.push(`"Project-Id-Version: Benchmark\\n"`)
  lines.push(`"POT-Creation-Date: 2024-01-01 00:00+0000\\n"`)
  lines.push(`"PO-Revision-Date: 2024-01-01 00:00+0000\\n"`)
  lines.push(`"Language-Team: English\\n"`)
  lines.push(`"MIME-Version: 1.0\\n"`)
  lines.push(`"Content-Type: text/plain; charset=UTF-8\\n"`)
  lines.push(`"Content-Transfer-Encoding: 8bit\\n"`)
  lines.push(`"Plural-Forms: nplurals=2; plural=(n != 1);\\n"`)
  lines.push(`"Language: en\\n"`)
  lines.push(``)

  for (let i = 0; i < entryCount; i++) {
    // Add some variety in entry types
    const hasContext = i % 5 === 0
    const hasPlural = i % 7 === 0
    const hasComment = i % 3 === 0
    const hasReference = i % 2 === 0
    const isMultiLine = i % 11 === 0

    if (hasComment) {
      lines.push(`#. Translator comment for entry ${i}`)
    }

    if (hasReference) {
      lines.push(`#: src/components/Component${i}.tsx:${10 + (i % 100)}`)
    }

    if (hasContext) {
      lines.push(`msgctxt "context_${Math.floor(i / 10)}"`)
    }

    if (isMultiLine) {
      lines.push(`msgid ""`)
      lines.push(`"This is a longer message that spans "`)
      lines.push(`"multiple lines for entry number ${i}. "`)
      lines.push(`"It contains more text to make parsing interesting."`)
    } else if (hasPlural) {
      lines.push(`msgid "There is ${i} item"`)
      lines.push(`msgid_plural "There are ${i} items"`)
    } else {
      lines.push(`msgid "Message number ${i} with some text content"`)
    }

    if (hasPlural) {
      lines.push(`msgstr[0] "Es gibt ${i} Element"`)
      lines.push(`msgstr[1] "Es gibt ${i} Elemente"`)
    } else if (isMultiLine) {
      lines.push(`msgstr ""`)
      lines.push(`"Dies ist eine längere Nachricht, die sich über "`)
      lines.push(`"mehrere Zeilen für Eintrag Nummer ${i} erstreckt. "`)
      lines.push(`"Sie enthält mehr Text, um das Parsen interessant zu machen."`)
    } else {
      lines.push(`msgstr "Nachricht Nummer ${i} mit etwas Textinhalt"`)
    }

    lines.push(``)
  }

  return lines.join("\n")
}

const content = generatePo(ENTRY_COUNT)
const outputPath = join(import.meta.dirname, "fixtures", "large.po")

// Create fixtures directory if needed
import { mkdirSync } from "node:fs"
mkdirSync(join(import.meta.dirname, "fixtures"), { recursive: true })

writeFileSync(outputPath, content, "utf-8")

const sizeKb = Math.round(Buffer.byteLength(content, "utf-8") / 1024)
console.log(`Generated ${outputPath}`)
console.log(`  - ${ENTRY_COUNT} entries`)
console.log(`  - ${sizeKb} KB`)
