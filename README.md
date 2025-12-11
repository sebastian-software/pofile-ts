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

A modern, focused library for reading and writing GNU gettext PO files. Hand-optimized for speed and seamless integration with translation platforms like [Crowdin](https://crowdin.com/).

> **Why pofile-ts?** We focus on what modern i18n workflows actually need: fast PO file processing with UTF-8 support. No legacy baggage like binary `.mo` files or obscure charset encodings — just clean, optimized code that runs everywhere.

## Features

- <img src="https://sebastian-software.github.io/pofile-ts/icons/book-open.svg" width="16" height="16" alt=""> **Parse** PO files from strings
- <img src="https://sebastian-software.github.io/pofile-ts/icons/pen-line.svg" width="16" height="16" alt=""> **Serialize** PO files back to strings with configurable formatting
- <img src="https://sebastian-software.github.io/pofile-ts/icons/target.svg" width="16" height="16" alt=""> **Full PO support** — headers, comments, flags, plurals, context
- <img src="https://sebastian-software.github.io/pofile-ts/icons/refresh-cw.svg" width="16" height="16" alt=""> **Crowdin-compatible** — avoids unnecessary diffs when syncing translations
- <img src="https://sebastian-software.github.io/pofile-ts/icons/package.svg" width="16" height="16" alt=""> **Zero dependencies** — no Node.js APIs, browser-compatible
- <img src="https://sebastian-software.github.io/pofile-ts/icons/code.svg" width="16" height="16" alt=""> **TypeScript-first** — full type definitions included
- <img src="https://sebastian-software.github.io/pofile-ts/icons/zap.svg" width="16" height="16" alt=""> **Blazing fast** — up to 36x faster than alternatives (see [benchmarks](#performance))

## Why pofile-ts?

Other libraries like [gettext-parser](https://github.com/smhg/gettext-parser) try to do everything: binary `.mo` files, streaming, legacy charset encodings. That flexibility comes at a cost — complexity and performance overhead.

**pofile-ts takes a different approach:**

- <img src="https://sebastian-software.github.io/pofile-ts/icons/target.svg" width="16" height="16" alt=""> **Focused** — PO files only, no binary formats
- <img src="https://sebastian-software.github.io/pofile-ts/icons/globe.svg" width="16" height="16" alt=""> **Modern** — UTF-8 exclusively, like every tool since 2010
- <img src="https://sebastian-software.github.io/pofile-ts/icons/monitor.svg" width="16" height="16" alt=""> **Universal** — runs in Node.js and browsers without polyfills
- <img src="https://sebastian-software.github.io/pofile-ts/icons/zap.svg" width="16" height="16" alt=""> **Hand-optimized** — every hot path tuned for maximum throughput

The result? **36x faster parsing** while being simpler to use.

## Performance

pofile-ts is highly optimized for speed. Benchmarked on a 1.5 MB PO file with 10,000 entries:

| Library                                                  |       Parsing |            | Serialization |            |
| -------------------------------------------------------- | ------------: | ---------- | ------------: | ---------- |
| **pofile-ts**                                            | **157 ops/s** | ██████████ | **171 ops/s** | ██████████ |
| [gettext-parser](https://github.com/smhg/gettext-parser) |      19 ops/s | █░░░░░░░░░ |      31 ops/s | ██░░░░░░░░ |
| [pofile](https://github.com/rubenv/pofile)               |       4 ops/s | ░░░░░░░░░░ |      87 ops/s | █████░░░░░ |

**Summary:**

- **36x faster** parsing than [pofile](https://github.com/rubenv/pofile)
- **8x faster** parsing than [gettext-parser](https://github.com/smhg/gettext-parser)
- **2x faster** serialization than pofile
- **5.5x faster** serialization than gettext-parser

Run the benchmark yourself:

```bash
cd benchmark && pnpm install && pnpm bench
```

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

## Documentation

For comprehensive documentation including:

- Full API reference
- Working with plurals
- Serialization options explained
- Migration guide from `pofile`

Visit the **[Documentation](https://sebastian-software.github.io/pofile-ts/)**.

## Credits

This is a modernized fork of [pofile](https://github.com/rubenv/pofile) by Ruben Vermeersch, originally based on [node-po](https://github.com/mikejholly/node-po) by Michael Holly. Inspired by [@lingui/pofile](https://github.com/timofei-iatsenko/pofile) by Timofei Iatsenko.

Maintained by [Sebastian Software](https://sebastian-software.de/).

## License

[MIT](LICENSE)
