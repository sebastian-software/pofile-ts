# pofile

`pofile` is the Rust core behind `pofile-ts`.

It provides:

- PO parsing and serialization
- ICU MessageFormat parsing and compilation
- Catalog compilation for runtime lookup
- Message ID generation and plural helpers
- A host interface for locale-aware formatting and tag rendering

The crate is intended to be usable directly from Rust and to serve as the
shared core for thin host bindings such as Node.js.

## Installation

```bash
cargo add pofile
```

## Parse and stringify PO files

```rust
use pofile::{parse_po, stringify_po, SerializeOptions};

let po = parse_po(
    r#"
msgid ""
msgstr ""
"Language: de\n"

msgid "Hello"
msgstr "Hallo"
"#,
);

assert_eq!(po.items[0].msgid, "Hello");
assert_eq!(po.items[0].msgstr, vec!["Hallo"]);

let rendered = stringify_po(&po, SerializeOptions::default());
assert!(rendered.contains(r#"msgid "Hello""#));
```

## Compile ICU messages

```rust
use pofile::{compile_icu, CompileIcuOptions, MessageValue, MessageValues};

let compiled = compile_icu(
    "{count, plural, one {# file} other {# files}}",
    &CompileIcuOptions::new("en"),
)
.expect("message should compile");

let values = MessageValues::from([("count".to_owned(), MessageValue::from(2usize))]);
assert_eq!(compiled.format(&values), "2 files");
```

## Compile catalogs

```rust
use pofile::{
    compile_catalog, generate_message_id, Catalog, CatalogEntry, CatalogTranslation,
    CompileCatalogOptions, MessageValue, MessageValues,
};

let catalog = Catalog::from([(
    "Hello {name}!".to_owned(),
    CatalogEntry {
        translation: Some(CatalogTranslation::Singular("Hallo {name}!".to_owned())),
        ..CatalogEntry::default()
    },
)]);

let compiled = compile_catalog(&catalog, &CompileCatalogOptions::new("de"))
    .expect("catalog should compile");
let key = generate_message_id("Hello {name}!", None);
let values = MessageValues::from([("name".to_owned(), MessageValue::from("Sebastian"))]);

assert_eq!(compiled.format(&key, &values), "Hallo Sebastian!");
```

## Host formatting

`pofile` owns parsing, AST traversal, plural selection, and catalog dispatch.
Host-specific formatting can be provided through `FormatHost`.

That lets direct Rust integrations and host bindings share the same execution
model without duplicating ICU/plural logic in each embedding.
