# pofile-ts 3.7.1 Feedback

Feedback based on integrating pofile-ts into the Lingui i18n framework.

## Bugs

### 1. `selectOrdinal` Case-Sensitivity

The ICU parser does not recognize `selectOrdinal` (camelCase), only `selectordinal` (lowercase):

```javascript
parseIcu("{count, selectordinal, one {#st} other {#th}}") // ✅ success: true
parseIcu("{count, selectOrdinal, one {#st} other {#th}}") // ❌ success: false
// Error: "Invalid argument type: selectOrdinal"
```

ICU MessageFormat keywords should be case-insensitive according to the spec. This forced us to implement a regex-based fallback for detection.

**Suggested fix**: Make keyword matching case-insensitive in the parser.

### 2. `hasSelect()` Does Not Detect `selectOrdinal`

Since `selectordinal` is internally parsed as `plural` with `pluralType: "ordinal"`, `hasSelect()` returns `false` for selectOrdinal messages:

```javascript
hasSelect("{count, selectordinal, one {#st} other {#th}}") // → false
hasPlural("{count, selectordinal, one {#st} other {#th}}") // → true
```

This is confusing because `selectOrdinal` is semantically closer to `select` than to `plural` in terms of gettext compatibility (neither can be expressed as gettext plurals).

**Suggested fix**: Either export a `hasSelectOrdinal()` function, or document this behavior clearly.

## Feature Requests

### 1. Add `getPluralFormsHeader()` Function

A direct function to get the Plural-Forms header string for a locale would be convenient:

```javascript
// Current approach (verbose)
const headers = createDefaultHeaders({ language: "de" })
const pluralForms = headers["Plural-Forms"]

// Suggested API
const pluralForms = getPluralFormsHeader("de")
// → "nplurals=2; plural=(n != 1);"
```

### 2. Consistent `expandOctothorpe` Defaults

Both `gettextToIcu` and `icuToGettextSource` default to `expandOctothorpe: true`. For round-trip conversions, both must be set to `false` to preserve `#`:

```javascript
// Round-trip preserving #
const gettext = icuToGettextSource(icu, { expandOctothorpe: false })
const backToIcu = gettextToIcu(item, { locale, expandOctothorpe: false })
```

**Suggestion**: Consider a `preserveOctothorpe` option or document the round-trip pattern.

### 3. AST Node Type Debug Helper

Node types are numeric (`type: 6` for plural) which is efficient but hard to debug:

```javascript
// Current: requires looking up the enum
node.type === 6 // Is this plural? select?

// Suggested helper
getNodeTypeName(node.type) // → "plural"
```

### 4. Export `hasSelectOrdinal()` or Similar

For detecting ordinal plurals specifically:

```javascript
export function hasSelectOrdinal(message: string): boolean
// or
export function hasOrdinalPlural(message: string): boolean
```

## Documentation Improvements

### 1. Parser Differences

Document key differences between pofile-ts ICU parser and alternatives (FormatJS, @messageformat/parser):

- Case-sensitivity requirements
- Supported syntax subset
- AST structure differences
- Error handling differences

### 2. Keyword Case Requirements

Add a note that `selectordinal` must be lowercase, unlike the common camelCase convention.

### 3. Round-Trip Examples

Add examples for ICU ↔ Gettext round-trip conversions:

```javascript
// ICU → Gettext (for TMS export)
const { msgid, msgid_plural } = icuToGettextSource(icuMessage, {
  expandOctothorpe: false
})

// Gettext → ICU (for catalog import)
const icuMessage = gettextToIcu(poItem, {
  locale: "de",
  pluralVariable: "count",
  expandOctothorpe: false
})
```

## What Works Well

- **Performance**: Noticeably faster than @messageformat/parser
- **`generateMessageIdSync`**: Very convenient for message ID generation
- **`createDefaultHeaders`**: Automatically sets Plural-Forms based on locale
- **`formatPoDate`**: Identical format to date-fns, saves a dependency
- **`getPluralCategories`**: Cached and fast, uses native Intl.PluralRules
- **`gettextToIcu` / `icuToGettextSource`**: Great high-level conversion APIs
- **Zero dependencies**: No transitive dependency bloat
- **TypeScript definitions**: Comprehensive and accurate
- **Tree-shaking**: Works well with modern bundlers

## Environment

- pofile-ts version: 3.7.1
- Node.js version: 20+
- Use case: Lingui i18n framework (format-po, format-po-gettext packages)
