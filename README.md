[![Powered by Sebastian Software](https://img.shields.io/badge/Powered%20by-Sebastian%20Software-00718d?style=flat-square)](https://oss.sebastian-software.com)

<p align="center">
  <a href="https://sebastian-software.github.io/pofile-ts/">
    <img src="logo.svg" alt="pofile-ts" width="120" height="120">
  </a>
</p>

<h1 align="center">pofile-ts</h1>

<p align="center">
  <strong>Parse, compile & transform PO files — 20× faster</strong>
</p>

[![CI](https://github.com/sebastian-software/pofile-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/sebastian-software/pofile-ts/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/sebastian-software/pofile-ts/graph/badge.svg)](https://codecov.io/gh/sebastian-software/pofile-ts)
[![npm version](https://img.shields.io/npm/v/pofile-ts.svg)](https://www.npmjs.com/package/pofile-ts)
[![npm downloads](https://img.shields.io/npm/dm/pofile-ts.svg)](https://www.npmjs.com/package/pofile-ts)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/pofile-ts)](https://bundlephobia.com/package/pofile-ts)
[![Tree Shakeable](https://img.shields.io/badge/tree--shakeable-yes-brightgreen)](https://bundlephobia.com/package/pofile-ts)
[![Node 20+](https://img.shields.io/badge/node-20%2B-brightgreen)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/bun-compatible-f472b6)](https://bun.sh/)

**pofile-ts** is a modern i18n toolkit for [GNU gettext](https://www.gnu.org/software/gettext/) PO files. Not just a parser — includes an ICU compiler with 3-4× faster runtime than Lingui/FormatJS, native CLDR plural rules, and format conversion helpers. Zero dependencies. TypeScript-first. Built for Node 20+, Bun, and modern browsers.

## Why pofile-ts?

- **20× faster parsing** — Hand-optimized with first-char dispatch and fast-paths. No regex soup.
- **ICU Compiler** — Compile ICU messages to JavaScript functions. 3-4× faster runtime than Lingui and FormatJS.
- **Native CLDR plurals** — Uses `Intl.PluralRules` for all 100+ locales. Zero CLDR data in bundle.
- **CSP-safe** — No `eval()`, no `new Function()`. Works in strict security environments.
- **Modern-first** — Built for Node 20+, ESM-native, tree-shakeable. No legacy polyfills.
- **Zero dependencies** — ~11KB full, ~5KB tree-shaken. No transitive deps, no supply chain bloat.

## Features

### Core

- 📖 **Parse** PO files from strings — 20× faster than pofile, 7× faster than gettext-parser
- ✏️ **Serialize** PO files back to strings — 2.5× faster than pofile, ~4.5× faster than gettext-parser
- 🎯 **Full PO support** — headers, comments, flags, plurals, message context

### i18n Toolkit

- 🌍 **CLDR plural rules** — Uses native `Intl.PluralRules`, zero bundle size for CLDR data
- 🔄 **ICU MessageFormat** — Convert between Gettext plurals and ICU syntax
- 🧩 **ICU Parser** — Parse and analyze ICU messages (<3KB gzipped, 5× faster than FormatJS)
- ⚡ **ICU Compiler** — Compile ICU messages to fast JavaScript functions (3-4× faster at runtime)
- 🔢 **Plural helpers** — Get categories, counts, and selector functions for any locale
- 🆕 **Extended Intl Formatters** — Lists, durations, relative times, and display names built-in

### Format Styles

- 🎨 **50+ built-in styles** — `compact`, `percent`, `bytes`, `iso`, `relative`, and more
- 🔧 **Custom styles** — Register your own `Intl.NumberFormat`, `DateTimeFormat`, `ListFormat` options
- 💱 **Dynamic currency** — Currency code read from message values at runtime
- 🏭 **Factory pattern** — `createIcuCompiler()` for pre-configured, reusable compilers

### Developer Experience

- 📦 **Zero dependencies** — No bloat, no supply chain risk
- 🌳 **Tree-shakeable** — ~5KB for PO parsing only, ~11KB full
- 💎 **TypeScript-first** — Written in TypeScript, full type definitions
- 🛡️ **CSP-safe** — No `eval()`, no `new Function()`
- ⚡ **Modern-first** — Node 20+, ESM-native, no legacy polyfills

## Use Cases

- **Vite/Webpack plugins** — Parse and compile PO files at build time for zero runtime cost
- **TMS pipelines** — Crowdin, Lokalise, Phrase — sync and transform translations
- **CI/CD validation** — Validate plural forms, variables, and syntax in PRs
- **Custom tooling** — Low-level APIs for message extraction and code generation

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

A fast, lightweight ICU MessageFormat parser — 5× faster and 4× smaller than FormatJS:

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

Compile ICU messages to fast JavaScript functions — about 3× faster than intl-messageformat and 4× faster than Lingui at runtime:

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

// Dynamic currency from values
const price = compileIcu("{amount, number, currency}", { locale: "de" })
price({ amount: 99.99, currency: "EUR" }) // → "99,99 €"
price({ amount: 99.99, currency: "USD" }) // → "99,99 $"

// Custom format styles with full Intl options
const size = compileIcu("{bytes, number, filesize}", {
  locale: "en",
  numberStyles: {
    filesize: { style: "unit", unit: "kilobyte", unitDisplay: "short" }
  }
})
size({ bytes: 512 }) // → "512 kB"

// Compile an entire catalog at runtime
const compiled = compileCatalog(catalog, { locale: "de" })
compiled.format("messageId", { name: "Sebastian" })

// Or generate static code for build-time compilation
const code = generateCompiledCode(catalog, { locale: "de" })
// → TypeScript file with pre-compiled functions
```

Supports named tags (`<link>`), numeric tags (`<0>`, `<1>` — Lingui-style), and React components (returns array when tag functions return objects).

### Extended Intl Formatters

Go beyond standard ICU with built-in support for modern `Intl` APIs:

```typescript
import { compileIcu } from "pofile-ts"

// Lists — "Alice, Bob, and Charlie" or "Alice, Bob, or Charlie"
const list = compileIcu("{authors, list}", { locale: "en" })
list({ authors: ["Alice", "Bob", "Charlie"] }) // → "Alice, Bob, and Charlie"

// Relative time — "in 3 days" or "2 hours ago"
const ago = compileIcu("{days, ago, day}", { locale: "de" })
ago({ days: -2 }) // → "vor 2 Tagen"

// Display names — Localized country, language, currency names
const name = compileIcu("{lang, name, language}", { locale: "de" })
name({ lang: "en" }) // → "Englisch"

// Durations — "2 hours, 30 minutes" (Baseline 2025)
const dur = compileIcu("{time, duration, short}", { locale: "en" })
dur({ time: { hours: 2, minutes: 30 } }) // → "2 hr, 30 min"
```

All formatters use native browser APIs — zero additional bundle size. See [browser support](https://sebastian-software.github.io/pofile-ts/docs/helpers#browser-support).

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
| **pofile-ts**  | **209 ops/s** | **256 ops/s** |
| gettext-parser |      28 ops/s |      54 ops/s |
| pofile         |       8 ops/s |     100 ops/s |

→ **20× faster parsing** vs pofile, **7× faster** vs gettext-parser

### ICU MessageFormat Parsing

Realistic messages with plurals, selects, nested structures, and tags:

| Library                            |         Speed | Bundle (gzip) |
| ---------------------------------- | ------------: | ------------: |
| **pofile-ts**                      | **5× faster** |      **<3KB** |
| @formatjs/icu-messageformat-parser |      baseline |          ~9KB |

→ **5× faster**, **4× smaller bundle**

### ICU Compilation & Runtime

Compiling ICU messages to functions and executing them:

| Metric            | pofile-ts | vs intl-messageformat | vs @lingui (compiled) |
| ----------------- | --------: | --------------------: | --------------------: |
| **Compilation**   | 409k op/s |         **7× faster** |                     — |
| **Runtime**       | 792k op/s |         **3× faster** |         **4× faster** |
| **Catalog (200)** |  ~1.35M/s |         **7× faster** |                     — |

→ **3× faster** at runtime vs intl-messageformat, **4× faster** vs Lingui

## Bundle Size

The full library is **~11KB gzipped**. Tree-shaking lets you import only what you need:

| Export         | Gzipped |
| -------------- | ------: |
| PO parsing     |    ~5KB |
| Plural helpers |    ~1KB |
| ICU conversion |    ~2KB |
| ICU parser     |    ~3KB |

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



---

<!-- sebastian-software-branding:start -->
<p align="center">
  <a href="https://oss.sebastian-software.com">
    <img src="https://sebastian-brand.vercel.app/sebastian-software/logo-software.svg" alt="Sebastian Software" width="240" />
  </a>
</p>

<p align="center">
  <a href="https://oss.sebastian-software.com">Open Source at Sebastian Software</a><br />
  Copyright &copy; 2011&ndash;2026 Sebastian Software GmbH
</p>
<!-- sebastian-software-branding:end -->
