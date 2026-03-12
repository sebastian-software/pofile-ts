# Serializable Compiled Catalog Design

Date: 2026-03-12
Status: Approved
Issue: `#7`

## Summary

Add a new additive compile surface that returns a serialization-friendly catalog payload for host bindings.

The existing runtime API stays unchanged:

- `pofile::compile_catalog(...) -> CompiledCatalog`
- `pofile-ts::compileCatalog(...) -> CompiledCatalog`

The new API returns a host-neutral, JSON-safe representation of compiled messages:

- `pofile::serialize_compiled_catalog(...) -> SerializedCompiledCatalog`
- `pofile-ts::serializeCompiledCatalog(...) -> SerializedCompiledCatalog`

This solves the host-binding use case from issue `#7` without overloading the runtime API with transport concerns.

## Why Separate API

`compileCatalog()` and the requested feature serve different jobs:

- runtime compile: format messages immediately through runtime objects and host callbacks
- serializable compile: return stable data that can cross a process or language boundary

Keeping them separate avoids:

- options like `serialize: true` on runtime compile APIs
- union return types
- leaking binding/codegen concerns into the core runtime surface

## API Shape

### Rust

Add new public types in `pofile::compile`:

- `SerializedCompiledCatalog`
- `SerializedCompiledEntry`
- `SerializedCompiledMessage`
- `SerializedCompiledMessageKind`

Add new public function:

- `serialize_compiled_catalog(catalog: &Catalog, options: &CompileCatalogOptions) -> Result<SerializedCompiledCatalog, IcuParseError>`

### TypeScript

Add new public types and function:

- `SerializedCompiledCatalog`
- `SerializedCompiledEntry`
- `SerializedCompiledMessage`
- `SerializedCompiledMessageKind`
- `serializeCompiledCatalog(catalog, options)`

The TypeScript API uses the native binding when available and falls back to a pure-JS implementation that returns the same payload shape.

## Payload Shape

The payload is intentionally host-neutral and JSON-safe:

```ts
interface SerializedCompiledCatalog {
  locale: string
  entries: SerializedCompiledEntry[]
}

interface SerializedCompiledEntry {
  key: string
  message: SerializedCompiledMessage
}

type SerializedCompiledMessage =
  | {
      kind: "icu"
      ast: IcuNode[]
    }
  | {
      kind: "gettextPlural"
      variable: string
      forms: SerializedCompiledMessage[]
    }
  | {
      kind: "fallback"
      text: string
    }
```

Notes:

- `key` already reflects `use_message_id`
- `locale` is carried at the catalog level
- ICU messages are serialized as AST nodes
- gettext plurals keep the already-resolved runtime plural variable and compiled forms
- invalid non-strict messages serialize as `fallback`

This shape mirrors the existing compile pipeline closely enough to avoid inventing a second compiler model.

## Implementation Strategy

### Rust Core

Refactor compile internals so both runtime and serializable compile paths share the same message analysis rules:

- singular translations compile either to parsed ICU AST or fallback text
- gettext plural translations resolve plural variable and compile each form recursively

Add conversion from runtime-oriented internal kinds to serializable kinds only where that keeps logic simple. Do not redesign `CompiledCatalog`.

### Node Binding

Expose one new N-API function:

- `serializeCompiledCatalogJson(catalogJson, optionsJson) -> string`

The binding parses the input catalog, calls `serialize_compiled_catalog`, and returns JSON text.

### TypeScript Wrapper

Add:

- `serializeCompiledCatalogNative(...)`
- `serializeCompiledCatalog(...)`

Rules:

- use native binding when available and no unsupported host-only inputs are needed
- otherwise use a JS implementation
- keep `compileCatalog()` unchanged

## Error Handling

- `strict: true` preserves current compile behavior and returns ICU parse errors
- `strict: false` serializes invalid messages as `fallback`
- no bundler-specific output is produced in this API

## Testing

Add tests for:

- Rust serializable singular ICU messages
- Rust serializable gettext plural messages
- strict vs non-strict invalid ICU handling
- `use_message_id` key behavior
- Node binding JSON roundtrip
- TypeScript native/js parity on payload shape

## Non-Goals

- generating ESM or CJS directly
- changing `compileCatalog()`
- changing `generateCompiledCode()`
- exposing host callbacks or tag renderers through the serialized payload
