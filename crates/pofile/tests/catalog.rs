use std::collections::BTreeMap;

use pofile::{
    catalog_to_items, create_reference, items_to_catalog, merge_catalogs, Catalog, CatalogEntry,
    CatalogToItemsOptions, CatalogTranslation, ItemsToCatalogOptions, PoItem,
};

fn item(msgid: &str, msgstr: &[&str]) -> PoItem {
    let mut item = PoItem::new(2);
    item.msgid = msgid.to_owned();
    item.msgstr = msgstr.iter().map(|value| (*value).to_owned()).collect();
    item
}

#[test]
fn catalog_to_items_converts_simple_entries() {
    let mut catalog = Catalog::new();
    catalog.insert(
        String::from("Hello"),
        CatalogEntry {
            translation: Some(CatalogTranslation::Singular(String::from("Hallo"))),
            ..CatalogEntry::default()
        },
    );

    let items = catalog_to_items(&catalog, CatalogToItemsOptions::default());
    assert_eq!(items.len(), 1);
    assert_eq!(items[0].msgid, "Hello");
    assert_eq!(items[0].msgstr, vec![String::from("Hallo")]);
}

#[test]
fn catalog_to_items_formats_origins() {
    let mut catalog = Catalog::new();
    catalog.insert(
        String::from("Hello"),
        CatalogEntry {
            translation: Some(CatalogTranslation::Singular(String::from("Hallo"))),
            origins: Some(vec![
                create_reference("src/App.tsx", Some(42)).expect("reference should be valid"),
                create_reference("src/utils.ts", Some(10)).expect("reference should be valid"),
            ]),
            ..CatalogEntry::default()
        },
    );

    let items = catalog_to_items(&catalog, CatalogToItemsOptions::default());
    assert_eq!(
        items[0].references,
        vec![
            String::from("src/App.tsx:42"),
            String::from("src/utils.ts:10")
        ]
    );
}

#[test]
fn items_to_catalog_converts_references_and_plurals() {
    let mut item = PoItem::new(2);
    item.msgid = String::from("{count} item");
    item.msgid_plural = Some(String::from("{count} items"));
    item.msgstr = vec![
        String::from("{count} Element"),
        String::from("{count} Elemente"),
    ];
    item.references = vec![String::from("src/App.tsx:42")];

    let catalog = items_to_catalog(&[item], ItemsToCatalogOptions::default())
        .expect("catalog conversion should succeed");
    let entry = catalog.get("{count} item").expect("entry should exist");
    assert_eq!(
        entry.translation,
        Some(CatalogTranslation::Plural(vec![
            String::from("{count} Element"),
            String::from("{count} Elemente"),
        ]))
    );
    assert_eq!(entry.plural_source.as_deref(), Some("{count} items"));
    assert_eq!(entry.origins.as_ref().map(Vec::len), Some(1));
}

#[test]
fn items_to_catalog_supports_custom_keys() {
    let mut item = item("Hello World", &["Hallo Welt"]);

    let catalog = items_to_catalog(
        &[item.clone()],
        ItemsToCatalogOptions {
            use_msgid_as_key: false,
            include_origins: true,
            key_generator: Some(&|po_item| format!("key_{}", po_item.msgid.replace(' ', "_"))),
        },
    )
    .expect("catalog conversion should succeed");

    let entry = catalog.get("key_Hello_World").expect("entry should exist");
    assert_eq!(entry.message.as_deref(), Some("Hello World"));

    item.msgid.clear();
}

#[test]
fn merge_catalogs_preserves_existing_fields_and_merges_flags() {
    let mut base = Catalog::new();
    base.insert(
        String::from("Hello"),
        CatalogEntry {
            translation: Some(CatalogTranslation::Singular(String::from("Hallo"))),
            comments: Some(vec![String::from("Original comment")]),
            flags: Some(BTreeMap::from([(String::from("fuzzy"), true)])),
            ..CatalogEntry::default()
        },
    );

    let mut updates = Catalog::new();
    updates.insert(
        String::from("Hello"),
        CatalogEntry {
            translation: Some(CatalogTranslation::Singular(String::from("Hallo!"))),
            flags: Some(BTreeMap::from([(String::from("reviewed"), true)])),
            ..CatalogEntry::default()
        },
    );

    let merged = merge_catalogs(&base, &updates);
    let entry = merged.get("Hello").expect("entry should exist");
    assert_eq!(
        entry.translation,
        Some(CatalogTranslation::Singular(String::from("Hallo!")))
    );
    assert_eq!(
        entry.comments.as_ref(),
        Some(&vec![String::from("Original comment")])
    );
    assert_eq!(
        entry.flags.as_ref(),
        Some(&BTreeMap::from([
            (String::from("fuzzy"), true),
            (String::from("reviewed"), true),
        ]))
    );
}
