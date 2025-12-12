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

  const pluralTypes = [
    { singular: "item", plural: "items", singularDe: "Element", pluralDe: "Elemente" },
    { singular: "file", plural: "files", singularDe: "Datei", pluralDe: "Dateien" },
    { singular: "user", plural: "users", singularDe: "Benutzer", pluralDe: "Benutzer" },
    { singular: "message", plural: "messages", singularDe: "Nachricht", pluralDe: "Nachrichten" },
    { singular: "day", plural: "days", singularDe: "Tag", pluralDe: "Tage" }
  ]

  const singularPhrases = [
    { en: "Save", de: "Speichern" },
    { en: "Cancel", de: "Abbrechen" },
    { en: "Delete", de: "Löschen" },
    { en: "Edit", de: "Bearbeiten" },
    { en: "Create", de: "Erstellen" },
    { en: "Update", de: "Aktualisieren" },
    { en: "Search", de: "Suchen" },
    { en: "Filter", de: "Filtern" },
    { en: "Settings", de: "Einstellungen" },
    { en: "Profile", de: "Profil" }
  ]

  let pluralCount = 0

  for (let i = 0; i < entryCount; i++) {
    const isPlural = Math.random() < pluralRatio
    const hasComment = i % 4 === 0
    const hasReference = i % 3 === 0
    const hasContext = i % 10 === 0
    const isMultiLine = i % 50 === 0

    if (hasComment) {
      lines.push(`#. Auto-generated comment for entry ${i}`)
    }

    if (hasReference) {
      lines.push(`#: src/components/Component${i % 100}.tsx:${10 + (i % 50)}`)
    }

    if (hasContext) {
      lines.push(`msgctxt "ctx_${Math.floor(i / 100)}"`)
    }

    if (isPlural) {
      pluralCount++
      const type = pluralTypes[i % pluralTypes.length]
      lines.push(`msgid "One ${type.singular}"`)
      lines.push(`msgid_plural "{count} ${type.plural}"`)
      lines.push(`msgstr[0] "Ein ${type.singularDe}"`)
      lines.push(`msgstr[1] "{count} ${type.pluralDe}"`)
    } else if (isMultiLine) {
      lines.push(`msgid ""`)
      lines.push(`"This is a longer message that spans "`)
      lines.push(`"multiple lines for entry number ${i}."`)
      lines.push(`msgstr ""`)
      lines.push(`"Dies ist eine längere Nachricht, die sich über "`)
      lines.push(`"mehrere Zeilen für Eintrag ${i} erstreckt."`)
    } else {
      const phrase = singularPhrases[i % singularPhrases.length]
      const variant = Math.floor(i / singularPhrases.length)
      lines.push(`msgid "${phrase.en} ${variant}"`)
      lines.push(`msgstr "${phrase.de} ${variant}"`)
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
