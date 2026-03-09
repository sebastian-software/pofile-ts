//! Public Rust core for `pofile-ts`.
//!
//! This crate will become the canonical implementation of the library's PO,
//! ICU, and catalog functionality. The initial implementation focuses on the
//! PO model and parser/serializer foundation.

#![deny(missing_docs)]

pub mod plurals;
pub mod po;

pub use plurals::{parse_plural_forms, ParsedPluralForms};
pub use po::{parse_po, stringify_po, Headers, PoFile, PoItem, SerializeOptions};
