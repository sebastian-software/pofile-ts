# RFC: ICU ↔ Gettext Plural Conversion for pofile-ts

## Summary

Add optional utilities to convert between ICU MessageFormat plurals and native Gettext plurals (`msgid_plural` / `msgstr[n]`).

## Motivation

Many translation management systems (TMS) like Crowdin, Transifex, Phrase, and Weblate understand native Gettext plurals but **not** ICU MessageFormat embedded in `msgstr`.

Currently, projects using ICU-based i18n (like Lingui, FormatJS) need custom tooling to:

1. Convert ICU plurals to Gettext format for TMS export
2. Convert Gettext plurals back to ICU after translation

This is a **general interoperability problem**, not specific to any framework.

## Background: Gettext Plurals

Gettext has native plural support:

```po
# Native Gettext plurals
msgid "One item"
msgid_plural "{count} items"
msgstr[0] "Ein Artikel"
msgstr[1] "{count} Artikel"
```

The number of `msgstr[n]` entries depends on the target language's plural rules (defined in the PO header's `Plural-Forms`).

## Background: ICU MessageFormat Plurals

ICU MessageFormat expresses plurals inline:

```
{count, plural, one {# item} other {# items}}
```

This is more expressive (supports `zero`, `one`, `two`, `few`, `many`, `other` + exact matches) but not understood by traditional Gettext tools.

## Proposed API

### 1. ICU → Gettext Conversion

```typescript
import { icuToGettextPlural } from "pofile-ts/icu"

const result = icuToGettextPlural("{count, plural, one {# item} other {# items}}")
// Returns:
// {
//   msgid: "# item",
//   msgid_plural: "# items",
//   pluralVariable: "count",
//   cases: { one: "# item", other: "# items" }
// }
```

### 2. Gettext → ICU Conversion

```typescript
import { gettextToIcuPlural } from "pofile-ts/icu"

const icu = gettextToIcuPlural({
  msgstr: ["# Artikel", "# Artikel"], // German translations
  pluralVariable: "count",
  locale: "de" // Needed to map msgstr indices to CLDR categories
})
// Returns: "{count, plural, one {# Artikel} other {# Artikel}}"
```

### 3. High-Level Item Conversion

```typescript
import { convertItemToGettext, convertItemFromGettext } from "pofile-ts/icu"

// Convert a PO item with ICU msgstr to native Gettext format
const gettextItem = convertItemToGettext(icuItem, { locale: "de" })

// Convert back
const icuItem = convertItemFromGettext(gettextItem, {
  pluralVariable: "count", // Stored in extracted comments
  locale: "de"
})
```

### 4. Plural Forms Helper

```typescript
import { getPluralForms, getPluralCategories } from "pofile-ts/icu"

// Get Gettext Plural-Forms header for a locale
const forms = getPluralForms("de")
// → "nplurals=2; plural=(n != 1);"

// Get CLDR plural categories for a locale
const categories = getPluralCategories("de")
// → ["one", "other"]

// Get sample numbers for each category (for msgstr index mapping)
const samples = getPluralSamples("de")
// → { one: 1, other: 2 }
```

## Implementation Details

### Dependencies

- **ICU Parsing:** Use `@messageformat/parser` (lightweight, well-maintained)
- **Plural Rules:** Use `plurals-cldr` for CLDR plural category detection
- **Gettext Plural-Forms:** Use `node-gettext/lib/plurals` or inline the data

### Subpath Export

To keep the main `pofile-ts` bundle small, these utilities should be in a subpath:

```typescript
// Main API (no ICU dependency)
import { parsePo, stringifyPo } from "pofile-ts"

// ICU utilities (optional, brings in @messageformat/parser)
import { icuToGettextPlural } from "pofile-ts/icu"
```

### Context Storage

When converting ICU → Gettext, we need to store metadata to enable roundtrip:

- The plural variable name (`count`, `n`, etc.)
- The original ICU expression (for complex cases)

This is stored in extracted comments:

```po
#. pofile-ts:icu:{count, plural, one {# item} other {# items}}
#. pofile-ts:pluralizeOn:count
msgid "# item"
msgid_plural "# items"
```

## Limitations

Document these clearly:

1. **Nested plurals** - Gettext can't express `{a, plural, one {{b, plural, ...}}}`
2. **Select expressions** - `{gender, select, ...}` has no Gettext equivalent
3. **Exact matches** - `=0`, `=1` need special handling
4. **Octothorpe `#`** - Maps to the plural variable, works in both formats

## Alternatives Considered

### A: Keep in Lingui/Palamedes

- ❌ Other projects would duplicate this logic
- ❌ Not reusable for FormatJS, etc.

### B: Separate `icu-gettext` package

- ✅ Clean separation
- ❌ Yet another package to maintain
- ❌ Loses context of PO item handling

### C: Integrate in pofile-ts (Recommended)

- ✅ Natural fit - extends PO file handling
- ✅ Optional via subpath export
- ✅ Single source of truth for PO + ICU interop

## Migration Path

Projects like `@lingui/format-po-gettext` could:

1. Depend on `pofile-ts/icu` for the heavy lifting
2. Keep only Lingui-specific catalog mapping
3. Eventually deprecate in favor of direct `pofile-ts` usage

## Open Questions

1. Should we bundle CLDR plural data or require runtime locale data?
2. Should `#` (octothorpe) be preserved literally or replaced with `{variable}`?
3. Include SelectOrdinal support? (first, second, third... → Gettext doesn't have this)

## Summary

| Feature                         | In pofile-ts? | Notes                     |
| ------------------------------- | ------------- | ------------------------- |
| ICU → Gettext plural conversion | ✅ Yes        | Via `/icu` subpath        |
| Gettext → ICU conversion        | ✅ Yes        | With locale-aware mapping |
| Plural-Forms header generation  | ✅ Yes        | Common need               |
| CLDR category detection         | ✅ Yes        | Via `plurals-cldr`        |
| Select expression handling      | ❌ No         | No Gettext equivalent     |
| Nested plurals                  | ❌ No         | Warn and skip             |

---

_This RFC complements RFC-pofile-ts-lingui-features.md and can be implemented independently._
