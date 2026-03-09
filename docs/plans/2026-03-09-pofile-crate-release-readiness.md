# pofile crate release readiness

## Goal

Prepare the Rust crate `pofile` for an initial public `0.1.x` release so it
can be tested in real Rust integrations, including the planned Lingui fork.

## Scope for the first public crate release

- PO parse/stringify
- ICU parse/analysis
- ICU runtime compile
- Catalog compile
- Message ID generation
- Plural helpers
- Host formatting interface

## Readiness checklist

- `Cargo.toml` has publish-facing metadata:
  - description
  - homepage
  - documentation
  - keywords
  - categories
  - crate-specific README
- crate README shows:
  - PO roundtrip
  - ICU compile
  - catalog compile
  - host integration intent
- examples exist under `crates/pofile/examples` for quick smoke testing
- `cargo test --workspace` is green
- `cargo clippy --workspace --all-targets -- -D warnings` is green
- `cargo package -p pofile` is green

## Recommended release sequence

1. Publish `pofile` as `0.1.0`
2. Add a minimal changelog/release note pointing out the still-young API
3. Build a small Lingui integration spike against the published crate
4. Collect API feedback before hardening toward `0.2` or `1.0`

## Known caveats for `0.1.x`

- The host formatting interface is intentionally young and may still be refined
- Browser/Wasm bindings are not part of the initial release target
- `pofile-ts` is still migrating toward the Rust core, so JS and Rust surfaces
  are not yet perfectly aligned
