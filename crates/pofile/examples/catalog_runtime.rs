use pofile::{
    compile_catalog, generate_message_id, Catalog, CatalogEntry, CatalogTranslation,
    CompileCatalogOptions, MessageValue, MessageValues,
};

fn main() {
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

    println!("{}", compiled.format(&key, &values));
}
