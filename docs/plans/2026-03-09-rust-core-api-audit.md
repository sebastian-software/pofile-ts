# Rust Core API Audit

Date: 2026-03-09
Status: Draft
Depends on: `docs/plans/2026-03-09-rust-core-migration-design.md`

## Purpose

Classify the current public API of `packages/pofile-ts/src/index.ts` into:

- `core-public`: should exist in the public Rust crate, though not necessarily with the same exact shape
- `wrapper-only`: should remain a JavaScript/package-ergonomics concern
- `drop-or-redesign`: should not be carried over 1:1 into the new architecture

This document is the first guardrail against turning `pofile` into a Rust copy of the current TypeScript surface.

## Summary

The current surface mixes three very different concerns:

1. actual product API for PO and ICU operations
2. JavaScript convenience helpers
3. internal parsing and codegen internals exposed for advanced users

The Rust migration should preserve only the first group as a stable crate surface. The second group can stay in `pofile-ts` if still useful. The third group should mostly disappear from the public API, or be reintroduced later under a new, narrower design.

## Classification

### Core API

| Export          | Class          | Notes                                                                                      |
| --------------- | -------------- | ------------------------------------------------------------------------------------------ |
| `parsePo`       | `core-public`  | Core product entry point.                                                                  |
| `createPoFile`  | `wrapper-only` | Rust should prefer `PoFile::new()` or `Default`; no need for a top-level factory function. |
| `stringifyPo`   | `core-public`  | Core product entry point.                                                                  |
| `createItem`    | `wrapper-only` | Better modeled as `PoItem::new()` or builder methods in Rust.                              |
| `stringifyItem` | `wrapper-only` | Useful in JS ergonomics, but not a required top-level Rust API.                            |

### Header Utilities

| Export                 | Class          | Notes                                                                        |
| ---------------------- | -------------- | ---------------------------------------------------------------------------- |
| `createDefaultHeaders` | `wrapper-only` | Convenience helper; Rust can expose defaults via types/constructors instead. |
| `formatPoDate`         | `wrapper-only` | Formatting helper, not essential for v1 core.                                |
| `getPluralFormsHeader` | `core-public`  | Domain-relevant helper that aligns with plural logic and PO authoring.       |

### Reference Utilities

| Export              | Class          | Notes                                                     |
| ------------------- | -------------- | --------------------------------------------------------- |
| `parseReference`    | `core-public`  | PO-domain helper worth keeping if references stay public. |
| `formatReference`   | `core-public`  | Same as above.                                            |
| `parseReferences`   | `core-public`  | Same as above.                                            |
| `formatReferences`  | `core-public`  | Same as above.                                            |
| `createReference`   | `wrapper-only` | Better expressed via a Rust struct constructor.           |
| `normalizeFilePath` | `wrapper-only` | JS/platform convenience, not core library identity.       |

### Catalog Utilities

| Export           | Class          | Notes                                                                 |
| ---------------- | -------------- | --------------------------------------------------------------------- |
| `catalogToItems` | `core-public`  | Needed if catalog compile remains part of the public product.         |
| `itemsToCatalog` | `core-public`  | Same.                                                                 |
| `mergeCatalogs`  | `wrapper-only` | Useful, but not required to define the Rust crate's initial identity. |

### Compilation

| Export                 | Class              | Notes                                                                                                   |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| `compileCatalog`       | `core-public`      | In v1 scope and strategically important for Lingui integration.                                         |
| `generateCompiledCode` | `drop-or-redesign` | JS codegen concerns should not shape the Rust core v1 API. If revived, likely as a separate tool layer. |

### Message ID Generation

| Export                  | Class              | Notes                                                                           |
| ----------------------- | ------------------ | ------------------------------------------------------------------------------- |
| `generateMessageId`     | `drop-or-redesign` | Async JS shape is not a good Rust public API.                                   |
| `generateMessageIdSync` | `core-public`      | Core deterministic functionality should remain available in Rust.               |
| `generateMessageIds`    | `core-public`      | Batch helper is still useful, but should likely be renamed or reshaped in Rust. |

### Plural Utilities

| Export                | Class         | Notes                                                                                       |
| --------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| `parsePluralForms`    | `core-public` | In v1 scope.                                                                                |
| `getPluralCategories` | `core-public` | In v1 scope.                                                                                |
| `getPluralCount`      | `core-public` | In v1 scope.                                                                                |
| `getPluralFunction`   | `core-public` | In Rust this should likely become a typed evaluator rather than a JS-style callback helper. |

### Comment Utilities

| Export                   | Class          | Notes                                                        |
| ------------------------ | -------------- | ------------------------------------------------------------ |
| `splitMultilineComments` | `wrapper-only` | Convenience utility, not a core product-defining capability. |

### ICU Parsing, Analysis, Conversion, Compilation

| Export                | Class         | Notes                                                                  |
| --------------------- | ------------- | ---------------------------------------------------------------------- |
| `parseIcu`            | `core-public` | In v1 scope.                                                           |
| `IcuParser`           | `core-public` | Worth keeping if a stateful parser type remains useful in Rust.        |
| `IcuSyntaxError`      | `core-public` | Should become part of the Rust error taxonomy.                         |
| `extractVariables`    | `core-public` | Useful analysis helper.                                                |
| `extractVariableInfo` | `core-public` | Useful analysis helper.                                                |
| `validateIcu`         | `core-public` | Useful public capability.                                              |
| `compareVariables`    | `core-public` | Useful for translation validation workflows.                           |
| `hasPlural`           | `core-public` | Lightweight analysis helper worth retaining.                           |
| `hasSelect`           | `core-public` | Same.                                                                  |
| `hasSelectOrdinal`    | `core-public` | Same.                                                                  |
| `hasIcuSyntax`        | `core-public` | Same.                                                                  |
| `gettextToIcu`        | `core-public` | Strategically relevant for Lingui-facing workflows.                    |
| `isPluralItem`        | `core-public` | Domain utility tied to conversion.                                     |
| `normalizeItemToIcu`  | `core-public` | Useful, but may want a narrower Rust naming/design pass.               |
| `normalizeToIcu`      | `core-public` | Same.                                                                  |
| `icuToGettextSource`  | `core-public` | Relevant for roundtrip and migration workflows.                        |
| `compileIcu`          | `core-public` | In v1 scope.                                                           |
| `createIcuCompiler`   | `core-public` | Keep conceptually, but likely redesign as builder/config type in Rust. |

### Serialization Internals

| Export                      | Class              | Notes                                               |
| --------------------------- | ------------------ | --------------------------------------------------- |
| `DEFAULT_SERIALIZE_OPTIONS` | `drop-or-redesign` | Better represented as `Default` on an options type. |
| `foldLine`                  | `drop-or-redesign` | Internal formatting primitive.                      |
| `formatKeyword`             | `drop-or-redesign` | Internal formatting primitive.                      |

### Low-Level Parsing Internals

| Export               | Class              | Notes                           |
| -------------------- | ------------------ | ------------------------------- |
| `escapeString`       | `drop-or-redesign` | Internal implementation detail. |
| `unescapeString`     | `drop-or-redesign` | Internal implementation detail. |
| `extractString`      | `drop-or-redesign` | Internal implementation detail. |
| `splitHeaderAndBody` | `drop-or-redesign` | Parser pipeline detail.         |
| `parseHeaders`       | `drop-or-redesign` | Internal parser stage.          |
| `parseItems`         | `drop-or-redesign` | Internal parser stage.          |

### Code Generation Internals

| Export                          | Class              | Notes                                             |
| ------------------------------- | ------------------ | ------------------------------------------------- |
| `extractPluralVariable`         | `drop-or-redesign` | Internal compiler helper.                         |
| `safeVarName`                   | `drop-or-redesign` | JS codegen-specific.                              |
| `sanitizeStyle`                 | `drop-or-redesign` | JS codegen-specific.                              |
| `escapeTemplateString`          | `drop-or-redesign` | JS codegen-specific.                              |
| `escapeComment`                 | `drop-or-redesign` | JS codegen-specific.                              |
| `getNumberOptionsForStyle`      | `drop-or-redesign` | Codegen/formatting helper, not v1 crate-defining. |
| `generatePluralFunctionCode`    | `drop-or-redesign` | Explicit JS codegen concern.                      |
| `generateFormatterDeclarations` | `drop-or-redesign` | Explicit JS codegen concern.                      |
| `createCodeGenContext`          | `drop-or-redesign` | Internal codegen state.                           |
| `generateNodesCode`             | `drop-or-redesign` | Explicit JS codegen concern.                      |
| `generateNodeCode`              | `drop-or-redesign` | Explicit JS codegen concern.                      |

### Public Types

| Export                   | Class              | Notes                                                             |
| ------------------------ | ------------------ | ----------------------------------------------------------------- |
| `Headers`                | `core-public`      | Public PO-domain type.                                            |
| `ParsedPluralForms`      | `core-public`      | Public result type.                                               |
| `PoFile`                 | `core-public`      | Core public type.                                                 |
| `PoItem`                 | `core-public`      | Core public type.                                                 |
| `CreateItemOptions`      | `wrapper-only`     | Rust should not mirror JS object-constructor ergonomics directly. |
| `SerializeOptions`       | `core-public`      | Public config type.                                               |
| `ParserState`            | `drop-or-redesign` | Explicit internal parser state.                                   |
| `CodeGenContext`         | `drop-or-redesign` | Internal codegen type.                                            |
| `MessageCodeResult`      | `drop-or-redesign` | Internal codegen type.                                            |
| `CreateHeadersOptions`   | `wrapper-only`     | Convenience helper config.                                        |
| `SourceReference`        | `core-public`      | Public if references module remains public.                       |
| `FormatReferenceOptions` | `core-public`      | Same.                                                             |
| `Catalog`                | `core-public`      | Required for catalog compile.                                     |
| `CatalogEntry`           | `core-public`      | Same.                                                             |
| `CatalogToItemsOptions`  | `core-public`      | Public conversion config.                                         |
| `ItemsToCatalogOptions`  | `core-public`      | Public conversion config.                                         |
| `CompileCatalogOptions`  | `core-public`      | Public compile config.                                            |
| `CompiledCatalog`        | `core-public`      | Public result type, but shape may differ in Rust.                 |
| `GenerateCodeOptions`    | `drop-or-redesign` | Tied to JS code generation, not Rust v1.                          |
| `GenerateIdsOptions`     | `core-public`      | Likely retained with a more idiomatic Rust naming pass.           |

### ICU Types

| Export                      | Class              | Notes                                                          |
| --------------------------- | ------------------ | -------------------------------------------------------------- |
| `GettextToIcuOptions`       | `core-public`      | Public conversion config.                                      |
| `NormalizeToIcuOptions`     | `core-public`      | Public conversion config.                                      |
| `IcuToGettextOptions`       | `core-public`      | Public conversion config.                                      |
| `IcuDurationStyle`          | `core-public`      | Part of public formatting surface.                             |
| `IcuAgoStyle`               | `core-public`      | Same.                                                          |
| `IcuNode` and node subtypes | `core-public`      | Required if AST is public.                                     |
| `IcuPluralOption`           | `core-public`      | AST surface.                                                   |
| `IcuSelectOption`           | `core-public`      | AST surface.                                                   |
| `IcuLocation`               | `core-public`      | Keep only if location data survives the Rust parser design.    |
| `IcuPosition`               | `core-public`      | Same.                                                          |
| `IcuParserOptions`          | `core-public`      | Public parser config.                                          |
| `IcuParseError`             | `core-public`      | Public error type.                                             |
| `IcuParseResult`            | `core-public`      | Public result model.                                           |
| `IcuVariable`               | `core-public`      | Public analysis type.                                          |
| `IcuValidationResult`       | `core-public`      | Public validation result.                                      |
| `IcuVariableComparison`     | `core-public`      | Public comparison result.                                      |
| `CompileIcuOptions`         | `core-public`      | Public compile config.                                         |
| `CompiledMessageFunction`   | `drop-or-redesign` | JS function type should not be mirrored directly in Rust.      |
| `MessageValues`             | `drop-or-redesign` | JS dynamic record shape will need a new Rust design.           |
| `MessageResult`             | `drop-or-redesign` | JS return-shape semantics need redesign for Rust and Node FFI. |

## Proposed Rust Module Map

The initial public crate should be organized around domain concepts, not TypeScript file history:

```text
pofile::
  po
  headers
  references
  catalog
  plurals
  message_id
  icu
```

Suggested responsibilities:

- `pofile::po`
  - `PoFile`, `PoItem`
  - parse/stringify entry points
  - serialization options

- `pofile::headers`
  - header defaults and plural-forms header helpers

- `pofile::references`
  - reference parsing and formatting types/helpers

- `pofile::catalog`
  - catalog model
  - item/catalog conversion
  - catalog compile entry points

- `pofile::plurals`
  - plural-forms parsing
  - locale plural helpers

- `pofile::message_id`
  - deterministic message ID generation

- `pofile::icu`
  - parser
  - AST
  - validation helpers
  - gettext/ICU conversion
  - compiler

## Likely Breaking Changes

These are the most obvious candidates for intentional breakage in `pofile-ts`:

- remove public exports of parser internals and serializer internals
- remove public JS codegen internals from the default package surface
- replace async/sync split for message ID generation with a simpler native-backed API
- redesign `compileIcu` result/value types around the native boundary
- move top-level factory conveniences toward type constructors or wrapper-only helpers

## High-Risk Areas For Early Prototypes

1. `compileIcu` output model
   The current JS API returns callable functions over loose value bags. This will need a deliberate Rust runtime model and a separate Node-facing representation.

2. `CompiledCatalog`
   Runtime lookup ergonomics are easy in JS and more opinionated in Rust. The crate API and Node API may need different shapes over the same core.

3. ICU AST location fields
   If precise source locations are expensive or unstable in Rust, they may need to become optional or be dropped from the public AST.

4. Reference helpers
   These are domain-relevant, but it is still worth verifying that they deserve top-level public exposure in `v1`.

## Recommendation

Treat this audit as the baseline contract for the next design step:

1. lock the Rust public modules and top-level types
2. explicitly mark `drop-or-redesign` exports as non-goals for `pofile v1`
3. start implementation with the `core-public` PO path first
