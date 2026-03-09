//! PO file reference parsing and formatting.

use std::error::Error;
use std::fmt::{Display, Formatter};

/// A parsed source reference.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceReference {
    /// File path, normalized to forward slashes.
    pub file: String,
    /// Optional line number.
    pub line: Option<usize>,
}

/// Formatting options for source references.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FormatReferenceOptions {
    /// Whether line numbers should be included in the formatted output.
    pub include_line_numbers: bool,
}

impl Default for FormatReferenceOptions {
    fn default() -> Self {
        Self {
            include_line_numbers: true,
        }
    }
}

/// Errors returned when parsing or constructing references.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ReferenceError {
    /// The input reference was empty.
    EmptyReference,
    /// The reference format was invalid.
    InvalidReference(String),
    /// The caller tried to construct a reference from an absolute path.
    AbsolutePath(String),
    /// The caller provided a non-positive line number.
    InvalidLineNumber(usize),
}

impl Display for ReferenceError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::EmptyReference => formatter.write_str("reference cannot be empty"),
            Self::InvalidReference(reference) => {
                write!(formatter, "invalid reference format: \"{reference}\"")
            }
            Self::AbsolutePath(path) => {
                write!(
                    formatter,
                    "reference paths must be relative, got absolute path: \"{path}\""
                )
            }
            Self::InvalidLineNumber(line) => {
                write!(
                    formatter,
                    "line number must be a positive integer, got: {line}"
                )
            }
        }
    }
}

impl Error for ReferenceError {}

/// Normalize a source file path to forward slashes.
#[must_use]
pub fn normalize_file_path(path: &str) -> String {
    path.replace('\\', "/")
}

/// Parse a single PO source reference.
pub fn parse_reference(reference: &str) -> Result<SourceReference, ReferenceError> {
    let trimmed = reference.trim();
    if trimmed.is_empty() {
        return Err(ReferenceError::EmptyReference);
    }

    let last_colon = trimmed.rfind(':');
    if let Some(last_colon) = last_colon {
        if last_colon > 0 {
            let after_colon = &trimmed[last_colon + 1..];
            if let Ok(line) = after_colon.parse::<usize>() {
                if line > 0 && line.to_string() == after_colon {
                    let file = &trimmed[..last_colon];
                    if file.is_empty() {
                        return Err(ReferenceError::InvalidReference(reference.to_owned()));
                    }

                    return Ok(SourceReference {
                        file: normalize_file_path(file),
                        line: Some(line),
                    });
                }
            }
        }
    }

    Ok(SourceReference {
        file: normalize_file_path(trimmed),
        line: None,
    })
}

/// Format a single source reference.
#[must_use]
pub fn format_reference(reference: &SourceReference, options: FormatReferenceOptions) -> String {
    let file = normalize_file_path(&reference.file);
    match (options.include_line_numbers, reference.line) {
        (true, Some(line)) if line > 0 => format!("{file}:{line}"),
        _ => file,
    }
}

/// Parse multiple whitespace-separated references.
pub fn parse_references(references: &str) -> Result<Vec<SourceReference>, ReferenceError> {
    if references.trim().is_empty() {
        return Ok(Vec::new());
    }

    references.split_whitespace().map(parse_reference).collect()
}

/// Format multiple references as a single whitespace-separated string.
#[must_use]
pub fn format_references(
    references: &[SourceReference],
    options: FormatReferenceOptions,
) -> String {
    references
        .iter()
        .map(|reference| format_reference(reference, options))
        .collect::<Vec<_>>()
        .join(" ")
}

/// Create a normalized, validated source reference.
pub fn create_reference(
    file: &str,
    line: Option<usize>,
) -> Result<SourceReference, ReferenceError> {
    let normalized = normalize_file_path(file);
    if is_absolute_path(&normalized) {
        return Err(ReferenceError::AbsolutePath(file.to_owned()));
    }

    if let Some(line) = line {
        if line == 0 {
            return Err(ReferenceError::InvalidLineNumber(line));
        }
    }

    Ok(SourceReference {
        file: normalized,
        line,
    })
}

fn is_absolute_path(path: &str) -> bool {
    path.starts_with('/') || is_windows_absolute_path(path)
}

fn is_windows_absolute_path(path: &str) -> bool {
    let bytes = path.as_bytes();
    bytes.len() >= 3
        && bytes[0].is_ascii_alphabetic()
        && bytes[1] == b':'
        && matches!(bytes[2], b'/' | b'\\')
}
