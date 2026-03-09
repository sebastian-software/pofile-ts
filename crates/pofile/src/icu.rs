//! ICU MessageFormat parser and analysis helpers.

use std::collections::{BTreeMap, BTreeSet};
use std::error::Error;
use std::fmt::{Display, Formatter};

use crate::plurals::get_plural_categories;
use crate::po::{PoFile, PoItem};

/// Relative-time style string.
pub type IcuAgoStyle = String;

/// Parser options for ICU MessageFormat.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct IcuParserOptions {
    /// Treat tags such as `<b>` as literal text.
    pub ignore_tag: bool,
    /// Require an `other` clause for plural/select constructs.
    pub requires_other_clause: bool,
}

impl Default for IcuParserOptions {
    fn default() -> Self {
        Self {
            ignore_tag: false,
            requires_other_clause: true,
        }
    }
}

/// Parse error kind.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IcuErrorKind {
    /// Syntax error.
    SyntaxError,
}

/// Plural mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IcuPluralType {
    /// Cardinal plural.
    Cardinal,
    /// Ordinal plural.
    Ordinal,
}

/// Option in a plural expression.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IcuPluralOption {
    /// Nested AST nodes.
    pub value: Vec<IcuNode>,
}

/// Option in a select expression.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IcuSelectOption {
    /// Nested AST nodes.
    pub value: Vec<IcuNode>,
}

/// ICU AST node.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IcuNode {
    /// Literal text.
    Literal {
        /// Literal text content.
        value: String,
    },
    /// Simple argument.
    Argument {
        /// Variable name.
        value: String,
    },
    /// Number formatting.
    Number {
        /// Variable name.
        value: String,
        /// Opaque style string.
        style: Option<String>,
    },
    /// Date formatting.
    Date {
        /// Variable name.
        value: String,
        /// Opaque style string.
        style: Option<String>,
    },
    /// Time formatting.
    Time {
        /// Variable name.
        value: String,
        /// Opaque style string.
        style: Option<String>,
    },
    /// List formatting.
    List {
        /// Variable name.
        value: String,
        /// Opaque style string.
        style: Option<String>,
    },
    /// Duration formatting.
    Duration {
        /// Variable name.
        value: String,
        /// Opaque style string.
        style: Option<String>,
    },
    /// Relative-time formatting.
    Ago {
        /// Variable name.
        value: String,
        /// Opaque style string.
        style: Option<String>,
    },
    /// Display-name formatting.
    Name {
        /// Variable name.
        value: String,
        /// Opaque style string.
        style: Option<String>,
    },
    /// Select expression.
    Select {
        /// Variable name.
        value: String,
        /// Selector options.
        options: BTreeMap<String, IcuSelectOption>,
    },
    /// Plural or selectordinal expression.
    Plural {
        /// Variable name.
        value: String,
        /// Selector options.
        options: BTreeMap<String, IcuPluralOption>,
        /// Optional offset.
        offset: i32,
        /// Plural mode.
        plural_type: IcuPluralType,
    },
    /// `#` inside plural/selectordinal.
    Pound,
    /// XML-like tag node.
    Tag {
        /// Tag name.
        value: String,
        /// Child nodes.
        children: Vec<IcuNode>,
    },
}

/// Parser error.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IcuParseError {
    /// Error kind.
    pub kind: IcuErrorKind,
    /// Human-readable error message.
    pub message: String,
    /// Offset in the source string.
    pub offset: usize,
}

impl Display for IcuParseError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        write!(
            formatter,
            "ICU syntax error at position {}: {}",
            self.offset, self.message
        )
    }
}

impl Error for IcuParseError {}

/// Variable descriptor extracted from an ICU message.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IcuVariable {
    /// Variable name.
    pub name: String,
    /// Variable type.
    pub kind: String,
    /// Optional style hint.
    pub style: Option<String>,
}

/// Validation result for an ICU message.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IcuValidationResult {
    /// Whether parsing succeeded.
    pub valid: bool,
    /// Parse errors, if any.
    pub errors: Vec<IcuParseError>,
}

/// Variable comparison result.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IcuVariableComparison {
    /// Variables missing in the translation.
    pub missing: Vec<String>,
    /// Extra variables present in the translation.
    pub extra: Vec<String>,
    /// Whether both sides match exactly.
    pub is_match: bool,
}

/// Options for Gettext-to-ICU conversion.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GettextToIcuOptions {
    /// Target locale used to map plural indices to categories.
    pub locale: String,
    /// Variable name used for the resulting ICU plural expression.
    pub plural_variable: String,
    /// Replace `#` with `{plural_variable}`.
    pub expand_octothorpe: bool,
}

impl GettextToIcuOptions {
    /// Create conversion options for a locale.
    #[must_use]
    pub fn new(locale: impl Into<String>) -> Self {
        Self {
            locale: locale.into(),
            plural_variable: String::from("count"),
            expand_octothorpe: true,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ParentArgType {
    Plural,
    SelectOrdinal,
    None,
}

/// ICU parser.
pub struct IcuParser<'a> {
    pos: usize,
    msg: &'a str,
    ignore_tag: bool,
    requires_other: bool,
}

impl<'a> IcuParser<'a> {
    /// Create a new parser.
    #[must_use]
    pub fn new(message: &'a str, options: IcuParserOptions) -> Self {
        Self {
            pos: 0,
            msg: message,
            ignore_tag: options.ignore_tag,
            requires_other: options.requires_other_clause,
        }
    }

    /// Parse the full message.
    pub fn parse(mut self) -> Result<Vec<IcuNode>, IcuParseError> {
        let result = self.parse_message(0, ParentArgType::None)?;
        if self.pos < self.msg.len() {
            return Err(self.error("Unexpected character", None));
        }
        Ok(result)
    }

    fn parse_message(
        &mut self,
        depth: usize,
        parent_arg: ParentArgType,
    ) -> Result<Vec<IcuNode>, IcuParseError> {
        let mut nodes = Vec::new();
        let in_plural = matches!(
            parent_arg,
            ParentArgType::Plural | ParentArgType::SelectOrdinal
        );

        while self.pos < self.msg.len() {
            let ch = self.current_char();
            match ch {
                Some('{') => nodes.push(self.parse_argument(depth)?),
                Some('}') if depth > 0 => break,
                Some('#') if in_plural => {
                    self.pos += 1;
                    nodes.push(IcuNode::Pound);
                }
                Some('<') if !self.ignore_tag => {
                    let next = self.peek_char(1);
                    if matches!(next, Some(c) if is_alpha(c) || c.is_ascii_digit()) {
                        nodes.push(self.parse_tag(depth, parent_arg)?);
                    } else if next == Some('/') {
                        break;
                    } else {
                        nodes.push(self.parse_literal(depth, in_plural));
                    }
                }
                _ => nodes.push(self.parse_literal(depth, in_plural)),
            }
        }

        Ok(nodes)
    }

    fn parse_argument(&mut self, depth: usize) -> Result<IcuNode, IcuParseError> {
        let start = self.pos;
        self.pos += 1;
        self.skip_whitespace();

        if self.current_char() == Some('}') {
            return Err(self.error("Empty argument", Some(start)));
        }

        let name = self.parse_identifier();
        if name.is_empty() {
            return Err(self.error("Expected argument name", Some(start)));
        }

        self.skip_whitespace();
        if self.current_char() == Some('}') {
            self.pos += 1;
            return Ok(IcuNode::Argument { value: name });
        }

        if self.current_char() != Some(',') {
            return Err(self.error("Expected ',' or '}'", Some(start)));
        }
        self.pos += 1;
        self.skip_whitespace();

        let arg_type = self.parse_identifier();
        if arg_type.is_empty() {
            return Err(self.error("Expected argument type", Some(start)));
        }

        let normalized_type = arg_type.to_lowercase();
        match normalized_type.as_str() {
            "number" | "date" | "time" | "list" | "duration" | "ago" | "name" => {
                self.parse_formatted_arg(&normalized_type, name, start)
            }
            "plural" | "selectordinal" => self.parse_plural(&normalized_type, name, depth, start),
            "select" => self.parse_select(name, depth, start),
            _ => Err(self.error(&format!("Invalid argument type: {arg_type}"), Some(start))),
        }
    }

    fn parse_formatted_arg(
        &mut self,
        arg_type: &str,
        name: String,
        start: usize,
    ) -> Result<IcuNode, IcuParseError> {
        self.skip_whitespace();
        let mut style = None;

        if self.current_char() == Some(',') {
            self.pos += 1;
            self.skip_whitespace();
            let parsed_style = self.parse_style();
            if parsed_style.is_empty() {
                return Err(self.error("Expected style", Some(start)));
            }
            style = Some(parsed_style);
        }

        self.expect_char('}', Some(start))?;

        Ok(match arg_type {
            "number" => IcuNode::Number { value: name, style },
            "date" => IcuNode::Date { value: name, style },
            "time" => IcuNode::Time { value: name, style },
            "list" => IcuNode::List { value: name, style },
            "duration" => IcuNode::Duration { value: name, style },
            "ago" => IcuNode::Ago { value: name, style },
            "name" => IcuNode::Name { value: name, style },
            _ => unreachable!(),
        })
    }

    fn parse_plural(
        &mut self,
        arg_type: &str,
        name: String,
        depth: usize,
        start: usize,
    ) -> Result<IcuNode, IcuParseError> {
        self.skip_whitespace();
        self.expect_char(',', Some(start))?;
        self.skip_whitespace();

        let mut offset = 0;
        if self.peek_identifier() == "offset" {
            let _ = self.parse_identifier();
            self.expect_char(':', Some(start))?;
            self.skip_whitespace();
            offset = self.parse_integer(Some(start))?;
            self.skip_whitespace();
        }

        let parent = if arg_type == "plural" {
            ParentArgType::Plural
        } else {
            ParentArgType::SelectOrdinal
        };
        let options = self.parse_plural_options(depth, parent)?;
        self.expect_char('}', Some(start))?;

        Ok(IcuNode::Plural {
            value: name,
            options,
            offset,
            plural_type: if arg_type == "plural" {
                IcuPluralType::Cardinal
            } else {
                IcuPluralType::Ordinal
            },
        })
    }

    fn parse_select(
        &mut self,
        name: String,
        depth: usize,
        start: usize,
    ) -> Result<IcuNode, IcuParseError> {
        self.skip_whitespace();
        self.expect_char(',', Some(start))?;
        self.skip_whitespace();

        let options = self.parse_select_options(depth)?;
        self.expect_char('}', Some(start))?;

        Ok(IcuNode::Select {
            value: name,
            options,
        })
    }

    fn parse_plural_options(
        &mut self,
        depth: usize,
        parent_arg: ParentArgType,
    ) -> Result<BTreeMap<String, IcuPluralOption>, IcuParseError> {
        let mut options = BTreeMap::new();
        let mut seen = BTreeSet::new();

        while self.pos < self.msg.len() && self.current_char() != Some('}') {
            self.skip_whitespace();

            let selector = if self.current_char() == Some('=') {
                self.pos += 1;
                format!("={}", self.parse_integer(None)?)
            } else {
                let selector = self.parse_identifier();
                if selector.is_empty() {
                    break;
                }
                selector
            };

            if !seen.insert(selector.clone()) {
                return Err(self.error(&format!("Duplicate selector: {selector}"), None));
            }

            self.skip_whitespace();
            self.expect_char('{', None)?;
            let value = self.parse_message(depth + 1, parent_arg)?;
            self.expect_char('}', None)?;
            options.insert(selector, IcuPluralOption { value });
            self.skip_whitespace();
        }

        if options.is_empty() {
            return Err(self.error("Expected at least one plural option", None));
        }
        if self.requires_other && !options.contains_key("other") {
            return Err(self.error("Missing 'other' clause", None));
        }

        Ok(options)
    }

    fn parse_select_options(
        &mut self,
        depth: usize,
    ) -> Result<BTreeMap<String, IcuSelectOption>, IcuParseError> {
        let mut options = BTreeMap::new();
        let mut seen = BTreeSet::new();

        while self.pos < self.msg.len() && self.current_char() != Some('}') {
            self.skip_whitespace();
            let selector = self.parse_identifier();
            if selector.is_empty() {
                break;
            }

            if !seen.insert(selector.clone()) {
                return Err(self.error(&format!("Duplicate selector: {selector}"), None));
            }

            self.skip_whitespace();
            self.expect_char('{', None)?;
            let value = self.parse_message(depth + 1, ParentArgType::None)?;
            self.expect_char('}', None)?;
            options.insert(selector, IcuSelectOption { value });
            self.skip_whitespace();
        }

        if options.is_empty() {
            return Err(self.error("Expected at least one select option", None));
        }
        if self.requires_other && !options.contains_key("other") {
            return Err(self.error("Missing 'other' clause", None));
        }

        Ok(options)
    }

    fn parse_tag(
        &mut self,
        depth: usize,
        parent_arg: ParentArgType,
    ) -> Result<IcuNode, IcuParseError> {
        let start = self.pos;
        self.pos += 1;
        let tag_name = self.parse_tag_name();
        self.skip_whitespace();

        if self.remaining().starts_with("/>") {
            self.pos += 2;
            return Ok(IcuNode::Literal {
                value: format!("<{tag_name}/>"),
            });
        }

        self.expect_char('>', Some(start))?;
        let children = self.parse_message(depth + 1, parent_arg)?;

        if !self.remaining().starts_with("</") {
            return Err(self.error("Unclosed tag", Some(start)));
        }
        self.pos += 2;

        let closing_name = self.parse_tag_name();
        if closing_name != tag_name {
            return Err(self.error(
                &format!("Mismatched tag: expected </{tag_name}>, got </{closing_name}>"),
                Some(start),
            ));
        }

        self.skip_whitespace();
        self.expect_char('>', Some(start))?;

        Ok(IcuNode::Tag {
            value: tag_name,
            children,
        })
    }

    fn parse_literal(&mut self, depth: usize, in_plural: bool) -> IcuNode {
        let mut value = String::new();

        while self.pos < self.msg.len() {
            let Some(ch) = self.current_char() else {
                break;
            };

            if ch == '{' || (ch == '}' && depth > 0) {
                break;
            }
            if ch == '#' && in_plural {
                break;
            }
            if ch == '<' && !self.ignore_tag {
                let next = self.peek_char(1);
                if matches!(next, Some(c) if is_alpha(c) || c.is_ascii_digit()) || next == Some('/')
                {
                    break;
                }
            }

            if ch == '\'' {
                let next = self.peek_char(1);
                if next == Some('\'') {
                    value.push('\'');
                    self.pos += 2;
                } else if matches!(next, Some('{') | Some('}') | Some('<') | Some('>'))
                    || (next == Some('#') && in_plural)
                {
                    self.pos += 1;
                    while self.pos < self.msg.len() {
                        let Some(quoted) = self.current_char() else {
                            break;
                        };
                        if quoted == '\'' {
                            if self.peek_char(1) == Some('\'') {
                                value.push('\'');
                                self.pos += 2;
                            } else {
                                self.pos += 1;
                                break;
                            }
                        } else {
                            value.push(quoted);
                            self.pos += quoted.len_utf8();
                        }
                    }
                } else {
                    value.push(ch);
                    self.pos += 1;
                }
            } else {
                value.push(ch);
                self.pos += ch.len_utf8();
            }
        }

        IcuNode::Literal { value }
    }

    fn parse_style(&mut self) -> String {
        let start = self.pos;
        let mut brace_depth = 0usize;

        while self.pos < self.msg.len() {
            let Some(ch) = self.current_char() else {
                break;
            };

            if ch == '\'' {
                self.pos += 1;
                while self.pos < self.msg.len() && self.current_char() != Some('\'') {
                    self.pos += self.current_char().map_or(1, char::len_utf8);
                }
                if self.pos < self.msg.len() {
                    self.pos += 1;
                }
            } else if ch == '{' {
                brace_depth += 1;
                self.pos += 1;
            } else if ch == '}' {
                if brace_depth == 0 {
                    break;
                }
                brace_depth -= 1;
                self.pos += 1;
            } else {
                self.pos += ch.len_utf8();
            }
        }

        self.msg[start..self.pos].trim().to_owned()
    }

    fn parse_identifier(&mut self) -> String {
        let start = self.pos;
        while self.pos < self.msg.len() {
            let Some(ch) = self.current_char() else {
                break;
            };
            if !is_identifier_char(ch) {
                break;
            }
            self.pos += ch.len_utf8();
        }
        self.msg[start..self.pos].to_owned()
    }

    fn parse_tag_name(&mut self) -> String {
        let start = self.pos;
        while self.pos < self.msg.len() {
            let Some(ch) = self.current_char() else {
                break;
            };
            if !is_tag_char(ch) {
                break;
            }
            self.pos += ch.len_utf8();
        }
        self.msg[start..self.pos].to_owned()
    }

    fn parse_integer(&mut self, error_pos: Option<usize>) -> Result<i32, IcuParseError> {
        let start = self.pos;
        let mut sign = 1;

        match self.current_char() {
            Some('-') => {
                sign = -1;
                self.pos += 1;
            }
            Some('+') => self.pos += 1,
            _ => {}
        }

        let digits_start = self.pos;
        while self.pos < self.msg.len() && self.current_char().is_some_and(|ch| ch.is_ascii_digit())
        {
            self.pos += 1;
        }

        if self.pos == digits_start {
            return Err(self.error("Expected integer", error_pos.or(Some(start))));
        }

        let number = self.msg[digits_start..self.pos]
            .parse::<i32>()
            .map_err(|_| self.error("Expected integer", error_pos.or(Some(start))))?;

        Ok(sign * number)
    }

    fn skip_whitespace(&mut self) {
        while self.pos < self.msg.len()
            && self
                .current_char()
                .is_some_and(|ch| matches!(ch, ' ' | '\t' | '\n' | '\r'))
        {
            self.pos += self.current_char().map_or(1, char::len_utf8);
        }
    }

    fn peek_identifier(&mut self) -> String {
        let start = self.pos;
        let identifier = self.parse_identifier();
        self.pos = start;
        identifier
    }

    fn expect_char(
        &mut self,
        expected: char,
        error_pos: Option<usize>,
    ) -> Result<(), IcuParseError> {
        if self.current_char() != Some(expected) {
            return Err(self.error(&format!("Expected '{expected}'"), error_pos));
        }
        self.pos += expected.len_utf8();
        Ok(())
    }

    fn error(&self, message: &str, offset: Option<usize>) -> IcuParseError {
        IcuParseError {
            kind: IcuErrorKind::SyntaxError,
            message: message.to_owned(),
            offset: offset.unwrap_or(self.pos),
        }
    }

    fn current_char(&self) -> Option<char> {
        self.msg[self.pos..].chars().next()
    }

    fn peek_char(&self, ahead: usize) -> Option<char> {
        self.msg[self.pos..].chars().nth(ahead)
    }

    fn remaining(&self) -> &str {
        &self.msg[self.pos..]
    }
}

/// Parse an ICU MessageFormat string.
pub fn parse_icu(message: &str, options: IcuParserOptions) -> Result<Vec<IcuNode>, IcuParseError> {
    IcuParser::new(message, options).parse()
}

/// Validate an ICU message.
#[must_use]
pub fn validate_icu(message: &str, options: IcuParserOptions) -> IcuValidationResult {
    match parse_icu(message, options) {
        Ok(_) => IcuValidationResult {
            valid: true,
            errors: Vec::new(),
        },
        Err(error) => IcuValidationResult {
            valid: false,
            errors: vec![error],
        },
    }
}

/// Extract variable names from an ICU message.
#[must_use]
pub fn extract_variables(message: &str) -> Vec<String> {
    parse_icu(
        message,
        IcuParserOptions {
            requires_other_clause: false,
            ..IcuParserOptions::default()
        },
    )
    .map_or_else(|_| Vec::new(), |ast| extract_variables_from_ast(&ast))
}

/// Extract variable details from an ICU message.
#[must_use]
pub fn extract_variable_info(message: &str) -> Vec<IcuVariable> {
    parse_icu(
        message,
        IcuParserOptions {
            requires_other_clause: false,
            ..IcuParserOptions::default()
        },
    )
    .map_or_else(|_| Vec::new(), |ast| extract_variable_info_from_ast(&ast))
}

/// Compare variable sets between source and translation.
#[must_use]
pub fn compare_variables(source: &str, translation: &str) -> IcuVariableComparison {
    let source_vars = extract_variables(source)
        .into_iter()
        .collect::<BTreeSet<_>>();
    let translation_vars = extract_variables(translation)
        .into_iter()
        .collect::<BTreeSet<_>>();

    let missing = source_vars
        .difference(&translation_vars)
        .cloned()
        .collect::<Vec<_>>();
    let extra = translation_vars
        .difference(&source_vars)
        .cloned()
        .collect::<Vec<_>>();

    IcuVariableComparison {
        is_match: missing.is_empty() && extra.is_empty(),
        missing,
        extra,
    }
}

/// Check whether a message contains a plural node.
#[must_use]
pub fn has_plural(message: &str) -> bool {
    parse_icu(
        message,
        IcuParserOptions {
            requires_other_clause: false,
            ..IcuParserOptions::default()
        },
    )
    .is_ok_and(|ast| contains_node_type(&ast, |node| matches!(node, IcuNode::Plural { .. })))
}

/// Check whether a message contains a select node.
#[must_use]
pub fn has_select(message: &str) -> bool {
    parse_icu(
        message,
        IcuParserOptions {
            requires_other_clause: false,
            ..IcuParserOptions::default()
        },
    )
    .is_ok_and(|ast| contains_node_type(&ast, |node| matches!(node, IcuNode::Select { .. })))
}

/// Check whether a message contains a selectordinal node.
#[must_use]
pub fn has_select_ordinal(message: &str) -> bool {
    parse_icu(
        message,
        IcuParserOptions {
            requires_other_clause: false,
            ..IcuParserOptions::default()
        },
    )
    .is_ok_and(|ast| {
        contains_node_type(&ast, |node| {
            matches!(
                node,
                IcuNode::Plural {
                    plural_type: IcuPluralType::Ordinal,
                    ..
                }
            )
        })
    })
}

/// Check whether a message contains any ICU syntax.
#[must_use]
pub fn has_icu_syntax(message: &str) -> bool {
    parse_icu(
        message,
        IcuParserOptions {
            requires_other_clause: false,
            ignore_tag: true,
        },
    )
    .is_ok_and(|ast| {
        ast.iter()
            .any(|node| !matches!(node, IcuNode::Literal { .. }))
    })
}

/// Check whether a PO item uses gettext plural forms.
#[must_use]
pub fn is_plural_item(item: &PoItem) -> bool {
    item.msgid_plural.is_some() && item.msgstr.len() > 1
}

/// Convert a gettext plural item to ICU MessageFormat.
#[must_use]
pub fn gettext_to_icu(item: &PoItem, options: &GettextToIcuOptions) -> Option<String> {
    if !is_plural_item(item) {
        return None;
    }

    let categories = get_plural_categories(&options.locale);
    let clauses = item
        .msgstr
        .iter()
        .enumerate()
        .map(|(index, translation)| {
            let category = categories.get(index).copied().unwrap_or("other");
            let text = if options.expand_octothorpe {
                translation.replace('#', &format!("{{{}}}", options.plural_variable))
            } else {
                translation.clone()
            };
            format!("{category} {{{text}}}")
        })
        .collect::<Vec<_>>()
        .join(" ");

    Some(format!(
        "{{{}, plural, {clauses}}}",
        options.plural_variable
    ))
}

/// Normalize a plural item to ICU format in place.
pub fn normalize_item_to_icu(item: &mut PoItem, options: &GettextToIcuOptions) -> bool {
    match gettext_to_icu(item, options) {
        Some(icu) => {
            item.msgstr = vec![icu];
            item.msgid_plural = Some(String::new());
            true
        }
        None => false,
    }
}

/// Normalize all plural items in a PO file in place.
pub fn normalize_to_icu_in_place(po: &mut PoFile, options: &GettextToIcuOptions) {
    for item in &mut po.items {
        let _ = normalize_item_to_icu(item, options);
    }
}

/// Normalize all plural items in a PO file and return a cloned result.
#[must_use]
pub fn normalize_to_icu(po: &PoFile, options: &GettextToIcuOptions) -> PoFile {
    let mut cloned = po.clone();
    normalize_to_icu_in_place(&mut cloned, options);
    cloned
}

/// Convert an ICU plural expression back to gettext-style source strings.
#[must_use]
pub fn icu_to_gettext_source(
    icu: &str,
    expand_octothorpe: bool,
) -> Option<(String, String, String)> {
    let ast = parse_icu(
        icu,
        IcuParserOptions {
            requires_other_clause: false,
            ..IcuParserOptions::default()
        },
    )
    .ok()?;

    let IcuNode::Plural { value, options, .. } = ast.first()? else {
        return None;
    };

    if options.len() < 2 {
        return None;
    }

    let singular = options
        .get("one")
        .or_else(|| options.values().next())
        .map(flatten_option_text)?;
    let plural = options
        .get("other")
        .or_else(|| options.values().last())
        .map(flatten_option_text)?;

    let expand = |text: String| {
        if expand_octothorpe {
            text.replace('#', &format!("{{{value}}}"))
        } else {
            text
        }
    };

    Some((expand(singular), expand(plural), value.clone()))
}

fn extract_variables_from_ast(nodes: &[IcuNode]) -> Vec<String> {
    let mut variables = BTreeSet::new();
    for_each_node(nodes, &mut |node| {
        if let Some(name) = node_variable_name(node) {
            variables.insert(name.to_owned());
        }
    });
    variables.into_iter().collect()
}

fn extract_variable_info_from_ast(nodes: &[IcuNode]) -> Vec<IcuVariable> {
    let mut variables = Vec::new();
    let mut seen = BTreeSet::new();

    for_each_node(nodes, &mut |node| {
        if let Some(variable) = node_to_variable(node) {
            if seen.insert(variable.name.clone()) {
                variables.push(variable);
            }
        }
    });

    variables
}

fn flatten_option_text<T>(option: &T) -> String
where
    T: OptionNodes,
{
    option
        .nodes()
        .iter()
        .map(flatten_node_text)
        .collect::<Vec<_>>()
        .join("")
}

fn contains_node_type(nodes: &[IcuNode], predicate: impl Fn(&IcuNode) -> bool + Copy) -> bool {
    some_node(nodes, predicate)
}

fn some_node(nodes: &[IcuNode], predicate: impl Fn(&IcuNode) -> bool + Copy) -> bool {
    for node in nodes {
        if predicate(node) {
            return true;
        }

        match node {
            IcuNode::Plural { options, .. } => {
                for child in plural_child_nodes(options) {
                    if predicate(child) || some_node(std::slice::from_ref(child), predicate) {
                        return true;
                    }
                }
            }
            IcuNode::Select { options, .. } => {
                for child in select_child_nodes(options) {
                    if predicate(child) || some_node(std::slice::from_ref(child), predicate) {
                        return true;
                    }
                }
            }
            IcuNode::Tag { children, .. } => {
                if some_node(children, predicate) {
                    return true;
                }
            }
            IcuNode::Literal { .. }
            | IcuNode::Argument { .. }
            | IcuNode::Number { .. }
            | IcuNode::Date { .. }
            | IcuNode::Time { .. }
            | IcuNode::List { .. }
            | IcuNode::Duration { .. }
            | IcuNode::Ago { .. }
            | IcuNode::Name { .. }
            | IcuNode::Pound => {}
        }
    }

    false
}

fn for_each_node(nodes: &[IcuNode], callback: &mut dyn FnMut(&IcuNode)) {
    for node in nodes {
        callback(node);
        match node {
            IcuNode::Plural { options, .. } => {
                for option in options.values() {
                    for_each_node(&option.value, callback);
                }
            }
            IcuNode::Select { options, .. } => {
                for option in options.values() {
                    for_each_node(&option.value, callback);
                }
            }
            IcuNode::Tag { children, .. } => for_each_node(children, callback),
            IcuNode::Literal { .. }
            | IcuNode::Argument { .. }
            | IcuNode::Number { .. }
            | IcuNode::Date { .. }
            | IcuNode::Time { .. }
            | IcuNode::List { .. }
            | IcuNode::Duration { .. }
            | IcuNode::Ago { .. }
            | IcuNode::Name { .. }
            | IcuNode::Pound => {}
        }
    }
}

fn plural_child_nodes<'a>(
    options: &'a BTreeMap<String, IcuPluralOption>,
) -> impl Iterator<Item = &'a IcuNode> + 'a {
    options.values().flat_map(|option| option.value.iter())
}

fn select_child_nodes<'a>(
    options: &'a BTreeMap<String, IcuSelectOption>,
) -> impl Iterator<Item = &'a IcuNode> + 'a {
    options.values().flat_map(|option| option.value.iter())
}

fn node_variable_name(node: &IcuNode) -> Option<&str> {
    match node {
        IcuNode::Argument { value }
        | IcuNode::Number { value, .. }
        | IcuNode::Date { value, .. }
        | IcuNode::Time { value, .. }
        | IcuNode::List { value, .. }
        | IcuNode::Duration { value, .. }
        | IcuNode::Ago { value, .. }
        | IcuNode::Name { value, .. }
        | IcuNode::Plural { value, .. }
        | IcuNode::Select { value, .. } => Some(value),
        IcuNode::Literal { .. } | IcuNode::Pound | IcuNode::Tag { .. } => None,
    }
}

fn node_to_variable(node: &IcuNode) -> Option<IcuVariable> {
    match node {
        IcuNode::Argument { value } => Some(IcuVariable {
            name: value.clone(),
            kind: String::from("argument"),
            style: None,
        }),
        IcuNode::Number { value, style } => Some(IcuVariable {
            name: value.clone(),
            kind: String::from("number"),
            style: style.clone(),
        }),
        IcuNode::Date { value, style } => Some(IcuVariable {
            name: value.clone(),
            kind: String::from("date"),
            style: style.clone(),
        }),
        IcuNode::Time { value, style } => Some(IcuVariable {
            name: value.clone(),
            kind: String::from("time"),
            style: style.clone(),
        }),
        IcuNode::List { value, style }
        | IcuNode::Duration { value, style }
        | IcuNode::Ago { value, style }
        | IcuNode::Name { value, style } => Some(IcuVariable {
            name: value.clone(),
            kind: String::from("argument"),
            style: style.clone(),
        }),
        IcuNode::Plural { value, .. } => Some(IcuVariable {
            name: value.clone(),
            kind: String::from("plural"),
            style: None,
        }),
        IcuNode::Select { value, .. } => Some(IcuVariable {
            name: value.clone(),
            kind: String::from("select"),
            style: None,
        }),
        IcuNode::Literal { .. } | IcuNode::Pound | IcuNode::Tag { .. } => None,
    }
}

fn is_alpha(ch: char) -> bool {
    ch.is_ascii_alphabetic()
}

fn is_identifier_char(ch: char) -> bool {
    !matches!(
        ch,
        ' ' | '\t' | '\n' | '\r' | '{' | '}' | '#' | '<' | '>' | ',' | ':'
    )
}

fn is_tag_char(ch: char) -> bool {
    ch.is_ascii_alphanumeric() || matches!(ch, '-' | '.' | ':' | '_')
}

fn flatten_node_text(node: &IcuNode) -> String {
    match node {
        IcuNode::Literal { value }
        | IcuNode::Argument { value }
        | IcuNode::Number { value, .. }
        | IcuNode::Date { value, .. }
        | IcuNode::Time { value, .. }
        | IcuNode::List { value, .. }
        | IcuNode::Duration { value, .. }
        | IcuNode::Ago { value, .. }
        | IcuNode::Name { value, .. } => value.clone(),
        IcuNode::Pound => String::from("#"),
        IcuNode::Tag { children, .. } => children.iter().map(flatten_node_text).collect(),
        IcuNode::Plural { .. } | IcuNode::Select { .. } => String::new(),
    }
}

trait OptionNodes {
    fn nodes(&self) -> &[IcuNode];
}

impl OptionNodes for IcuPluralOption {
    fn nodes(&self) -> &[IcuNode] {
        &self.value
    }
}

impl OptionNodes for IcuSelectOption {
    fn nodes(&self) -> &[IcuNode] {
        &self.value
    }
}

#[cfg(test)]
mod tests {
    use super::{
        compare_variables, extract_variable_info, extract_variables, gettext_to_icu,
        has_icu_syntax, has_plural, has_select, has_select_ordinal, icu_to_gettext_source,
        is_plural_item, normalize_item_to_icu, normalize_to_icu, normalize_to_icu_in_place,
        parse_icu, validate_icu, GettextToIcuOptions, IcuNode, IcuParserOptions, IcuPluralType,
    };
    use crate::po::{PoFile, PoItem};

    #[test]
    fn parse_icu_parses_literals_and_arguments() {
        let ast = parse_icu("Hello {name}", IcuParserOptions::default()).expect("should parse");
        assert_eq!(
            ast,
            vec![
                IcuNode::Literal {
                    value: String::from("Hello "),
                },
                IcuNode::Argument {
                    value: String::from("name"),
                },
            ]
        );
    }

    #[test]
    fn parse_icu_parses_formatted_arguments() {
        let ast = parse_icu("{price, number, currency}", IcuParserOptions::default())
            .expect("should parse");
        assert_eq!(
            ast[0],
            IcuNode::Number {
                value: String::from("price"),
                style: Some(String::from("currency")),
            }
        );
    }

    #[test]
    fn parse_icu_parses_plural_and_pound_nodes() {
        let ast = parse_icu(
            "{count, plural, one {# item} other {# items}}",
            IcuParserOptions::default(),
        )
        .expect("should parse");

        match &ast[0] {
            IcuNode::Plural {
                value,
                options,
                plural_type,
                ..
            } => {
                assert_eq!(value, "count");
                assert_eq!(*plural_type, IcuPluralType::Cardinal);
                assert!(options.contains_key("one"));
                assert!(options.contains_key("other"));
            }
            other => panic!("expected plural node, got {other:?}"),
        }
    }

    #[test]
    fn parse_icu_parses_select_and_tags() {
        let ast = parse_icu(
            "{gender, select, male {He} other {<b>They</b>}}",
            IcuParserOptions::default(),
        )
        .expect("should parse");

        match &ast[0] {
            IcuNode::Select { value, options } => {
                assert_eq!(value, "gender");
                assert!(options.contains_key("male"));
                assert!(options.contains_key("other"));
            }
            other => panic!("expected select node, got {other:?}"),
        }
    }

    #[test]
    fn parse_icu_handles_quotes_and_escaped_apostrophes() {
        let ast = parse_icu(
            "This is a '{placeholder}' and it''s fine",
            IcuParserOptions::default(),
        )
        .expect("should parse");
        assert_eq!(
            ast,
            vec![IcuNode::Literal {
                value: String::from("This is a {placeholder} and it's fine"),
            }]
        );
    }

    #[test]
    fn validate_icu_reports_missing_other_clause() {
        let result = validate_icu(
            "{n, plural, one {#}}",
            IcuParserOptions {
                requires_other_clause: true,
                ..IcuParserOptions::default()
            },
        );
        assert!(!result.valid);
        assert!(result.errors[0].message.contains("Missing 'other' clause"));
    }

    #[test]
    fn extractors_and_predicates_work() {
        let message = "{name} has {count, plural, one {# item} other {# items}}";
        assert_eq!(
            extract_variables(message),
            vec![String::from("count"), String::from("name")]
        );
        assert_eq!(extract_variable_info(message).len(), 2);
        assert!(has_plural(message));
        assert!(!has_select(message));
        assert!(!has_select_ordinal(message));
        assert!(has_icu_syntax(message));
    }

    #[test]
    fn compare_variables_detects_missing_and_extra() {
        let comparison = compare_variables("Hello {name}", "Hallo {userName}");
        assert_eq!(comparison.missing, vec![String::from("name")]);
        assert_eq!(comparison.extra, vec![String::from("userName")]);
        assert!(!comparison.is_match);
    }

    #[test]
    fn parse_icu_parses_selectordinal() {
        let ast = parse_icu(
            "{n, selectordinal, one {#st} two {#nd} other {#th}}",
            IcuParserOptions::default(),
        )
        .expect("should parse");

        match &ast[0] {
            IcuNode::Plural { plural_type, .. } => assert_eq!(*plural_type, IcuPluralType::Ordinal),
            other => panic!("expected plural node, got {other:?}"),
        }
    }

    fn plural_item(msgstr: &[&str]) -> PoItem {
        let mut item = PoItem::new(2);
        item.msgid = String::from("One item");
        item.msgid_plural = Some(String::from("{count} items"));
        item.msgstr = msgstr.iter().map(|value| (*value).to_owned()).collect();
        item
    }

    #[test]
    fn gettext_to_icu_converts_plural_forms() {
        let item = plural_item(&["Ein Artikel", "{count} Artikel"]);
        let result = gettext_to_icu(&item, &GettextToIcuOptions::new("de"));
        assert_eq!(
            result,
            Some(String::from(
                "{count, plural, one {Ein Artikel} other {{count} Artikel}}"
            ))
        );
    }

    #[test]
    fn gettext_to_icu_handles_multi_form_locales() {
        let item = plural_item(&["plik", "pliki", "plików", "pliki"]);
        let result = gettext_to_icu(&item, &GettextToIcuOptions::new("pl"));
        assert_eq!(
            result,
            Some(String::from(
                "{count, plural, one {plik} few {pliki} many {plików} other {pliki}}"
            ))
        );
    }

    #[test]
    fn normalize_helpers_convert_plural_items() {
        let mut item = plural_item(&["Ein Artikel", "{count} Artikel"]);
        assert!(is_plural_item(&item));
        assert!(normalize_item_to_icu(
            &mut item,
            &GettextToIcuOptions::new("de")
        ));
        assert_eq!(item.msgstr.len(), 1);

        let mut po = PoFile::new();
        po.items
            .push(plural_item(&["Ein Artikel", "{count} Artikel"]));
        let cloned = normalize_to_icu(&po, &GettextToIcuOptions::new("de"));
        assert_ne!(po.items[0].msgstr, cloned.items[0].msgstr);

        normalize_to_icu_in_place(&mut po, &GettextToIcuOptions::new("de"));
        assert_eq!(po.items[0].msgstr, cloned.items[0].msgstr);
    }

    #[test]
    fn icu_to_gettext_source_extracts_singular_and_plural() {
        let source = icu_to_gettext_source("{count, plural, one {# item} other {# items}}", true);
        assert_eq!(
            source,
            Some((
                String::from("{count} item"),
                String::from("{count} items"),
                String::from("count")
            ))
        );
    }
}
