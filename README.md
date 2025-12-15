<p align="center">
  <a href="https://sebastian-software.github.io/pofile-ts/">
    <img src="logo.svg" alt="pofile-ts" width="120" height="120">
  </a>
</p>

<h1 align="center">pofile-ts</h1>

<p align="center">
  <strong>The fast, modern PO file toolkit for JavaScript</strong>
</p>

[![CI](https://github.com/sebastian-software/pofile-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/sebastian-software/pofile-ts/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/sebastian-software/pofile-ts/graph/badge.svg)](https://codecov.io/gh/sebastian-software/pofile-ts)
[![npm version](https://img.shields.io/npm/v/pofile-ts.svg)](https://www.npmjs.com/package/pofile-ts)
[![npm downloads](https://img.shields.io/npm/dm/pofile-ts.svg)](https://www.npmjs.com/package/pofile-ts)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/pofile-ts)](https://bundlephobia.com/package/pofile-ts)
[![Tree Shakeable](https://img.shields.io/badge/tree--shakeable-yes-brightgreen)](https://bundlephobia.com/package/pofile-ts)

**pofile-ts** is a complete solution for working with [GNU gettext](https://www.gnu.org/software/gettext/) PO files in modern JavaScript and TypeScript projects. Whether you're building translation pipelines, integrating with i18n frameworks like [Lingui](https://lingui.dev/) or [FormatJS](https://formatjs.io/), or creating custom localization tooling — pofile-ts gives you everything you need.

## Why pofile-ts?

- **Battle-tested parsing** — Handles edge cases, malformed files, and complex escape sequences that break other parsers
- **Complete i18n toolkit** — Not just a parser: includes CLDR plural rules, ICU MessageFormat conversion, and workflow helpers
- **Production-ready** — Used in real-world applications, fully tested against CLDR 48 specification
- **Runs everywhere** — Works in Node.js, browsers, edge runtimes, and build tools like Vite or webpack
- **Lightweight** — Zero dependencies, ~11KB gzipped, tree-shakeable to ~5KB for basic usage

## Features

### Core

- 📖 **Parse** PO files from strings — 8× faster than alternatives
- ✏️ **Serialize** PO files back to strings — 5× faster than alternatives
- 🎯 **Full PO support** — headers, comments, flags, plurals, message context

### i18n Toolkit

- 🌍 **CLDR 48 plural rules** — 100% compliant for all major languages (140+ locales)
- 🔄 **ICU MessageFormat** — Convert between Gettext plurals and ICU syntax
- 🧩 **ICU Parser** — Parse and analyze ICU messages (~3KB gzipped, zero dependencies)
- 🔢 **Plural helpers** — Get categories, sample numbers, and Plural-Forms headers for any locale

### Developer Experience

- 📦 **Zero dependencies** — No bloat, works in browsers and edge runtimes
- 🌳 **Tree-shakeable** — Only bundle what you use (~5KB for parsing only)
- 💎 **TypeScript-first** — Full type definitions, excellent IDE support
- 🛡️ **CSP-safe** — No `eval()` or `new Function()`, works in strict environments

## Use Cases

- **Translation pipelines** — Read PO files from translators, merge with source strings, write back
- **Build tool plugins** — Parse PO files in Vite, webpack, or Rollup plugins
- **Message extraction** — Generate PO files from source code for translation
- **Format conversion** — Convert legacy Gettext projects to modern ICU MessageFormat
- **Translation management** — Build custom TMS integrations or translation workflows
- **Plural validation** — Verify translations have correct plural forms for target locales

## Installation

```bash
npm install pofile-ts
```

## Quick Start

```typescript
import { parsePo, stringifyPo } from "pofile-ts"

const po = parsePo(`
msgid "Hello"
msgstr "Hallo"
`)

console.log(po.items[0].msgid) // "Hello"
console.log(po.items[0].msgstr) // ["Hallo"]

console.log(stringifyPo(po))
```

### ICU MessageFormat

A fast, lightweight ICU MessageFormat parser — 2.5× faster and 4× smaller than FormatJS:

```typescript
import { parseIcu, extractVariables, validateIcu, hasPlural } from "pofile-ts"

// Parse ICU messages into an AST
const result = parseIcu("{count, plural, one {# item} other {# items}}")
if (result.success) {
  console.log(result.ast) // AST with plural node
}

// Extract variables from messages
extractVariables("{name} has {count} messages")
// → ["name", "count"]

// Validate syntax before use
const validation = validateIcu("{gender, select, male {He} other {They}}")
console.log(validation.valid) // true

// Check message structure
hasPlural("{n, plural, one {#} other {#}}") // true
hasPlural("Hello {name}") // false
```

Supports all ICU MessageFormat v1 features: arguments, plurals, selects, selectordinals, number/date/time formatting, tags, and escaping.

## Documentation

For full documentation including API reference, i18n helpers, and migration guide:

**[📖 Documentation](https://sebastian-software.github.io/pofile-ts/)**

## Performance

Speed matters for build tools and CI pipelines. pofile-ts is hand-optimized for performance — no regex soup, no unnecessary allocations, just fast parsing.

### PO File Parsing

Benchmarked with 10,000 entries (~10% plurals) on Apple M1 Ultra, Node.js 22:

| Library        |       Parsing | Serialization |
| -------------- | ------------: | ------------: |
| **pofile-ts**  | **211 ops/s** | **255 ops/s** |
| gettext-parser |      27 ops/s |      55 ops/s |
| pofile         |       7 ops/s |     103 ops/s |

That's **8× faster parsing** and **5× faster serialization** than the next best alternative.

### ICU MessageFormat Parsing

The built-in ICU parser is **2.5× faster** than FormatJS while being **4× smaller**:

| Library                            |           Speed | Bundle (gzip) |
| ---------------------------------- | --------------: | ------------: |
| **pofile-ts**                      | **2.5× faster** |    **2.3 KB** |
| @formatjs/icu-messageformat-parser |        baseline |        9.3 KB |

Tested with realistic ICU messages including plurals, selects, nested structures, and tags.

## Bundle Size

The full library is **~14KB gzipped**. Tree-shaking reduces this further:

| Import                         | Gzipped |
| ------------------------------ | ------: |
| Full library                   |   ~14KB |
| `parsePo` + `stringifyPo` only |    ~5KB |
| Add CLDR plural helpers        |    +3KB |
| Add ICU conversion             |    +2KB |
| Add ICU parser                 |  +2.3KB |

All exports are **named exports** — modern bundlers (Vite, esbuild, Rollup, webpack) automatically tree-shake unused code.

## Monorepo Structure

```
packages/pofile-ts/  # The library (published to npm)
apps/docs/           # Documentation site (Fumadocs)
benchmark/           # Performance benchmarks
```

## Development

```bash
pnpm install
pnpm test           # Run tests
pnpm build          # Build library
pnpm docs:dev       # Start docs dev server
```

## Credits

Originally forked from [pofile](https://github.com/rubenv/pofile) by Ruben Vermeersch. Completely rewritten with modern TypeScript, expanded with CLDR plural support, ICU conversion, and comprehensive i18n helpers.

Maintained by [Sebastian Software](https://sebastian-software.de/).

## License

[MIT](LICENSE) — Use it freely in personal and commercial projects.
