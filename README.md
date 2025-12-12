<p align="center">
  <a href="https://sebastian-software.github.io/pofile-ts/">
    <img src="https://sebastian-software.github.io/pofile-ts/logo.svg" alt="pofile-ts" width="120" height="120">
  </a>
</p>

<h1 align="center">pofile-ts</h1>

<p align="center">
  <strong>Parse and serialize Gettext PO files</strong>
</p>

<p align="center">
  <a href="https://github.com/sebastian-software/pofile-ts/actions/workflows/ci.yml"><img src="https://github.com/sebastian-software/pofile-ts/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/sebastian-software/pofile-ts"><img src="https://codecov.io/gh/sebastian-software/pofile-ts/graph/badge.svg" alt="Coverage"></a>
  <a href="https://www.npmjs.com/package/pofile-ts"><img src="https://img.shields.io/npm/v/pofile-ts.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/pofile-ts"><img src="https://img.shields.io/npm/dm/pofile-ts.svg" alt="npm downloads"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-blue.svg" alt="TypeScript"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-%3E%3D20-339933.svg" alt="Node.js"></a>
  <img src="https://img.shields.io/badge/Browser-compatible-E34F26.svg" alt="Browser">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
</p>

<p align="center">
  <a href="https://sebastian-software.github.io/pofile-ts/">📖 Documentation</a> ·
  <a href="https://sebastian-software.github.io/pofile-ts/#api">API Reference</a> ·
  <a href="https://github.com/sebastian-software/pofile-ts/issues">Report Bug</a>
</p>

---

A modern, focused library for reading and writing [GNU gettext](https://www.gnu.org/software/gettext/) PO files. Hand-optimized for speed and seamless integration with translation platforms like [Crowdin](https://crowdin.com/).

> **Why pofile-ts?** We focus on what modern i18n workflows actually need: fast PO file processing with UTF-8 support. Clean, optimized code that runs everywhere.

## Features

- <img src="https://sebastian-software.github.io/pofile-ts/icons/book-open.svg" width="16" height="16" alt=""> **Parse** PO files from strings
- <img src="https://sebastian-software.github.io/pofile-ts/icons/pen-line.svg" width="16" height="16" alt=""> **Serialize** PO files back to strings with configurable formatting
- <img src="https://sebastian-software.github.io/pofile-ts/icons/target.svg" width="16" height="16" alt=""> **Full PO support** — headers, comments, flags, plurals, context
- <img src="https://sebastian-software.github.io/pofile-ts/icons/refresh-cw.svg" width="16" height="16" alt=""> **Crowdin-compatible** — avoids unnecessary diffs when syncing translations
- <img src="https://sebastian-software.github.io/pofile-ts/icons/package.svg" width="16" height="16" alt=""> **Zero dependencies** — no Node.js APIs, browser-compatible
- <img src="https://sebastian-software.github.io/pofile-ts/icons/code.svg" width="16" height="16" alt=""> **TypeScript-first** — full type definitions included
- <img src="https://sebastian-software.github.io/pofile-ts/icons/zap.svg" width="16" height="16" alt=""> **Blazing fast** — up to 36x faster than alternatives (see [benchmarks](#performance))
- <img src="https://sebastian-software.github.io/pofile-ts/icons/globe.svg" width="16" height="16" alt=""> **i18n workflow helpers** — catalog conversion, message IDs, reference parsing

## Why pofile-ts?

pofile-ts is a modernized fork of [pofile](https://github.com/rubenv/pofile) with a clear philosophy: do one thing exceptionally well.

- <img src="https://sebastian-software.github.io/pofile-ts/icons/target.svg" width="16" height="16" alt=""> **Focused** — PO files only, optimized for the 99% use case
- <img src="https://sebastian-software.github.io/pofile-ts/icons/globe.svg" width="16" height="16" alt=""> **Modern** — UTF-8 all the way, as you'd expect in 2024
- <img src="https://sebastian-software.github.io/pofile-ts/icons/monitor.svg" width="16" height="16" alt=""> **Universal** — runs in Node.js and browsers without polyfills
- <img src="https://sebastian-software.github.io/pofile-ts/icons/zap.svg" width="16" height="16" alt=""> **Hand-optimized** — we spent way too much time making this fast 😅

The result? **36x faster parsing** — and yes, we benchmarked it.

## Performance

Benchmarked with 10,000 entries (~10% plurals, reflecting real-world usage):

| Library                                                  |       Parsing | Serialization |
| -------------------------------------------------------- | ------------: | ------------: |
| **pofile-ts**                                            | **175 ops/s** | **211 ops/s** |
| [gettext-parser](https://github.com/smhg/gettext-parser) |      33 ops/s |      79 ops/s |
| [pofile](https://github.com/rubenv/pofile)               |       8 ops/s |      98 ops/s |

Both [gettext-parser](https://github.com/smhg/gettext-parser) and [pofile](https://github.com/rubenv/pofile) are great libraries that inspired this project. They support features we intentionally skipped (like `.mo` files). We just happen to be faster for the PO-only use case. 🏎️

Run the benchmark yourself:

```bash
cd benchmark && pnpm install && pnpm bench
```

## PO File Format

pofile-ts implements the [GNU gettext PO file format](https://www.gnu.org/software/gettext/manual/html_node/PO-Files.html) — the standard for software translation since the 1990s.

### What We Support

| Feature                                                                                 | Supported | Example                                        |
| --------------------------------------------------------------------------------------- | :-------: | ---------------------------------------------- |
| Singular translations                                                                   |    ✅     | `msgid` / `msgstr`                             |
| [Plural forms](https://www.gnu.org/software/gettext/manual/html_node/Plural-forms.html) |    ✅     | `msgid_plural` / `msgstr[0]`, `msgstr[1]`, ... |
| Message context                                                                         |    ✅     | `msgctxt`                                      |
| Comments                                                                                |    ✅     | `#`, `#.`, `#:`, `#,`                          |
| Flags                                                                                   |    ✅     | `fuzzy`, `no-wrap`, etc.                       |
| Obsolete entries                                                                        |    ✅     | `#~`                                           |
| All UTF-8 content                                                                       |    ✅     | —                                              |

### Content Agnostic

pofile-ts parses the **PO structure** — it doesn't interpret what's inside `msgid` or `msgstr`. Your strings can contain:

- Plain text: `"Hello, World!"`
- [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/): `"{count, plural, one {# item} other {# items}}"`
- [MessageFormat 2](https://github.com/unicode-org/message-format-wg): `.match {$count} one {{# item}} * {{# items}}`
- Any other format your i18n library uses

This makes pofile-ts a **universal PO parser** that works with any translation workflow.

**Important:** There is no normalization between formats. Native Gettext plurals and ICU-embedded plurals result in different data structures:

```typescript
// Native Gettext: msgid_plural set, msgstr has multiple entries
{ msgid_plural: "{count} items", msgstr: ["Ein Element", "{count} Elemente"] }

// ICU embedded: msgid_plural null, msgstr has one entry with ICU syntax
{ msgid_plural: null, msgstr: ["{count, plural, one {...} other {...}}"] }
```

If you need to convert between these formats, you'll need additional tooling.

### Native Gettext Plurals

For languages with complex plural rules (like Arabic with 6 forms), use native Gettext plurals:

```po
# German (2 forms)
msgid "One item"
msgid_plural "{count} items"
msgstr[0] "Ein Element"
msgstr[1] "{count} Elemente"

# Arabic (6 forms)
msgstr[0] "..."  # zero
msgstr[1] "..."  # one
msgstr[2] "..."  # two
msgstr[3] "..."  # few
msgstr[4] "..."  # many
msgstr[5] "..."  # other
```

The number of forms is defined by the `Plural-Forms` header. See the [GNU gettext plural forms documentation](https://www.gnu.org/software/gettext/manual/html_node/Plural-forms.html) for details.

## Installation

```bash
npm install pofile-ts
```

## Quick Start

```typescript
import { parsePo, stringifyPo, createPoFile, createItem } from "pofile-ts"

// Parse a PO file
const po = parsePo(`
msgid "Hello"
msgstr "Hallo"
`)

console.log(po.items[0].msgid) // "Hello"
console.log(po.items[0].msgstr) // ["Hallo"]

// Create a new PO file
const newPo = createPoFile()
const item = createItem()
item.msgid = "Welcome"
item.msgstr = ["Willkommen"]
newPo.items.push(item)

console.log(stringifyPo(newPo))
```

## Serialization Options

Control output formatting with `SerializeOptions`:

```typescript
stringifyPo(po, {
  foldLength: 80, // Line width (0 = no folding)
  compactMultiline: true // Crowdin-compatible format (default)
})
```

The compact multiline format is the default because translation platforms like Crowdin normalize multiline strings. Using the same format avoids unnecessary diffs. Both formats represent the exact same data — the difference is purely cosmetic.

See the [documentation](https://sebastian-software.github.io/pofile-ts/#options) for details.

## i18n Workflow Helpers

Beyond parsing and serialization, pofile-ts includes utilities for common i18n workflows:

### Default Headers

```typescript
import { createDefaultHeaders } from "pofile-ts"

const headers = createDefaultHeaders({
  language: "de",
  generator: "my-tool",
  pluralForms: "nplurals=2; plural=(n != 1);"
})
```

### Catalog Conversion

Convert between simple key-value catalogs and PO items:

```typescript
import { catalogToItems, itemsToCatalog } from "pofile-ts"

// Simple catalog format
const catalog = {
  Hello: { translation: "Hallo" },
  "{count} item": {
    translation: ["{count} Element", "{count} Elemente"],
    pluralSource: "{count} items"
  }
}

const items = catalogToItems(catalog)
```

### Message ID Generation

Generate stable, collision-resistant IDs from message content:

```typescript
import { generateMessageId } from "pofile-ts"

const id = await generateMessageId("Hello {name}", "greeting")
// → "Kj9xMnPq" (8-char Base64URL, 281 trillion possibilities)
```

### Reference Utilities

Parse and format source file references:

```typescript
import { parseReference, formatReference } from "pofile-ts"

parseReference("src/App.tsx:42")
// → { file: "src/App.tsx", line: 42 }
```

## Documentation

For comprehensive documentation including:

- Full API reference
- Working with plurals
- Serialization options explained
- Migration guide from `pofile`

Visit the **[Documentation](https://sebastian-software.github.io/pofile-ts/)**.

## Credits

This is a modernized fork of [pofile](https://github.com/rubenv/pofile) by Ruben Vermeersch, originally based on [node-po](https://github.com/mikejholly/node-po) by Michael Holly. Inspired by [@lingui/pofile](https://github.com/timofei-iatsenko/pofile) by Timofei Iatsenko.

Icons by [Lucide](https://lucide.dev/) ([ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE)).

Maintained by [Sebastian Software](https://sebastian-software.de/).

## License

[MIT](LICENSE)
