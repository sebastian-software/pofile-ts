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

A robust library for reading and writing GNU gettext PO files. Used by [LinguiJS](https://lingui.dev/) and other i18n tools.

## Features

- 📖 **Parse** PO files from strings
- ✍️ **Serialize** PO files back to strings
- 🎯 **Full PO support** — headers, comments, flags, plurals, context
- 📦 **Zero dependencies** — no Node.js APIs, browser-compatible
- 🔷 **TypeScript** — full type definitions included
- ⚡ **ESM-first** — modern JavaScript with named exports only

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

## API

### Functions

| Function                              | Description                   |
| ------------------------------------- | ----------------------------- |
| `parsePo(content: string): PoFile`    | Parse a PO file string        |
| `stringifyPo(po: PoFile): string`     | Serialize a PO file to string |
| `createPoFile(): PoFile`              | Create a new empty PO file    |
| `createItem(options?): PoItem`        | Create a new translation item |
| `stringifyItem(item: PoItem): string` | Serialize a single item       |
| `parsePluralForms(header: string)`    | Parse the Plural-Forms header |

### Types

| Type      | Description                             |
| --------- | --------------------------------------- |
| `PoFile`  | Complete PO file with headers and items |
| `PoItem`  | Single translation entry                |
| `Headers` | Standard PO file headers                |

## Migration from `pofile`

If you're migrating from the original `pofile` package:

```typescript
// Before (pofile)
import PO from "pofile"
const po = PO.parse(content)
const item = new PO.Item()
po.toString()

// After (pofile-ts)
import { parsePo, stringifyPo, createPoFile, createItem } from "pofile-ts"
const po = parsePo(content)
const item = createItem()
stringifyPo(po)
```

Key differences:

- **Functional API** — no classes, just functions and plain objects
- **Named exports only** — no default export for better CJS/ESM compatibility
- **TypeScript-first** — full type definitions included
- `PoFile` and `PoItem` are plain interfaces, not class instances

For comprehensive documentation including plurals support, visit the **[Documentation](https://sebastian-software.github.io/pofile-ts/)**.

## Credits

This is a modernized fork of [pofile](https://github.com/rubenv/pofile) by Ruben Vermeersch, which was originally based on [node-po](https://github.com/mikejholly/node-po) by Michael Holly.

Also inspired by [@lingui/pofile](https://github.com/timofei-iatsenko/pofile) by Timofei Iatsenko.

Maintained by [Sebastian Software](https://sebastian-software.de/).

## License

[MIT](LICENSE)
