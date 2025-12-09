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

- 📖 **Parse** PO files from strings or files
- ✍️ **Write** PO files back to strings or files
- 🎯 **Full PO support** — headers, comments, flags, plurals, context
- 📦 **Zero dependencies**
- 🔷 **TypeScript** — full type definitions included
- ⚡ **ESM-first** — modern JavaScript

## Installation

```bash
npm install pofile-ts
```

## Quick Start

```typescript
import PO from "pofile-ts"

// Parse a PO file
const po = PO.parse(`
msgid "Hello"
msgstr "Hallo"
`)

console.log(po.items[0].msgid) // "Hello"
console.log(po.items[0].msgstr) // ["Hallo"]

// Create a new PO file
const newPo = new PO()
const item = new PO.Item()
item.msgid = "Welcome"
item.msgstr = ["Willkommen"]
newPo.items.push(item)

console.log(newPo.toString())
```

For comprehensive documentation including API reference, plurals support, and migration guide from the original `pofile` package, visit the **[Documentation](https://sebastian-software.github.io/pofile-ts/)**.

## Credits

This is a modernized fork of [pofile](https://github.com/rubenv/pofile) by Ruben Vermeersch, which was originally based on [node-po](https://github.com/mikejholly/node-po) by Michael Holly.

Maintained by [Sebastian Software](https://sebastian-software.de/).

## License

[MIT](LICENSE)
