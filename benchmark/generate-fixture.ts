import { writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const ENTRY_COUNT = 10000

/**
 * Generates a simple PO file with mostly singular translations.
 * This represents typical UI strings without plural forms.
 */
function generateSimplePo(entryCount: number): string {
  const lines: string[] = []

  // Header
  lines.push(`# Simple PO file for benchmarking (singular translations)`)
  lines.push(`# Generated with ${entryCount} entries`)
  lines.push(`#`)
  lines.push(`msgid ""`)
  lines.push(`msgstr ""`)
  lines.push(`"Project-Id-Version: Benchmark-Simple\\n"`)
  lines.push(`"POT-Creation-Date: 2024-01-01 00:00+0000\\n"`)
  lines.push(`"PO-Revision-Date: 2024-01-01 00:00+0000\\n"`)
  lines.push(`"Language-Team: German\\n"`)
  lines.push(`"MIME-Version: 1.0\\n"`)
  lines.push(`"Content-Type: text/plain; charset=UTF-8\\n"`)
  lines.push(`"Content-Transfer-Encoding: 8bit\\n"`)
  lines.push(`"Language: de\\n"`)
  lines.push(``)

  for (let i = 0; i < entryCount; i++) {
    const hasContext = i % 5 === 0
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
      lines.push(`msgstr ""`)
      lines.push(`"Dies ist eine längere Nachricht, die sich über "`)
      lines.push(`"mehrere Zeilen für Eintrag Nummer ${i} erstreckt. "`)
      lines.push(`"Sie enthält mehr Text, um das Parsen interessant zu machen."`)
    } else {
      lines.push(`msgid "Message number ${i} with some text content"`)
      lines.push(`msgstr "Nachricht Nummer ${i} mit etwas Textinhalt"`)
    }

    lines.push(``)
  }

  return lines.join("\n")
}

/**
 * Generates a PO file with native Gettext plurals.
 * This represents content-heavy apps with counts, dates, etc.
 */
function generatePluralPo(entryCount: number): string {
  const lines: string[] = []

  // Header with German plural rules (nplurals=2)
  lines.push(`# Plural PO file for benchmarking (native Gettext plurals)`)
  lines.push(`# Generated with ${entryCount} entries`)
  lines.push(`#`)
  lines.push(`msgid ""`)
  lines.push(`msgstr ""`)
  lines.push(`"Project-Id-Version: Benchmark-Plural\\n"`)
  lines.push(`"POT-Creation-Date: 2024-01-01 00:00+0000\\n"`)
  lines.push(`"PO-Revision-Date: 2024-01-01 00:00+0000\\n"`)
  lines.push(`"Language-Team: German\\n"`)
  lines.push(`"MIME-Version: 1.0\\n"`)
  lines.push(`"Content-Type: text/plain; charset=UTF-8\\n"`)
  lines.push(`"Content-Transfer-Encoding: 8bit\\n"`)
  lines.push(`"Plural-Forms: nplurals=2; plural=(n != 1);\\n"`)
  lines.push(`"Language: de\\n"`)
  lines.push(``)

  const pluralTypes = [
    { singular: "item", plural: "items", singularDe: "Element", pluralDe: "Elemente" },
    { singular: "file", plural: "files", singularDe: "Datei", pluralDe: "Dateien" },
    { singular: "user", plural: "users", singularDe: "Benutzer", pluralDe: "Benutzer" },
    { singular: "message", plural: "messages", singularDe: "Nachricht", pluralDe: "Nachrichten" },
    { singular: "comment", plural: "comments", singularDe: "Kommentar", pluralDe: "Kommentare" },
    { singular: "error", plural: "errors", singularDe: "Fehler", pluralDe: "Fehler" },
    { singular: "warning", plural: "warnings", singularDe: "Warnung", pluralDe: "Warnungen" },
    { singular: "day", plural: "days", singularDe: "Tag", pluralDe: "Tage" },
    { singular: "hour", plural: "hours", singularDe: "Stunde", pluralDe: "Stunden" },
    { singular: "minute", plural: "minutes", singularDe: "Minute", pluralDe: "Minuten" }
  ]

  for (let i = 0; i < entryCount; i++) {
    const hasContext = i % 5 === 0
    const hasComment = i % 3 === 0
    const hasReference = i % 2 === 0
    const type = pluralTypes[i % pluralTypes.length]

    if (hasComment) {
      lines.push(`#. Plural entry ${i} for ${type.plural}`)
    }

    if (hasReference) {
      lines.push(`#: src/components/Counter${i}.tsx:${10 + (i % 100)}`)
    }

    if (hasContext) {
      lines.push(`msgctxt "count_${Math.floor(i / 10)}"`)
    }

    // Native Gettext plural format
    lines.push(`msgid "One ${type.singular}"`)
    lines.push(`msgid_plural "{count} ${type.plural}"`)
    lines.push(`msgstr[0] "Ein ${type.singularDe}"`)
    lines.push(`msgstr[1] "{count} ${type.pluralDe}"`)
    lines.push(``)
  }

  return lines.join("\n")
}

// Create fixtures directory
mkdirSync(join(import.meta.dirname, "fixtures"), { recursive: true })

// Generate simple fixture
const simpleContent = generateSimplePo(ENTRY_COUNT)
const simplePath = join(import.meta.dirname, "fixtures", "simple.po")
writeFileSync(simplePath, simpleContent, "utf-8")
const simpleSizeKb = Math.round(Buffer.byteLength(simpleContent, "utf-8") / 1024)
console.log(`Generated ${simplePath}`)
console.log(`  - ${ENTRY_COUNT} entries (singular translations)`)
console.log(`  - ${simpleSizeKb} KB`)

// Generate plural fixture
const pluralContent = generatePluralPo(ENTRY_COUNT)
const pluralPath = join(import.meta.dirname, "fixtures", "plural.po")
writeFileSync(pluralPath, pluralContent, "utf-8")
const pluralSizeKb = Math.round(Buffer.byteLength(pluralContent, "utf-8") / 1024)
console.log(`\nGenerated ${pluralPath}`)
console.log(`  - ${ENTRY_COUNT} entries (native Gettext plurals)`)
console.log(`  - ${pluralSizeKb} KB`)

// Also keep the legacy large.po for backwards compatibility
const legacyPath = join(import.meta.dirname, "fixtures", "large.po")
writeFileSync(legacyPath, simpleContent, "utf-8")
console.log(`\nGenerated ${legacyPath} (legacy, same as simple.po)`)
