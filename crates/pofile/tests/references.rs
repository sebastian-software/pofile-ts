use pofile::{
    create_reference, format_reference, format_references, normalize_file_path, parse_reference,
    parse_references, FormatReferenceOptions, ReferenceError, SourceReference,
};

#[test]
fn parse_reference_handles_line_numbers_and_normalization() {
    assert_eq!(
        parse_reference(r#"src\components\App.tsx:42"#).expect("reference should parse"),
        SourceReference {
            file: String::from("src/components/App.tsx"),
            line: Some(42),
        }
    );
}

#[test]
fn parse_reference_rejects_empty_input() {
    assert_eq!(
        parse_reference("").expect_err("empty reference should fail"),
        ReferenceError::EmptyReference
    );
}

#[test]
fn parse_references_handles_multiple_values() {
    let references =
        parse_references("src/App.tsx:42 src/utils.ts:10").expect("references should parse");
    assert_eq!(references.len(), 2);
    assert_eq!(references[0].line, Some(42));
    assert_eq!(references[1].line, Some(10));
}

#[test]
fn format_reference_can_omit_line_numbers() {
    let reference = SourceReference {
        file: String::from("src/App.tsx"),
        line: Some(42),
    };

    assert_eq!(
        format_reference(
            &reference,
            FormatReferenceOptions {
                include_line_numbers: false,
            }
        ),
        "src/App.tsx"
    );
}

#[test]
fn format_references_joins_values() {
    let references = vec![
        SourceReference {
            file: String::from("src/App.tsx"),
            line: Some(42),
        },
        SourceReference {
            file: String::from("src/utils.ts"),
            line: Some(10),
        },
    ];

    assert_eq!(
        format_references(&references, FormatReferenceOptions::default()),
        "src/App.tsx:42 src/utils.ts:10"
    );
}

#[test]
fn create_reference_rejects_absolute_paths() {
    assert!(matches!(
        create_reference("/usr/src/App.tsx", Some(42)),
        Err(ReferenceError::AbsolutePath(_))
    ));
}

#[test]
fn normalize_file_path_converts_backslashes() {
    assert_eq!(
        normalize_file_path(r#"src\components\nested\App.tsx"#),
        "src/components/nested/App.tsx"
    );
}
