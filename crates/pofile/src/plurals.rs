//! Plural-forms parsing utilities.

/// Parsed representation of a gettext `Plural-Forms` header.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedPluralForms {
    /// Declared number of plural forms.
    pub nplurals: Option<String>,
    /// Declared plural selection expression.
    pub plural: Option<String>,
}

/// Parse a gettext `Plural-Forms` header value.
///
/// The parser is intentionally tolerant and mirrors the current JavaScript
/// implementation: unknown parts are ignored and missing keys remain `None`.
#[must_use]
pub fn parse_plural_forms(input: Option<&str>) -> ParsedPluralForms {
    let mut nplurals = None;
    let mut plural = None;

    for part in input.unwrap_or_default().split(';') {
        let trimmed = part.trim();
        if let Some((key, value)) = trimmed.split_once('=') {
            let key = key.trim();
            let value = value.trim().to_owned();
            match key {
                "nplurals" => nplurals = Some(value),
                "plural" => plural = Some(value),
                _ => {}
            }
        }
    }

    ParsedPluralForms { nplurals, plural }
}

#[cfg(test)]
mod tests {
    use super::{parse_plural_forms, ParsedPluralForms};

    #[test]
    fn parse_plural_forms_returns_empty_values_when_missing() {
        assert_eq!(
            parse_plural_forms(None),
            ParsedPluralForms {
                nplurals: None,
                plural: None,
            }
        );
        assert_eq!(
            parse_plural_forms(Some("")),
            ParsedPluralForms {
                nplurals: None,
                plural: None,
            }
        );
    }

    #[test]
    fn parse_plural_forms_handles_spaces() {
        assert_eq!(
            parse_plural_forms(Some("nplurals = 3; plural = (n != 1);")),
            ParsedPluralForms {
                nplurals: Some(String::from("3")),
                plural: Some(String::from("(n != 1)")),
            }
        );
    }
}
