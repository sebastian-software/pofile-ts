# Rust Core Migration Implementation Plan

Date: 2026-03-09
Status: Draft
Depends on: `docs/plans/2026-03-09-rust-core-migration-design.md`

## Outcome

Deliver a public Rust crate `pofile` and migrate `pofile-ts` into a thin Node.js wrapper with prebuilt native binaries, while preserving the project's performance focus and enabling direct reuse from a Rust-based Lingui fork.

## Workstreams

### 1. API Audit

Goal:

- reduce the current TypeScript surface into an intentional Rust-first product boundary

Tasks:

- inventory every export from `packages/pofile-ts/src/index.ts`
- classify each export as `core-public`, `wrapper-only`, or `drop-or-redesign`
- identify high-risk behavior that needs parity fixtures before porting
- define the intended top-level Rust API modules

Deliverables:

- export inventory table
- proposed Rust public module map
- breaking-change list for future `pofile-ts` major release

Exit criteria:

- every current export has a disposition
- no unresolved ambiguity about what belongs in the public Rust crate

### 2. Workspace Foundation

Goal:

- prepare the repository to host Rust and JS products without muddled boundaries

Tasks:

- add top-level Cargo workspace
- create `crates/pofile`
- create `crates/pofile-node`
- wire formatting, linting, and test commands for Rust
- extend CI to run Rust checks alongside existing JS checks

Deliverables:

- working Cargo workspace
- baseline CI jobs for `fmt`, `clippy`, `test`, and `doc`

Exit criteria:

- local and CI Rust skeleton passes cleanly

### 3. Public Rust Data Model

Goal:

- define stable domain types before porting implementation details

Tasks:

- define `PoFile`, `PoItem`, header/reference/catalog representations
- define ICU AST surface intended to be public
- design error enums for parse, validation, and compile failures
- decide which internals stay private

Deliverables:

- public type definitions in `crates/pofile`
- crate-level API outline
- documented mapping from JS-facing objects to Rust types

Exit criteria:

- crate surface is coherent without reference to Node binding constraints

### 4. PO Core Port

Goal:

- move the highest-confidence, performance-critical PO functionality first

Tasks:

- port line splitting, header parsing, item parsing, and serialization
- port reference/comment/header helpers that belong to `core-public`
- reuse existing fixtures for golden tests
- add roundtrip tests and malformed-input coverage
- add Criterion benchmarks for parser and serializer hot paths

Deliverables:

- stable Rust PO parser
- stable Rust PO serializer
- baseline Rust benchmarks

Exit criteria:

- fixture coverage matches the current supported PO behavior
- roundtrip correctness is established

### 5. Plural and Message ID Port

Goal:

- port supporting primitives required by catalog and ICU features

Tasks:

- implement plural-forms parser
- implement plural category/count helpers
- port message ID generation
- verify deterministic output against TypeScript fixtures

Deliverables:

- Rust plural utilities
- Rust message ID utilities

Exit criteria:

- outputs are stable and documented

### 6. ICU Parser Port

Goal:

- make ICU parsing available as a standalone public Rust capability

Tasks:

- port tokenizer/parser behavior
- define public AST and parse result model
- port validation and variable extraction helpers that belong to `core-public`
- build golden tests from representative ICU fixtures
- add Criterion benchmarks for realistic message patterns

Deliverables:

- Rust ICU parser
- public AST and parse errors
- performance baseline for ICU parsing

Exit criteria:

- supported ICU subset is clearly documented
- representative message corpus passes

### 7. ICU Compiler and Catalog Compiler Port

Goal:

- complete the performance-critical runtime and Lingui-relevant core

Tasks:

- port message compilation model
- port gettext plural runtime handling
- port catalog compile functionality
- validate output semantics against current snapshots and runtime tests
- benchmark compile speed and runtime speed

Deliverables:

- Rust ICU compiler
- Rust catalog compiler
- benchmark suite for compile and runtime formatting

Exit criteria:

- v1 core scope is complete inside `crates/pofile`

### 8. Rust Crate Productization

Goal:

- make `pofile` viable as a real public crate before any JS migration

Tasks:

- write crate docs and examples
- add semver and release metadata
- prepare crates.io publishing flow
- define stability guarantees for the public Rust API

Deliverables:

- documented, publishable `pofile` crate
- release checklist for Rust publication

Exit criteria:

- crate could be published independently even if JS bindings did not yet exist

### 9. Node Binding Prototype

Goal:

- validate the Rust-to-Node boundary before full JS migration

Tasks:

- create `pofile-node` with `napi-rs`
- expose minimal proof-of-concept APIs:
  - `parsePo`
  - `stringifyPo`
  - `parseIcu`
  - `compileCatalog` or equivalent high-value slice
- measure conversion overhead and API ergonomics

Deliverables:

- native Node prototype
- notes on object mapping and error translation

Exit criteria:

- no blocking mismatch between Rust API shape and required JS API shape

### 10. `pofile-ts` Wrapper Migration

Goal:

- replace core TypeScript implementation with a thin native-backed facade

Tasks:

- swap current implementation calls for binding calls
- preserve only intentional wrapper-level conveniences
- regenerate or hand-author TypeScript types for exported JS API
- update JS tests to run against native core

Deliverables:

- thin `pofile-ts` wrapper
- updated JS-facing API docs

Exit criteria:

- `packages/pofile-ts` no longer contains a parallel core implementation

### 11. Native Distribution

Goal:

- make npm installation reliable for end users

Tasks:

- define supported Node/platform matrix
- build prebuilt binary pipeline
- ensure package install path works on target platforms
- add smoke tests for installation and basic runtime execution

Deliverables:

- automated binary builds
- documented support matrix
- release process for npm package with native assets

Exit criteria:

- `npm install pofile-ts` works without local Rust toolchain on supported targets

### 12. Release and Migration Communication

Goal:

- ship the new architecture with explicit expectations rather than hidden breakage

Tasks:

- prepare upgrade guide for the new `pofile-ts` major
- document Rust crate introduction and relationship to npm package
- note removed or redesigned exports
- position `pofile` as the canonical core for the Lingui fork

Deliverables:

- migration guide
- release notes for Rust crate launch and npm major release

Exit criteria:

- consumers can understand what changed and why

## Recommended Execution Order

1. API Audit
2. Workspace Foundation
3. Public Rust Data Model
4. PO Core Port
5. Plural and Message ID Port
6. ICU Parser Port
7. ICU Compiler and Catalog Compiler Port
8. Rust Crate Productization
9. Node Binding Prototype
10. `pofile-ts` Wrapper Migration
11. Native Distribution
12. Release and Migration Communication

## Validation Gates

Do not start the next block until the current one passes its gate:

1. API gate
   Every current export is classified.

2. model gate
   Public Rust types are reviewed before deep implementation continues.

3. PO gate
   PO fixtures and roundtrip tests pass in Rust.

4. ICU gate
   ICU parsing and compile semantics are validated on a representative corpus.

5. product gate
   `pofile` is publishable on its own.

6. binding gate
   Node prototype proves the FFI boundary is practical.

7. release gate
   prebuilt distribution works across the supported platform matrix.

## Suggested First Three Implementation Tickets

1. Create export inventory and classify current API surface.
2. Add Cargo workspace with empty `pofile` and `pofile-node` crates plus CI skeleton.
3. Design and review the first public Rust types for PO files and errors.

## Open Decisions To Resolve Early

- exact Rust module layout for the public crate
- whether any current low-level helpers deserve public Rust exposure
- exact JS error shape exposed by `pofile-ts`
- supported Node versions and platform matrix for prebuilt binaries
- naming and versioning policy between crates.io and npm releases

## Recommendation

Start with the API audit immediately. It is the cheapest step and reduces most downstream risk: it will force an explicit decision on what the Rust crate actually is, what the JS wrapper should still own, and which legacy exports should be intentionally retired.
