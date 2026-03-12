//! Public Rust core for `pofile-ts`.
//!
//! This crate will become the canonical implementation of the library's PO,
//! ICU, and catalog functionality. The initial implementation focuses on the
//! PO model and parser/serializer foundation.

#![deny(missing_docs)]

pub mod catalog;
pub mod compile;
pub mod headers;
pub mod icu;
pub mod message_id;
pub mod plurals;
pub mod po;
pub mod references;

pub use catalog::{
    catalog_to_items, items_to_catalog, merge_catalogs, Catalog, CatalogEntry,
    CatalogToItemsOptions, CatalogTranslation, ItemsToCatalogOptions,
};
pub use compile::{
    compile_catalog, compile_icu, serialize_compiled_catalog, CompileCatalogOptions,
    CompileIcuOptions, CompiledCatalog, CompiledMessage, DefaultFormatHost, FormatHost,
    MessageValue, MessageValues, SerializedCompiledCatalog, SerializedCompiledEntry,
    SerializedCompiledMessage, SerializedCompiledMessageKind, TagHandler,
};
pub use headers::{create_default_headers, format_po_date, CreateHeadersOptions, PoDateTime};
pub use icu::{
    compare_variables, extract_variable_info, extract_variables, gettext_to_icu, has_icu_syntax,
    has_plural, has_select, has_select_ordinal, icu_to_gettext_source, is_plural_item,
    normalize_item_to_icu, normalize_to_icu, normalize_to_icu_in_place, parse_icu, validate_icu,
    GettextToIcuOptions, IcuAgoStyle, IcuErrorKind, IcuNode, IcuParseError, IcuParser,
    IcuParserOptions, IcuPluralOption, IcuPluralType, IcuSelectOption, IcuValidationResult,
    IcuVariable, IcuVariableComparison,
};
pub use message_id::{generate_message_id, generate_message_ids, MessageIdInput};
pub use plurals::{
    get_plural_categories, get_plural_count, get_plural_forms_header, get_plural_index,
    parse_plural_forms, ParsedPluralForms,
};
pub use po::{parse_po, stringify_po, Headers, PoFile, PoItem, SerializeOptions};
pub use references::{
    create_reference, format_reference, format_references, normalize_file_path, parse_reference,
    parse_references, FormatReferenceOptions, ReferenceError, SourceReference,
};
