//! PO file data model and parser/serializer.

use std::borrow::Cow;
use std::collections::BTreeMap;

use crate::plurals::parse_plural_forms;

const DEFAULT_HEADER_NAMES: [&str; 10] = [
    "Project-Id-Version",
    "Report-Msgid-Bugs-To",
    "POT-Creation-Date",
    "PO-Revision-Date",
    "Last-Translator",
    "Language",
    "Language-Team",
    "Content-Type",
    "Content-Transfer-Encoding",
    "Plural-Forms",
];

/// Header map used by a parsed or constructed PO file.
pub type Headers = BTreeMap<String, String>;

/// Options controlling PO serialization.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SerializeOptions {
    /// Maximum rendered line length before folding.
    ///
    /// A value of `0` disables folding.
    pub fold_length: usize,
    /// Whether multiline strings use the compact representation.
    pub compact_multiline: bool,
}

impl Default for SerializeOptions {
    fn default() -> Self {
        Self {
            fold_length: 80,
            compact_multiline: true,
        }
    }
}

/// A single PO translation item.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PoItem {
    /// Source string.
    pub msgid: String,
    /// Optional message context.
    pub msgctxt: Option<String>,
    /// Source references as stored in the PO file.
    pub references: Vec<String>,
    /// Optional plural source string.
    pub msgid_plural: Option<String>,
    /// Translated strings.
    pub msgstr: Vec<String>,
    /// Translator comments.
    pub comments: Vec<String>,
    /// Extracted comments.
    pub extracted_comments: Vec<String>,
    /// Flags such as `fuzzy`.
    pub flags: BTreeMap<String, bool>,
    /// Custom metadata stored as `#@ key: value`.
    pub metadata: BTreeMap<String, String>,
    /// Whether the item is obsolete.
    pub obsolete: bool,
    /// Number of plural slots expected for the item.
    pub nplurals: usize,
}

impl PoItem {
    /// Create an empty PO item with a specific plural count.
    #[must_use]
    pub fn new(nplurals: usize) -> Self {
        Self {
            msgid: String::new(),
            msgctxt: None,
            references: Vec::new(),
            msgid_plural: None,
            msgstr: Vec::new(),
            comments: Vec::new(),
            extracted_comments: Vec::new(),
            flags: BTreeMap::new(),
            metadata: BTreeMap::new(),
            obsolete: false,
            nplurals: if nplurals == 0 { 2 } else { nplurals },
        }
    }
}

/// A complete PO file with headers and items.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PoFile {
    /// File-level translator comments.
    pub comments: Vec<String>,
    /// File-level extracted comments.
    pub extracted_comments: Vec<String>,
    /// Header key-value pairs.
    pub headers: Headers,
    /// Original header order as seen in the source file.
    pub header_order: Vec<String>,
    /// Translation items.
    pub items: Vec<PoItem>,
}

impl Default for PoFile {
    fn default() -> Self {
        Self::new()
    }
}

impl PoFile {
    /// Create an empty PO file with the default header keys initialized.
    #[must_use]
    pub fn new() -> Self {
        let mut headers = Headers::new();
        for name in DEFAULT_HEADER_NAMES {
            headers.insert(name.to_owned(), String::new());
        }

        Self {
            comments: Vec::new(),
            extracted_comments: Vec::new(),
            headers,
            header_order: Vec::new(),
            items: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ParseContext {
    Id,
    IdPlural,
    Str,
    Ctxt,
}

#[derive(Debug)]
struct ParserState {
    item: PoItem,
    context: Option<ParseContext>,
    plural: usize,
    obsolete_count: usize,
    no_comment_line_count: usize,
}

impl ParserState {
    fn new(nplurals: usize) -> Self {
        Self {
            item: PoItem::new(nplurals),
            context: None,
            plural: 0,
            obsolete_count: 0,
            no_comment_line_count: 0,
        }
    }

    fn reset(&mut self, nplurals: usize) {
        self.item = PoItem::new(nplurals);
        self.context = None;
        self.plural = 0;
        self.obsolete_count = 0;
        self.no_comment_line_count = 0;
    }
}

/// Parse a PO file into a structured [`PoFile`].
#[must_use]
pub fn parse_po(input: &str) -> PoFile {
    let normalized = normalize_line_endings(input);
    let (header_section, body_lines) = split_header_and_body(normalized.as_ref());

    let mut po = PoFile::new();
    parse_headers(&header_section, &mut po);

    let nplurals = parse_plural_forms(po.headers.get("Plural-Forms").map(String::as_str))
        .nplurals
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(2);

    parse_items(&body_lines, &mut po, nplurals);
    po
}

/// Serialize a [`PoFile`] back into PO file text.
#[must_use]
pub fn stringify_po(po: &PoFile, options: SerializeOptions) -> String {
    let mut lines = Vec::new();

    append_file_comments(&mut lines, po);
    append_headers(&mut lines, po);

    for item in &po.items {
        lines.push(stringify_item(item, options));
        lines.push(String::new());
    }

    lines.join("\n")
}

fn normalize_line_endings(input: &str) -> Cow<'_, str> {
    if input.contains("\r\n") {
        Cow::Owned(input.replace("\r\n", "\n"))
    } else {
        Cow::Borrowed(input)
    }
}

fn split_header_and_body(input: &str) -> (String, Vec<String>) {
    let sections: Vec<&str> = input.split("\n\n").collect();
    let mut header_parts = Vec::new();
    let mut body_start = 0;

    while body_start < sections.len() && !sections[body_start].is_empty() {
        let section = sections[body_start];
        if contains_non_header_msgid(section) {
            header_parts.push(String::from(r#"msgid """#));
            break;
        }

        header_parts.push(section.to_owned());
        body_start += 1;

        if section.contains(r#"msgid """#) {
            break;
        }
    }

    let mut body_lines = Vec::new();
    for section in sections.iter().skip(body_start) {
        for line in section.split('\n') {
            body_lines.push(line.to_owned());
        }
    }

    (header_parts.join("\n"), body_lines)
}

fn contains_non_header_msgid(section: &str) -> bool {
    section.lines().any(|line| {
        let trimmed = line.trim();
        trimmed.starts_with("msgid ") && trimmed != r#"msgid """#
    })
}

fn parse_headers(header_section: &str, po: &mut PoFile) {
    let lines = merge_multiline_headers(header_section.lines());

    for line in lines {
        if let Some(comment) = line.strip_prefix("#.") {
            po.extracted_comments.push(comment.trim().to_owned());
        } else if let Some(comment) = line.strip_prefix('#') {
            po.comments.push(comment.trim().to_owned());
        } else if line.starts_with('"') {
            parse_header_line(&line, po);
        }
    }
}

fn merge_multiline_headers<'a>(lines: impl Iterator<Item = &'a str>) -> Vec<String> {
    let mut result: Vec<String> = Vec::new();
    let mut pending_merge = false;

    for mut line in lines.map(ToOwned::to_owned) {
        if pending_merge {
            if let Some(previous) = result.pop() {
                line = previous[..previous.len() - 1].to_owned() + &line[1..];
            }
            pending_merge = false;
        }

        if line.starts_with('"') && line.ends_with('"') && !line.ends_with(r#"\n""#) {
            pending_merge = true;
        }

        result.push(line);
    }

    result
}

fn parse_header_line(line: &str, po: &mut PoFile) {
    let trimmed = line.trim();
    let Some(cleaned) = trimmed.strip_prefix('"') else {
        return;
    };

    let cleaned = if let Some(prefix) = cleaned.strip_suffix(r#"\n""#) {
        prefix
    } else if let Some(prefix) = cleaned.strip_suffix('"') {
        prefix
    } else {
        cleaned
    };

    if let Some((name, value)) = cleaned.split_once(':') {
        let name = name.trim().to_owned();
        let value = value.trim().to_owned();
        po.headers.insert(name.clone(), value);
        po.header_order.push(name);
    }
}

fn parse_items(lines: &[String], po: &mut PoFile, nplurals: usize) {
    let mut state = ParserState::new(nplurals);

    for raw_line in lines {
        let mut line = raw_line.trim();
        if let Some(stripped) = line.strip_prefix("#~") {
            line = stripped.trim();
            state.obsolete_count += 1;
        }

        parse_line(line, &mut state, po, nplurals);
    }

    finish_item(&mut state, po, nplurals);
}

fn parse_line(line: &str, state: &mut ParserState, po: &mut PoFile, nplurals: usize) {
    if line.is_empty() {
        return;
    }

    match line.as_bytes()[0] {
        b'"' => append_multiline_value(line, state),
        b'#' => parse_comment_line(line, state, po, nplurals),
        b'm' => parse_keyword_line(line, state, po, nplurals),
        _ => {}
    }
}

fn parse_comment_line(line: &str, state: &mut ParserState, po: &mut PoFile, nplurals: usize) {
    let second = line.as_bytes().get(1).copied();
    match second {
        Some(b':') => {
            finish_item(state, po, nplurals);
            state.item.references.push(line[2..].trim().to_owned());
        }
        Some(b',') => {
            finish_item(state, po, nplurals);
            parse_flags(line, &mut state.item);
        }
        Some(b'.') => {
            finish_item(state, po, nplurals);
            state
                .item
                .extracted_comments
                .push(line[2..].trim().to_owned());
        }
        Some(b'@') => {
            finish_item(state, po, nplurals);
            parse_metadata(line, &mut state.item);
        }
        Some(b' ') | None => {
            finish_item(state, po, nplurals);
            state.item.comments.push(line[1..].trim().to_owned());
        }
        _ => {}
    }
}

fn parse_keyword_line(line: &str, state: &mut ParserState, po: &mut PoFile, nplurals: usize) {
    if let Some(rest) = line.strip_prefix("msgid_plural") {
        state.item.msgid_plural = Some(extract_string(rest));
        state.context = Some(ParseContext::IdPlural);
        state.no_comment_line_count += 1;
    } else if let Some(rest) = line.strip_prefix("msgid") {
        finish_item(state, po, nplurals);
        state.item.msgid = extract_string(rest);
        state.context = Some(ParseContext::Id);
        state.no_comment_line_count += 1;
    } else if let Some(rest) = line.strip_prefix("msgstr") {
        state.plural = parse_msgstr_index(line).unwrap_or(0);
        ensure_msgstr_slot(&mut state.item.msgstr, state.plural);
        state.item.msgstr[state.plural] = extract_string(rest);
        state.context = Some(ParseContext::Str);
        state.no_comment_line_count += 1;
    } else if let Some(rest) = line.strip_prefix("msgctxt") {
        finish_item(state, po, nplurals);
        state.item.msgctxt = Some(extract_string(rest));
        state.context = Some(ParseContext::Ctxt);
        state.no_comment_line_count += 1;
    }
}

fn parse_msgstr_index(line: &str) -> Option<usize> {
    let start = line.find('[')? + 1;
    let end = line[start..].find(']')? + start;
    line[start..end].parse::<usize>().ok()
}

fn ensure_msgstr_slot(msgstr: &mut Vec<String>, index: usize) {
    if msgstr.len() <= index {
        msgstr.resize(index + 1, String::new());
    }
}

fn parse_flags(line: &str, item: &mut PoItem) {
    for flag in line[2..].trim().split(',') {
        item.flags.insert(flag.trim().to_owned(), true);
    }
}

fn parse_metadata(line: &str, item: &mut PoItem) {
    let content = line[2..].trim();
    if let Some((key, value)) = content.split_once(':') {
        let key = key.trim();
        if !key.is_empty() {
            item.metadata
                .insert(key.to_owned(), value.trim().to_owned());
        }
    }
}

fn append_multiline_value(line: &str, state: &mut ParserState) {
    state.no_comment_line_count += 1;
    let value = extract_string(line);

    match state.context {
        Some(ParseContext::Str) => {
            ensure_msgstr_slot(&mut state.item.msgstr, state.plural);
            state.item.msgstr[state.plural].push_str(&value);
        }
        Some(ParseContext::Id) => state.item.msgid.push_str(&value),
        Some(ParseContext::IdPlural) => {
            let text = state.item.msgid_plural.get_or_insert_with(String::new);
            text.push_str(&value);
        }
        Some(ParseContext::Ctxt) => {
            let text = state.item.msgctxt.get_or_insert_with(String::new);
            text.push_str(&value);
        }
        None => {}
    }
}

fn finish_item(state: &mut ParserState, po: &mut PoFile, nplurals: usize) {
    if state.item.msgid.is_empty() {
        return;
    }

    if state.obsolete_count >= state.no_comment_line_count {
        state.item.obsolete = true;
    }

    po.items.push(state.item.clone());
    state.reset(nplurals);
}

fn append_file_comments(lines: &mut Vec<String>, po: &PoFile) {
    for comment in &po.comments {
        lines.push(if comment.is_empty() {
            String::from("#")
        } else {
            format!("# {comment}")
        });
    }

    for comment in &po.extracted_comments {
        lines.push(if comment.is_empty() {
            String::from("#.")
        } else {
            format!("#. {comment}")
        });
    }
}

fn append_headers(lines: &mut Vec<String>, po: &PoFile) {
    lines.push(String::from(r#"msgid """#));
    lines.push(String::from(r#"msgstr """#));

    for key in ordered_header_keys(po) {
        let value = po.headers.get(key).map_or("", String::as_str);
        lines.push(format!(r#""{}: {}\n""#, key, value));
    }

    lines.push(String::new());
}

fn ordered_header_keys(po: &PoFile) -> Vec<&str> {
    let mut result = Vec::new();
    let mut seen = BTreeMap::new();

    for key in &po.header_order {
        if po.headers.contains_key(key) {
            result.push(key.as_str());
            seen.insert(key.as_str(), true);
        }
    }

    for key in po.headers.keys() {
        if !seen.contains_key(key.as_str()) {
            result.push(key.as_str());
        }
    }

    result
}

fn stringify_item(item: &PoItem, options: SerializeOptions) -> String {
    let mut lines = Vec::new();
    let obsolete_prefix = if item.obsolete { "#~ " } else { "" };

    for comment in &item.comments {
        lines.push(if comment.is_empty() {
            String::from("#")
        } else {
            format!("# {comment}")
        });
    }

    for comment in &item.extracted_comments {
        lines.push(if comment.is_empty() {
            String::from("#.")
        } else {
            format!("#. {comment}")
        });
    }

    for (key, value) in &item.metadata {
        lines.push(format!("#@ {key}: {value}"));
    }

    for reference in &item.references {
        lines.push(format!("#: {reference}"));
    }

    let flags: Vec<&str> = item
        .flags
        .iter()
        .filter_map(|(flag, enabled)| enabled.then_some(flag.as_str()))
        .collect();
    if !flags.is_empty() {
        lines.push(format!("#, {}", flags.join(",")));
    }

    if let Some(context) = &item.msgctxt {
        append_keyword(
            &mut lines,
            "msgctxt",
            context,
            None,
            obsolete_prefix,
            options,
        );
    }

    append_keyword(
        &mut lines,
        "msgid",
        &item.msgid,
        None,
        obsolete_prefix,
        options,
    );

    if let Some(msgid_plural) = &item.msgid_plural {
        append_keyword(
            &mut lines,
            "msgid_plural",
            msgid_plural,
            None,
            obsolete_prefix,
            options,
        );
    }

    append_msgstr(&mut lines, item, obsolete_prefix, options);
    lines.join("\n")
}

fn append_keyword(
    lines: &mut Vec<String>,
    keyword: &str,
    text: &str,
    index: Option<usize>,
    prefix: &str,
    options: SerializeOptions,
) {
    let formatted = format_keyword(keyword, text, index, options);
    lines.push(format!(
        "{prefix}{}",
        formatted.join(&format!("\n{prefix}"))
    ));
}

fn append_msgstr(lines: &mut Vec<String>, item: &PoItem, prefix: &str, options: SerializeOptions) {
    let has_plural = item.msgid_plural.is_some();

    if item.msgstr.len() > 1 {
        for (index, text) in item.msgstr.iter().enumerate() {
            append_keyword(lines, "msgstr", text, Some(index), prefix, options);
        }
    } else if has_plural && item.msgstr.first().map_or(true, String::is_empty) {
        for index in 0..item.nplurals {
            lines.push(format!(r#"{prefix}msgstr[{index}] """#));
        }
    } else {
        let index = has_plural.then_some(0);
        let text = if item.msgstr.len() == 1 {
            item.msgstr.first().cloned().unwrap_or_default()
        } else {
            item.msgstr.join("")
        };
        append_keyword(lines, "msgstr", &text, index, prefix, options);
    }
}

fn format_keyword(
    keyword: &str,
    text: &str,
    index: Option<usize>,
    options: SerializeOptions,
) -> Vec<String> {
    let keyword_prefix = match index {
        Some(index) => format!("{keyword}[{index}] "),
        None => format!("{keyword} "),
    };

    if !text.contains('\n') {
        let escaped = escape_string(text);
        let full_line = format!(r#"{keyword_prefix}"{escaped}""#);
        if options.fold_length == 0 || full_line.chars().count() <= options.fold_length {
            return vec![full_line];
        }
    }

    let parts: Vec<&str> = text.split('\n').collect();
    let has_multiple_lines = parts.len() > 1;
    let first_part_is_empty = parts.first().is_some_and(|part| part.is_empty());

    let escaped_parts: Vec<String> = parts
        .iter()
        .enumerate()
        .map(|(index, part)| {
            let escaped = escape_string(part);
            if index + 1 < parts.len() {
                format!(r#"{escaped}\n"#)
            } else {
                escaped
            }
        })
        .collect();

    let segments = apply_folding(
        &escaped_parts,
        options.fold_length,
        keyword_prefix.chars().count(),
        has_multiple_lines,
    );

    if segments.len() == 1 && !has_multiple_lines {
        return vec![format!(r#"{keyword_prefix}"{}""#, segments[0])];
    }

    let use_compact = options.compact_multiline && !first_part_is_empty;
    build_output_lines(&segments, &keyword_prefix, use_compact)
}

fn apply_folding(
    escaped_parts: &[String],
    fold_length: usize,
    keyword_prefix_length: usize,
    has_multiple_lines: bool,
) -> Vec<String> {
    if fold_length == 0 {
        return escaped_parts.to_owned();
    }

    let first_line_max = fold_length.saturating_sub(keyword_prefix_length + 2);
    let other_line_max = fold_length.saturating_sub(2);
    let mut segments = Vec::new();

    for (index, part) in escaped_parts.iter().enumerate() {
        let max_len = if index == 0 && !has_multiple_lines {
            first_line_max
        } else {
            other_line_max
        };

        if max_len == 0 {
            segments.push(part.clone());
            continue;
        }

        segments.extend(fold_line(part, max_len));
    }

    segments
}

fn fold_line(text: &str, max_length: usize) -> Vec<String> {
    if text.chars().count() <= max_length {
        return vec![text.to_owned()];
    }

    let mut lines = Vec::new();
    let mut remaining = text;

    while remaining.chars().count() > max_length {
        let mut break_byte = nth_char_boundary(remaining, max_length);
        let prefix = &remaining[..break_byte];

        if let Some(space_index) = prefix.rfind(' ') {
            break_byte = space_index + 1;
        } else if prefix.ends_with('\\') && break_byte > 1 {
            break_byte -= 1;
            while break_byte > 0 && !remaining.is_char_boundary(break_byte) {
                break_byte -= 1;
            }
        }

        lines.push(remaining[..break_byte].to_owned());
        remaining = &remaining[break_byte..];
    }

    lines.push(remaining.to_owned());
    lines
}

fn nth_char_boundary(text: &str, max_length: usize) -> usize {
    text.char_indices()
        .nth(max_length)
        .map_or(text.len(), |(index, _)| index)
}

fn build_output_lines(segments: &[String], keyword_prefix: &str, compact: bool) -> Vec<String> {
    let mut lines = Vec::new();

    if compact {
        lines.push(format!(r#"{keyword_prefix}"{}""#, segments[0]));
        for segment in segments.iter().skip(1) {
            lines.push(format!(r#""{segment}""#));
        }
    } else {
        lines.push(format!(r#"{keyword_prefix}"""#));
        for segment in segments {
            lines.push(format!(r#""{segment}""#));
        }
    }

    lines
}

fn escape_string(input: &str) -> String {
    let mut escaped = String::with_capacity(input.len());
    for character in input.chars() {
        match character {
            '\u{7}' => escaped.push_str(r#"\a"#),
            '\u{8}' => escaped.push_str(r#"\b"#),
            '\t' => escaped.push_str(r#"\t"#),
            '\u{b}' => escaped.push_str(r#"\v"#),
            '\u{c}' => escaped.push_str(r#"\f"#),
            '\r' => escaped.push_str(r#"\r"#),
            '"' => escaped.push_str(r#"\""#),
            '\\' => escaped.push_str(r#"\\"#),
            _ => escaped.push(character),
        }
    }
    escaped
}

fn extract_string(line: &str) -> String {
    let Some(first_quote) = line.find('"') else {
        return String::new();
    };
    let Some(last_quote) = line.rfind('"') else {
        return String::new();
    };
    if last_quote <= first_quote {
        return String::new();
    }

    unescape_string(&line[first_quote + 1..last_quote])
}

fn unescape_string(input: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();

    while let Some(character) = chars.next() {
        if character != '\\' {
            result.push(character);
            continue;
        }

        match chars.next() {
            Some('a') => result.push('\u{7}'),
            Some('b') => result.push('\u{8}'),
            Some('t') => result.push('\t'),
            Some('n') => result.push('\n'),
            Some('v') => result.push('\u{b}'),
            Some('f') => result.push('\u{c}'),
            Some('r') => result.push('\r'),
            Some('\'') => result.push('\''),
            Some('"') => result.push('"'),
            Some('\\') => result.push('\\'),
            Some('?') => result.push('?'),
            Some('x') => {
                let mut hex = String::new();
                if let Some(next) = chars.next() {
                    hex.push(next);
                }
                if let Some(next) = chars.next() {
                    hex.push(next);
                }
                if let Ok(value) = u32::from_str_radix(&hex, 16) {
                    if let Some(character) = char::from_u32(value) {
                        result.push(character);
                    }
                }
            }
            Some(digit @ '0'..='7') => {
                let mut octal = String::from(digit);
                for _ in 0..2 {
                    if let Some(next @ '0'..='7') = chars.peek().copied() {
                        octal.push(next);
                        chars.next();
                    } else {
                        break;
                    }
                }
                if let Ok(value) = u32::from_str_radix(&octal, 8) {
                    if let Some(character) = char::from_u32(value) {
                        result.push(character);
                    }
                }
            }
            Some(other) => result.push(other),
            None => break,
        }
    }

    result
}
