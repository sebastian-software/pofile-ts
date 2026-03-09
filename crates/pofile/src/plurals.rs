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

/// Return plural categories for a locale in canonical CLDR-like order.
#[must_use]
pub fn get_plural_categories(locale: &str) -> &'static [&'static str] {
    match normalized_language(locale).as_str() {
        "ar" => &["zero", "one", "two", "few", "many", "other"],
        "pl" | "ru" => &["one", "few", "many", "other"],
        "pt-br" => &["one", "many", "other"],
        "zh" | "ja" => &["other"],
        _ => &["one", "other"],
    }
}

/// Return the number of plural forms for a locale.
#[must_use]
pub fn get_plural_count(locale: &str) -> usize {
    get_plural_categories(locale).len()
}

/// Return the plural category index for a locale and numeric value.
#[must_use]
pub fn get_plural_index(locale: &str, value: f64) -> usize {
    match normalized_language(locale).as_str() {
        "ar" => arabic_index(value),
        "pl" => polish_index(value),
        "ru" => russian_index(value),
        "pt-br" => portuguese_brazil_index(value),
        "zh" | "ja" => 0,
        _ => default_index(value),
    }
}

/// Build a gettext `Plural-Forms` header from locale plural count.
#[must_use]
pub fn get_plural_forms_header(locale: &str) -> String {
    let count = get_plural_count(locale);
    let plural = if count == 1 { "0" } else { "(n != 1)" };
    format!("nplurals={count}; plural={plural};")
}

fn normalized_language(locale: &str) -> String {
    locale.trim().replace('_', "-").to_lowercase()
}

fn default_index(value: f64) -> usize {
    if value == 1.0 {
        0
    } else {
        1
    }
}

fn portuguese_brazil_index(value: f64) -> usize {
    if value == 1.0 {
        0
    } else if value.fract() == 0.0 && value.abs() >= 1_000_000.0 {
        1
    } else {
        2
    }
}

fn polish_index(value: f64) -> usize {
    if value.fract() != 0.0 {
        return 3;
    }

    let integer = value as i64;
    let mod10 = integer.rem_euclid(10);
    let mod100 = integer.rem_euclid(100);

    if integer == 1 {
        0
    } else if (2..=4).contains(&mod10) && !(12..=14).contains(&mod100) {
        1
    } else if mod10 == 0 || mod10 == 1 || (5..=9).contains(&mod10) || (12..=14).contains(&mod100) {
        2
    } else {
        3
    }
}

fn russian_index(value: f64) -> usize {
    if value.fract() != 0.0 {
        return 3;
    }

    let integer = value as i64;
    let mod10 = integer.rem_euclid(10);
    let mod100 = integer.rem_euclid(100);

    if mod10 == 1 && mod100 != 11 {
        0
    } else if (2..=4).contains(&mod10) && !(12..=14).contains(&mod100) {
        1
    } else if mod10 == 0 || (5..=9).contains(&mod10) || (11..=14).contains(&mod100) {
        2
    } else {
        3
    }
}

fn arabic_index(value: f64) -> usize {
    if value.fract() != 0.0 {
        return 5;
    }

    let integer = value as i64;
    let mod100 = integer.rem_euclid(100);

    if integer == 0 {
        0
    } else if integer == 1 {
        1
    } else if integer == 2 {
        2
    } else if (3..=10).contains(&mod100) {
        3
    } else if (11..=99).contains(&mod100) {
        4
    } else {
        5
    }
}

#[cfg(test)]
mod tests {
    use super::{
        get_plural_categories, get_plural_count, get_plural_forms_header, get_plural_index,
        parse_plural_forms, ParsedPluralForms,
    };

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

    #[test]
    fn plural_categories_cover_supported_locales() {
        assert_eq!(get_plural_categories("de"), &["one", "other"]);
        assert_eq!(
            get_plural_categories("pl"),
            &["one", "few", "many", "other"]
        );
        assert_eq!(
            get_plural_categories("ar"),
            &["zero", "one", "two", "few", "many", "other"]
        );
        assert_eq!(get_plural_categories("zh"), &["other"]);
        assert_eq!(get_plural_categories("xx"), &["one", "other"]);
    }

    #[test]
    fn plural_count_matches_category_length() {
        assert_eq!(get_plural_count("de"), 2);
        assert_eq!(get_plural_count("pl"), 4);
        assert_eq!(get_plural_count("ar"), 6);
        assert_eq!(get_plural_count("zh"), 1);
        assert_eq!(get_plural_count("pt_BR"), 3);
    }

    #[test]
    fn plural_indices_match_expected_rules() {
        assert_eq!(get_plural_index("de", 1.0), 0);
        assert_eq!(get_plural_index("de", 5.0), 1);

        assert_eq!(get_plural_index("pl", 1.0), 0);
        assert_eq!(get_plural_index("pl", 2.0), 1);
        assert_eq!(get_plural_index("pl", 5.0), 2);

        assert_eq!(get_plural_index("ar", 0.0), 0);
        assert_eq!(get_plural_index("ar", 1.0), 1);
        assert_eq!(get_plural_index("ar", 2.0), 2);
        assert_eq!(get_plural_index("ar", 3.0), 3);
        assert_eq!(get_plural_index("ar", 11.0), 4);
        assert_eq!(get_plural_index("ar", 100.0), 5);

        assert_eq!(get_plural_index("ru", 1.0), 0);
        assert_eq!(get_plural_index("ru", 2.0), 1);
        assert_eq!(get_plural_index("ru", 5.0), 2);
        assert_eq!(get_plural_index("ru", 1.5), 3);
    }

    #[test]
    fn plural_forms_header_uses_plural_count() {
        assert_eq!(
            get_plural_forms_header("de"),
            "nplurals=2; plural=(n != 1);"
        );
        assert_eq!(
            get_plural_forms_header("ar"),
            "nplurals=6; plural=(n != 1);"
        );
        assert_eq!(get_plural_forms_header("zh"), "nplurals=1; plural=0;");
        assert_eq!(
            get_plural_forms_header("pt-BR"),
            "nplurals=3; plural=(n != 1);"
        );
    }
}
