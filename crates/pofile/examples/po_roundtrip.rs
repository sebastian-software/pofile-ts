use pofile::{parse_po, stringify_po, SerializeOptions};

fn main() {
    let input = r#"
msgid ""
msgstr ""
"Language: de\n"

msgid "Hello"
msgstr "Hallo"
"#;

    let po = parse_po(input);
    println!("items: {}", po.items.len());
    println!("{}", stringify_po(&po, SerializeOptions::default()));
}
