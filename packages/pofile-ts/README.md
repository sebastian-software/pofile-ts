<p align="center">
  <a href="https://sebastian-software.github.io/pofile-ts/">
    <img src="https://sebastian-software.github.io/pofile-ts/logo.svg" alt="pofile-ts" width="120" height="120">
  </a>
</p>

<h1 align="center">pofile-ts</h1>

<p align="center">
  <strong>Parse and serialize GNU gettext PO files</strong>
</p>

[![CI](https://github.com/sebastian-software/pofile-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/sebastian-software/pofile-ts/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/sebastian-software/pofile-ts/graph/badge.svg)](https://codecov.io/gh/sebastian-software/pofile-ts)
[![npm version](https://img.shields.io/npm/v/pofile-ts.svg)](https://www.npmjs.com/package/pofile-ts)
[![npm downloads](https://img.shields.io/npm/dm/pofile-ts.svg)](https://www.npmjs.com/package/pofile-ts)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/pofile-ts)](https://bundlephobia.com/package/pofile-ts)
[![Tree Shakeable](https://img.shields.io/badge/tree--shakeable-yes-brightgreen)](https://bundlephobia.com/package/pofile-ts)

A modern, focused library for reading and writing [GNU gettext](https://www.gnu.org/software/gettext/) PO files. Hand-optimized for speed, runs everywhere.

## Features

- 📖 **Parse** PO files from strings — 8× faster than alternatives
- ✏️ **Serialize** PO files back to strings — 5× faster than alternatives
- 🎯 **Full PO support** — headers, comments, flags, plurals, context
- 🌍 **CLDR 48 plural data** — 100% compliant for all major languages
- 🔄 **ICU conversion** — Gettext ↔ ICU MessageFormat
- 📦 **Zero dependencies** — browser-compatible
- 🌳 **Tree-shakeable** — only bundle what you use
- 💎 **TypeScript-first** — full type definitions

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

## Documentation

For full documentation including API reference, i18n helpers, and migration guide:

**[📖 Documentation](https://sebastian-software.github.io/pofile-ts/)**

## Performance

Benchmarked with 10,000 entries (~10% plurals) on Apple M1 Ultra, Node.js 22:

| Library        |       Parsing | Serialization |
| -------------- | ------------: | ------------: |
| **pofile-ts**  | **211 ops/s** | **255 ops/s** |
| gettext-parser |      27 ops/s |      55 ops/s |
| pofile         |       7 ops/s |     103 ops/s |

_Relative performance (×faster) is consistent across different hardware._

## Bundle Size

The full library is **~11KB gzipped**. Tree-shaking reduces this further:

| Import                         | Gzipped |
| ------------------------------ | ------: |
| Full library                   |   ~11KB |
| `parsePo` + `stringifyPo` only |    ~5KB |
| Add CLDR plural helpers        |    +3KB |
| Add ICU conversion             |    +2KB |

All exports are **named exports** — modern bundlers (Vite, esbuild, Rollup, webpack) automatically tree-shake unused code.

## Credits

Modernized fork of [pofile](https://github.com/rubenv/pofile) by Ruben Vermeersch. Maintained by [Sebastian Software](https://sebastian-software.de/).

## License

[MIT](LICENSE)
