# pofile-ts

**Parse and serialize GNU gettext PO files**

[![CI](https://github.com/sebastian-software/pofile-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/sebastian-software/pofile-ts/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/sebastian-software/pofile-ts/graph/badge.svg)](https://codecov.io/gh/sebastian-software/pofile-ts)
[![npm version](https://img.shields.io/npm/v/pofile-ts.svg)](https://www.npmjs.com/package/pofile-ts)
[![npm downloads](https://img.shields.io/npm/dm/pofile-ts.svg)](https://www.npmjs.com/package/pofile-ts)

A modern, focused library for reading and writing [GNU gettext](https://www.gnu.org/software/gettext/) PO files. Hand-optimized for speed, runs everywhere.

## Features

- 📖 **Parse** PO files from strings
- ✏️ **Serialize** PO files back to strings
- 🎯 **Full PO support** — headers, comments, flags, plurals, context
- 📦 **Zero dependencies** — browser-compatible
- 💎 **TypeScript-first** — full type definitions
- ⚡ **23× faster** than alternatives

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

**[📖 Documentation](https://sebastian-software.github.io/pofile-ts/docs)**

## Performance

Benchmarked with 10,000 entries (~10% plurals):

| Library        |       Parsing | Serialization |
| -------------- | ------------: | ------------: |
| **pofile-ts**  | **185 ops/s** | **217 ops/s** |
| gettext-parser |      27 ops/s |      53 ops/s |
| pofile         |       8 ops/s |     100 ops/s |

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

Modernized fork of [pofile](https://github.com/rubenv/pofile) by Ruben Vermeersch. Maintained by [Sebastian Software](https://sebastian-software.de/).

## License

[MIT](LICENSE)
