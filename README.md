# pofile

> Parse and serialize Gettext PO files.

[![npm version](https://img.shields.io/npm/v/pofile.svg)](https://www.npmjs.com/package/pofile)
[![npm downloads](https://img.shields.io/npm/dm/pofile.svg)](https://www.npmjs.com/package/pofile)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A robust library for reading and writing GNU gettext PO files. Used by [LinguiJS](https://lingui.dev/) and other i18n tools.

## Features

- 📖 **Parse** PO files from strings or files
- ✍️ **Write** PO files back to strings or files
- 🎯 **Full PO support** — headers, comments, flags, plurals, context
- 📦 **Zero dependencies**
- 🔷 **TypeScript** — full type definitions included
- ⚡ **ESM & CommonJS** — works everywhere

## Installation

```bash
npm install pofile
```

## Quick Start

```typescript
import PO from "pofile"

// Parse a PO file
const po = PO.parse(`
msgid "Hello"
msgstr "Hallo"
`)

console.log(po.items[0].msgid)  // "Hello"
console.log(po.items[0].msgstr) // ["Hallo"]

// Create a new PO file
const newPo = new PO()
newPo.headers["Content-Type"] = "text/plain; charset=UTF-8"

const item = new PO.Item()
item.msgid = "Welcome"
item.msgstr = ["Willkommen"]
newPo.items.push(item)

console.log(newPo.toString())
```

## API

### `PO` Class

The main class representing a PO file.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `headers` | `Record<string, string>` | PO file headers (Content-Type, Language, etc.) |
| `comments` | `string[]` | Translator comments at file header |
| `extractedComments` | `string[]` | Extracted comments at file header |
| `items` | `Item[]` | Translation entries |

#### Static Methods

##### `PO.parse(data: string): PO`

Parses a PO file string and returns a `PO` instance.

```typescript
const po = PO.parse(poFileContent)
```

##### `PO.load(filename: string): Promise<PO>`

Loads a PO file from disk (Node.js only).

```typescript
const po = await PO.load("messages.po")
console.log(po.items.length)
```

#### Instance Methods

##### `po.toString(): string`

Serializes the PO file to a string.

```typescript
const output = po.toString()
```

##### `po.save(filename: string): Promise<void>`

Saves the PO file to disk (Node.js only).

```typescript
await po.save("output.po")
```

---

### `PO.Item` Class

Represents a single translation entry.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `msgid` | `string` | Source string |
| `msgid_plural` | `string \| null` | Plural form of source string |
| `msgstr` | `string[]` | Translated string(s) |
| `msgctxt` | `string \| null` | Message context for disambiguation |
| `references` | `string[]` | Source file references |
| `comments` | `string[]` | Translator comments |
| `extractedComments` | `string[]` | Automatically extracted comments |
| `flags` | `Record<string, boolean>` | Flags like `fuzzy` |
| `obsolete` | `boolean` | Whether entry is obsolete |

#### Example

```typescript
const item = new PO.Item()
item.msgid = "Hello, {name}!"
item.msgstr = ["Hallo, {name}!"]
item.references = ["src/greeting.ts:42"]
item.flags.fuzzy = true

po.items.push(item)
```

## Working with Plurals

PO files support plural forms. The number of plural forms depends on the language.

```typescript
const item = new PO.Item()
item.msgid = "One item"
item.msgid_plural = "{count} items"
item.msgstr = [
  "Ein Element",      // singular
  "{count} Elemente"  // plural
]

po.items.push(item)
```

## Credits

Originally based on [node-po](https://github.com/mikejholly/node-po) by Michael Holly.
Maintained by [Sebastian Software](https://sebastian-software.de/).

## License

[MIT](LICENSE)
