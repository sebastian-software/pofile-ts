use std::path::PathBuf;

use pofile::{
    parse_plural_forms, parse_po, stringify_po, ParsedPluralForms, PoFile, SerializeOptions,
};

fn fixture(name: &str) -> String {
    std::fs::read_to_string(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../packages/pofile-ts/src/fixtures")
            .join(name),
    )
    .expect("fixture should exist")
    .replace("\r\n", "\n")
}

#[test]
fn po_file_new_initializes_default_headers() {
    let po = PoFile::new();

    assert_eq!(
        po.headers.get("Project-Id-Version").map(String::as_str),
        Some("")
    );
    assert_eq!(po.headers.get("Language").map(String::as_str), Some(""));
    assert!(po.items.is_empty());
    assert!(po.header_order.is_empty());
}

#[test]
fn parse_plural_forms_matches_current_behavior() {
    assert_eq!(
        parse_plural_forms(Some("nplurals=INTEGER; plural=EXPRESSION;")),
        ParsedPluralForms {
            nplurals: Some(String::from("INTEGER")),
            plural: Some(String::from("EXPRESSION")),
        }
    );
}

#[test]
fn parse_po_reads_headers_and_comments_from_fixture() {
    let po = parse_po(&fixture("big.po"));

    assert_eq!(
        po.headers.get("Project-Id-Version").map(String::as_str),
        Some("Link (6.x-2.9)")
    );
    assert_eq!(
        po.headers.get("MIME-Version").map(String::as_str),
        Some("1.0")
    );
    assert_eq!(po.comments.len(), 3);
  assert_eq!(po.items.len(), 70);
}

#[test]
fn parse_po_handles_multiline_strings_and_plural_counts() {
    let input = concat!(
        "msgid \"\"\n",
        "msgstr \"\"\n",
        "\"Plural-Forms: nplurals=3; plural=(n==1 ? 0 : 2);\\n\"\n",
        "\n",
        "msgid \"\"\n",
        "\"Hello \"\n",
        "\"World\"\n",
        "msgstr \"\"\n",
        "\"Hallo \"\n",
        "\"Welt\"\n"
    );

    let po = parse_po(input);
    let item = po.items.first().expect("item should exist");
    assert_eq!(item.msgid, "Hello World");
    assert_eq!(item.msgstr.first().map(String::as_str), Some("Hallo Welt"));
    assert_eq!(item.nplurals, 3);
}

#[test]
fn parse_po_reads_metadata_and_obsolete_entries() {
    let metadata_po = parse_po(&fixture("metadata.po"));
    assert_eq!(
        metadata_po.items[0]
            .metadata
            .get("origin")
            .map(String::as_str),
        Some("LLM")
    );

    let commented_po = parse_po(&fixture("commented.po"));
    assert!(commented_po.items.iter().any(|item| item.obsolete));
}

#[test]
fn stringify_po_preserves_header_order() {
    let po = parse_po(&fixture("big.po"));
    let output = stringify_po(&po, SerializeOptions::default());

    assert!(output.contains(r#""Project-Id-Version: Link (6.x-2.9)\n""#));
    assert!(output.contains(r#""PO-Revision-Date: 2013-12-17 14:21+0100\n""#));
    assert!(output.contains(r#""Plural-Forms: nplurals=2; plural=(n > 1);\n""#));
}

#[test]
fn po_roundtrip_preserves_core_fixtures() {
    for name in [
        "big.po",
        "comment.po",
        "fuzzy.po",
        "multi-line.po",
        "reference.po",
    ] {
        let input = fixture(name);
        let first = parse_po(&input);
        let serialized = stringify_po(&first, SerializeOptions::default());
        let second = parse_po(&serialized);

        assert_eq!(
            first.items.len(),
            second.items.len(),
            "item count mismatch for {name}"
        );

        for (left, right) in first.items.iter().zip(second.items.iter()) {
            assert_eq!(left.msgid, right.msgid, "msgid mismatch for {name}");
            assert_eq!(left.msgstr, right.msgstr, "msgstr mismatch for {name}");
            assert_eq!(left.msgctxt, right.msgctxt, "msgctxt mismatch for {name}");
            assert_eq!(
                left.msgid_plural, right.msgid_plural,
                "msgid_plural mismatch for {name}"
            );
            assert_eq!(
                left.obsolete, right.obsolete,
                "obsolete mismatch for {name}"
            );
            assert_eq!(left.flags, right.flags, "flags mismatch for {name}");
        }
    }
}

#[test]
fn stringify_po_supports_traditional_multiline_format() {
    let input = fixture("c-strings.po");
    let po = parse_po(&input);
    let output = stringify_po(
        &po,
        SerializeOptions {
            compact_multiline: false,
            fold_length: 0,
        },
    );

    assert_eq!(output, input);
}
