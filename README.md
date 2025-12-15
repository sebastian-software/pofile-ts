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

**pofile-ts** is a complete solution for working with [GNU gettext](https://www.gnu.org/software/gettext/) PO files in modern JavaScript and TypeScript projects. Whether you're building translation pipelines, integrating with i18n frameworks or creating custom localization tooling — pofile-ts gives you everything you need.

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

- 🌍 **CLDR plural rules** — Uses native `Intl.PluralRules`, zero bundle size for CLDR data
- 🔄 **ICU MessageFormat** — Convert between Gettext plurals and ICU syntax
- 🧩 **ICU Parser** — Parse and analyze ICU messages (<3KB gzipped, 2.5× faster than FormatJS)
- ⚡ **ICU Compiler** — Compile ICU messages to fast JavaScript functions (3-4× faster at runtime)
- 🔢 **Plural helpers** — Get categories, counts, and selector functions for any locale

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

Supports ICU MessageFormat v1: arguments, plurals, selects, selectordinals, number/date/time formatting, tags, and escaping. Trade-offs for size: no AST location tracking, styles stored as opaque strings.

### ICU Compiler

Compile ICU messages to fast JavaScript functions — 3-4× faster than Lingui and FormatJS at runtime:

```typescript
import { compileIcu, compileCatalog, generateCompiledCode } from "pofile-ts"

// Compile a single message
const greet = compileIcu("Hello {name}!", { locale: "en" })
greet({ name: "World" }) // → "Hello World!"

// Full ICU support: plurals, select, number/date/time, tags
const msg = compileIcu("{count, plural, one {# item} other {# items}} in <link>cart</link>", {
  locale: "en"
})
msg({ count: 5, link: (text) => `<a>${text}</a>` })
// → "5 items in <a>cart</a>"

// Compile an entire catalog at runtime
const compiled = compileCatalog(catalog, { locale: "de" })
compiled.format("messageId", { name: "Sebastian" })

// Or generate static code for build-time compilation
const code = generateCompiledCode(catalog, { locale: "de" })
// → TypeScript file with pre-compiled functions
```

Supports named tags (`<link>`), numeric tags (`<0>`, `<1>` — Lingui-style), and React components (returns array when tag functions return objects).

## Documentation

For full documentation including API reference, i18n helpers, and migration guide:

**[📖 Documentation](https://sebastian-software.github.io/pofile-ts/)**

## Performance

Speed matters for build tools and CI pipelines. pofile-ts is hand-optimized for performance — no regex soup, no unnecessary allocations, just fast parsing.

_Benchmarked on Apple M1 Ultra, Node.js 22. Relative performance is consistent across different hardware._

### PO File Parsing

10,000 entries (~10% plurals):

| Library        |       Parsing | Serialization |
| -------------- | ------------: | ------------: |
| **pofile-ts**  | **211 ops/s** | **255 ops/s** |
| gettext-parser |      27 ops/s |      55 ops/s |
| pofile         |       7 ops/s |     103 ops/s |

→ **8× faster parsing**, **5× faster serialization**

### ICU MessageFormat Parsing

Realistic messages with plurals, selects, nested structures, and tags:

| Library                            |           Speed | Bundle (gzip) |
| ---------------------------------- | --------------: | ------------: |
| **pofile-ts**                      | **2.5× faster** |      **<3KB** |
| @formatjs/icu-messageformat-parser |        baseline |          ~9KB |

→ **2.5× faster**, **4× smaller bundle**

### ICU Compilation & Runtime

Compiling ICU messages to functions and executing them:

| Metric            | pofile-ts | vs intl-messageformat | vs @lingui (compiled) |
| ----------------- | --------: | --------------------: | --------------------: |
| **Compilation**   |  72k op/s |           **1× same** |                     — |
| **Runtime**       | 810k op/s |         **3× faster** |         **4× faster** |
| **Catalog (200)** |   ~210k/s |           **1× same** |                     — |

→ **3-4× faster** at runtime vs Lingui and FormatJS

## Bundle Size

The full library is **~11KB gzipped**. Tree-shaking reduces this further:

| Import                         | Gzipped |
| ------------------------------ | ------: |
| Full library                   |   ~11KB |
| `parsePo` + `stringifyPo` only |    ~5KB |
| + Plural helpers               |    +1KB |
| + ICU conversion               |    +2KB |
| + ICU parser                   |    +3KB |

Plural helpers use native `Intl.PluralRules` — no CLDR data in the bundle.

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
