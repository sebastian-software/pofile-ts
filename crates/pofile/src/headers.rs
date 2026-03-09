//! Header utilities for PO files.

use std::collections::BTreeMap;

use crate::plurals::get_plural_forms_header;

/// Simple date-time representation for PO header formatting.
///
/// The type is intentionally explicit so the core crate stays dependency-free.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PoDateTime {
    /// Four-digit year.
    pub year: i32,
    /// Month in the range `1..=12`.
    pub month: u8,
    /// Day in the range `1..=31`.
    pub day: u8,
    /// Hour in the range `0..=23`.
    pub hour: u8,
    /// Minute in the range `0..=59`.
    pub minute: u8,
    /// Offset from UTC in minutes.
    pub offset_minutes: i16,
}

/// Options for constructing default PO headers.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct CreateHeadersOptions {
    /// Target language code.
    pub language: Option<String>,
    /// Generator name stored in `X-Generator`.
    pub generator: Option<String>,
    /// Project name and version.
    pub project_id_version: Option<String>,
    /// Bug report address.
    pub report_bugs_to: Option<String>,
    /// Last translator name/email.
    pub last_translator: Option<String>,
    /// Translation team description.
    pub language_team: Option<String>,
    /// Explicit plural header override.
    ///
    /// `Some(None)` means "omit the header".
    pub plural_forms: Option<Option<String>>,
    /// Custom timestamp used for creation and revision date.
    pub now: Option<PoDateTime>,
    /// Custom headers that should extend or override the defaults.
    pub custom: BTreeMap<String, String>,
}

/// Format a PO header date string as `YYYY-MM-DD HH:MM+ZZZZ`.
#[must_use]
pub fn format_po_date(date: PoDateTime) -> String {
    let sign = if date.offset_minutes >= 0 { '+' } else { '-' };
    let absolute_offset = date.offset_minutes.unsigned_abs();
    let offset_hours = absolute_offset / 60;
    let offset_minutes = absolute_offset % 60;

    format!(
        "{:04}-{:02}-{:02} {:02}:{:02}{}{offset_hours:02}{offset_minutes:02}",
        date.year, date.month, date.day, date.hour, date.minute, sign
    )
}

/// Create a default header map for a PO file.
#[must_use]
pub fn create_default_headers(options: &CreateHeadersOptions) -> BTreeMap<String, String> {
    let now = options.now.map(format_po_date).unwrap_or_default();
    let mut headers = BTreeMap::from([
        (
            String::from("Project-Id-Version"),
            options.project_id_version.clone().unwrap_or_default(),
        ),
        (
            String::from("Report-Msgid-Bugs-To"),
            options.report_bugs_to.clone().unwrap_or_default(),
        ),
        (String::from("POT-Creation-Date"), now.clone()),
        (String::from("PO-Revision-Date"), now),
        (
            String::from("Last-Translator"),
            options.last_translator.clone().unwrap_or_default(),
        ),
        (
            String::from("Language"),
            options.language.clone().unwrap_or_default(),
        ),
        (
            String::from("Language-Team"),
            options.language_team.clone().unwrap_or_default(),
        ),
        (String::from("MIME-Version"), String::from("1.0")),
        (
            String::from("Content-Type"),
            String::from("text/plain; charset=utf-8"),
        ),
        (
            String::from("Content-Transfer-Encoding"),
            String::from("8bit"),
        ),
        (
            String::from("X-Generator"),
            options
                .generator
                .clone()
                .unwrap_or_else(|| String::from("pofile")),
        ),
    ]);

    match &options.plural_forms {
        Some(Some(value)) => {
            headers.insert(String::from("Plural-Forms"), value.clone());
        }
        Some(None) => {}
        None => {
            if let Some(language) = &options.language {
                headers.insert(
                    String::from("Plural-Forms"),
                    get_plural_forms_header(language),
                );
            }
        }
    }

    headers.extend(options.custom.clone());
    headers
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::{create_default_headers, format_po_date, CreateHeadersOptions, PoDateTime};

    #[test]
    fn format_po_date_formats_offset_correctly() {
        assert_eq!(
            format_po_date(PoDateTime {
                year: 2025,
                month: 12,
                day: 11,
                hour: 14,
                minute: 30,
                offset_minutes: 60,
            }),
            "2025-12-11 14:30+0100"
        );
        assert_eq!(
            format_po_date(PoDateTime {
                year: 2025,
                month: 12,
                day: 11,
                hour: 14,
                minute: 30,
                offset_minutes: -300,
            }),
            "2025-12-11 14:30-0500"
        );
    }

    #[test]
    fn create_default_headers_uses_defaults() {
        let headers = create_default_headers(&CreateHeadersOptions::default());
        assert_eq!(headers.get("MIME-Version").map(String::as_str), Some("1.0"));
        assert_eq!(
            headers.get("Content-Type").map(String::as_str),
            Some("text/plain; charset=utf-8")
        );
        assert_eq!(
            headers.get("X-Generator").map(String::as_str),
            Some("pofile")
        );
        assert_eq!(headers.get("Language").map(String::as_str), Some(""));
        assert!(!headers.contains_key("Plural-Forms"));
    }

    #[test]
    fn create_default_headers_autogenerates_plural_forms() {
        let headers = create_default_headers(&CreateHeadersOptions {
            language: Some(String::from("de")),
            ..CreateHeadersOptions::default()
        });

        assert_eq!(
            headers.get("Plural-Forms").map(String::as_str),
            Some("nplurals=2; plural=(n != 1);")
        );
    }

    #[test]
    fn create_default_headers_supports_overrides_and_custom_values() {
        let headers = create_default_headers(&CreateHeadersOptions {
            language: Some(String::from("de")),
            generator: Some(String::from("my-tool")),
            project_id_version: Some(String::from("MyProject 1.0")),
            report_bugs_to: Some(String::from("bugs@example.com")),
            last_translator: Some(String::from("John Doe <john@example.com>")),
            language_team: Some(String::from("German <de@example.com>")),
            plural_forms: Some(Some(String::from("nplurals=9; plural=custom;"))),
            now: Some(PoDateTime {
                year: 2025,
                month: 12,
                day: 11,
                hour: 14,
                minute: 30,
                offset_minutes: 0,
            }),
            custom: BTreeMap::from([(String::from("X-Custom"), String::from("custom-value"))]),
        });

        assert_eq!(
            headers.get("Project-Id-Version").map(String::as_str),
            Some("MyProject 1.0")
        );
        assert_eq!(
            headers.get("Report-Msgid-Bugs-To").map(String::as_str),
            Some("bugs@example.com")
        );
        assert_eq!(
            headers.get("X-Generator").map(String::as_str),
            Some("my-tool")
        );
        assert_eq!(
            headers.get("Plural-Forms").map(String::as_str),
            Some("nplurals=9; plural=custom;")
        );
        assert_eq!(
            headers.get("POT-Creation-Date").map(String::as_str),
            Some("2025-12-11 14:30+0000")
        );
        assert_eq!(
            headers.get("X-Custom").map(String::as_str),
            Some("custom-value")
        );
    }

    #[test]
    fn create_default_headers_can_omit_plural_forms_explicitly() {
        let headers = create_default_headers(&CreateHeadersOptions {
            language: Some(String::from("de")),
            plural_forms: Some(None),
            ..CreateHeadersOptions::default()
        });

        assert!(!headers.contains_key("Plural-Forms"));
    }
}
