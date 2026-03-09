//! Public Rust core for `pofile-ts`.
//!
//! This crate will become the canonical implementation of the library's PO,
//! ICU, and catalog functionality. The initial implementation focuses on the
//! PO model and parser/serializer foundation.

#![deny(missing_docs)]

pub mod catalog;
pub mod plurals;
pub mod po;
pub mod references;

pub use catalog::{
    catalog_to_items, items_to_catalog, merge_catalogs, Catalog, CatalogEntry,
    CatalogToItemsOptions, CatalogTranslation, ItemsToCatalogOptions,
};
pub use plurals::{parse_plural_forms, ParsedPluralForms};
pub use po::{parse_po, stringify_po, Headers, PoFile, PoItem, SerializeOptions};
pub use references::{
    create_reference, format_reference, format_references, normalize_file_path, parse_reference,
    parse_references, FormatReferenceOptions, ReferenceError, SourceReference,
};
