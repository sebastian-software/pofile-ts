# Rust Core Migration Design

Date: 2026-03-09
Status: Approved

## Summary

`pofile-ts` will be re-architected around a public Rust crate named `pofile`. The Rust crate becomes the canonical implementation for the library's core domain: PO parsing and serialization, ICU parsing and compilation, catalog compilation, message ID generation, and plural logic.

The JavaScript package `pofile-ts` remains the public npm package, but becomes a thin Node.js wrapper over a native binding. Browser support is not a v1 requirement. Breaking API changes are acceptable if they lead to a cleaner Rust-first design and a better long-term foundation for a Rust-based Lingui fork.

## Goals

- Maximize performance for the library's core operations.
- Establish `pofile` as a public Rust crate with a stable, idiomatic API.
- Reuse the Rust core directly in a Rust-based Lingui fork.
- Keep `pofile-ts` as the public JavaScript package name.
- Ship `pofile-ts` with prebuilt native binaries for supported Node.js platforms.

## Non-Goals

- Preserve full API compatibility with the current TypeScript implementation.
- Support browsers, Wasm, Bun, or Deno in the initial release.
- Maintain duplicate business logic in both Rust and TypeScript.
- Stabilize every low-level helper currently exported by `pofile-ts`.

## Constraints

- Initial runtime target is Node.js only.
- The Rust crate should be usable as an independent public product.
- Delivery order is Rust crate first, JavaScript wrapper second.
- v1 scope is the performance-critical core:
  - PO parse/stringify
  - ICU parse/compile
  - catalog compile
  - message ID generation
  - plural logic

## Options Considered

### Option A: Single Rust crate with bindings embedded

Pros:

- fastest to start
- fewer moving parts initially

Cons:

- public Rust API gets distorted by Node binding concerns
- product boundaries are unclear
- harder to keep crate design idiomatic over time

### Option B: Cargo workspace with separate product and binding crates

Structure:

- `crates/pofile`
- `crates/pofile-node`
- `packages/pofile-ts`

Pros:

- clean separation between Rust product and Node binding
- makes `pofile` a real public crate rather than an npm implementation detail
- keeps `pofile-ts` thin and replaceable
- best fit for a shared core with a Rust-based Lingui fork

Cons:

- slightly higher setup complexity
- release automation spans Rust and npm artifacts

### Option C: Stable C ABI or other host-neutral boundary

Pros:

- strongest long-term host/language portability

Cons:

- unnecessary complexity for current scope
- more FFI overhead and release burden

## Decision

Choose Option B.

The repository will evolve into a mixed Cargo + pnpm workspace where:

- `pofile` is the public Rust source of truth
- `pofile-node` is an internal bridge to Node.js
- `pofile-ts` is the public JavaScript facade

## Target Architecture

### Product Layers

1. `pofile`
   Public Rust crate containing all core domain logic and canonical data models.

2. `pofile-node`
   Internal Node binding crate responsible only for translating between Rust and JavaScript values.

3. `pofile-ts`
   Public npm package that exposes ergonomic TypeScript APIs and distributes the native binding.

### Ownership Rules

- Core parsing, compiling, and formatting logic lives only in Rust.
- The Node binding layer contains no independent business logic.
- `pofile-ts` may provide API ergonomics and TypeScript types, but not a second implementation.

## Public API Strategy

### Rust API

The Rust API should be designed as a first-class library:

- idiomatic `Result`-based error handling
- public structs and enums for key domain types
- explicit, documented error categories
- stable top-level API for core operations

### JavaScript API

The JavaScript API should remain intentionally thin:

- preserve recognizable high-level entry points where useful
- allow breaking changes for low-level and legacy exports
- expose stable JS-shaped data rather than leaking Rust internals

### Export Classification

The current `packages/pofile-ts/src/index.ts` surface should be reclassified into:

- `core-public`: must exist cleanly in Rust
- `wrapper-only`: convenience exports that can stay in JS
- `drop-or-redesign`: low-level/internal exports that should not shape the Rust API

## Repository Structure

Planned structure:

```text
crates/
  pofile/
  pofile-node/
packages/
  pofile-ts/
apps/
  docs/
benchmark/
```

### Responsibilities

- `crates/pofile`
  - public library code
  - Rust tests and docs
  - Criterion benchmarks

- `crates/pofile-node`
  - Node bindings
  - JS value conversion
  - native module packaging hooks

- `packages/pofile-ts`
  - thin wrapper API
  - TypeScript declarations
  - npm packaging and release metadata

- `benchmark`
  - cross-language performance comparisons
  - end-to-end Node benchmarks

## Technical Direction

### Rust Core Scope

The initial Rust core should include:

- PO parser
- PO serializer
- plural-forms parser and plural category helpers
- message ID generation
- ICU parser
- ICU compiler
- catalog compiler

### Binding Technology

For Node-only distribution with prebuilt binaries, `napi-rs` is the default recommendation.

Reasons:

- good Node integration
- practical prebuild story
- less maintenance than custom N-API or C ABI glue

### Testing Strategy

The migration should rely on:

- existing `.po` fixtures as golden inputs
- Rust unit and integration tests
- parse -> stringify -> parse roundtrip tests
- snapshot or golden tests for ICU parsing and compilation
- end-to-end JS tests against the native wrapper

### Benchmark Strategy

Performance should be tracked at three levels:

1. Rust microbenchmarks for internal hotspots
2. cross-language comparisons against the current TypeScript implementation
3. end-to-end Node benchmarks for the final `pofile-ts` package

## Migration Plan

### Phase 1: Scope and API audit

- classify current exports
- define public Rust API boundaries
- enumerate intentional JavaScript breaking changes

### Phase 2: Workspace setup

- add Cargo workspace
- create `crates/pofile`
- create `crates/pofile-node`
- extend CI for Rust tooling

### Phase 3: Domain model and errors

- define public Rust structs and enums
- define parse/compile error taxonomy
- document TypeScript-to-Rust model mapping

### Phase 4: Rust core port

Recommended order:

1. PO parsing
2. PO serialization
3. plural logic
4. message ID generation
5. ICU parsing
6. ICU compilation
7. catalog compilation

### Phase 5: Benchmarks and parity validation

- lock in semantic parity for supported features
- establish reproducible benchmark baselines
- document performance targets

### Phase 6: Node bindings and JS wrapper

- implement Node bindings
- replace TypeScript core logic with thin wrapper calls
- keep JavaScript-facing API intentionally small

### Phase 7: Distribution and release

- publish `pofile` on crates.io
- ship `pofile-ts` with prebuilt binaries
- maintain separate semver for Rust and npm packages

### Phase 8: Documentation and integration

- add Rust crate docs
- update npm docs for native-backed architecture
- provide explicit integration guidance for the Rust-based Lingui fork

## Milestones

1. API audit and workspace skeleton
2. Rust PO parser/serializer with tests and benchmarks
3. Rust ICU parser plus plural/message ID utilities
4. Rust ICU compiler and catalog compiler
5. public `pofile` alpha release
6. internal Node binding proof of concept
7. prebuilt binary release pipeline
8. `pofile-ts` major release on Rust core

## Risks

- The existing API surface is broad; trying to preserve too much will damage the Rust API.
- ICU compile behavior may become awkward across the Rust-to-JS boundary.
- Native distribution and CI packaging may consume more time than the core port.
- Without strict product boundaries, `pofile` and `pofile-ts` can drift into duplicate API maintenance.

## Success Criteria

- `pofile` is usable as an independent public Rust crate.
- Core semantic behavior matches approved v1 scope.
- Performance clearly exceeds the current TypeScript implementation on the targeted hot paths.
- `pofile-ts` becomes a true thin wrapper over the native core.
- The Rust-based Lingui fork can consume `pofile` directly without going through JavaScript.

## Immediate Next Step

Create a concrete implementation plan that converts this design into ordered work packages, ownership boundaries, validation gates, and release checkpoints.
