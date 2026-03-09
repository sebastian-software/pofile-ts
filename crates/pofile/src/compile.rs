//! Runtime ICU and catalog compilation.

use std::collections::BTreeMap;
use std::fmt::{Debug, Formatter};
use std::sync::Arc;

use crate::catalog::{Catalog, CatalogTranslation};
use crate::generate_message_id;
use crate::icu::{parse_icu, IcuNode, IcuParseError, IcuParserOptions};
use crate::plurals::{get_plural_categories, get_plural_index};

/// Host interface used for locale-aware formatting and tag rendering.
pub trait FormatHost {
    /// Locale used by plural selection and host-provided formatters.
    fn locale(&self) -> &str;

    /// Format a number node value.
    fn format_number(
        &self,
        _name: &str,
        value: &MessageValue,
        _style: Option<&str>,
        _values: &MessageValues,
    ) -> Option<String> {
        Some(display_value(value))
    }

    /// Format a date node value.
    fn format_date(
        &self,
        _name: &str,
        value: &MessageValue,
        _style: Option<&str>,
        _values: &MessageValues,
    ) -> Option<String> {
        Some(display_value(value))
    }

    /// Format a time node value.
    fn format_time(
        &self,
        _name: &str,
        value: &MessageValue,
        _style: Option<&str>,
        _values: &MessageValues,
    ) -> Option<String> {
        Some(display_value(value))
    }

    /// Format a list node value.
    fn format_list(
        &self,
        _name: &str,
        value: &MessageValue,
        _style: Option<&str>,
        _values: &MessageValues,
    ) -> Option<String> {
        Some(display_value(value))
    }

    /// Format a duration node value.
    fn format_duration(
        &self,
        _name: &str,
        value: &MessageValue,
        _style: Option<&str>,
        _values: &MessageValues,
    ) -> Option<String> {
        Some(display_value(value))
    }

    /// Format a relative-time node value.
    fn format_ago(
        &self,
        _name: &str,
        value: &MessageValue,
        _style: Option<&str>,
        _values: &MessageValues,
    ) -> Option<String> {
        Some(display_value(value))
    }

    /// Format a display-name node value.
    fn format_name(
        &self,
        _name: &str,
        value: &MessageValue,
        _style: Option<&str>,
        _values: &MessageValues,
    ) -> Option<String> {
        Some(display_value(value))
    }

    /// Render a tag node.
    fn render_tag(&self, name: &str, children: &str, values: &MessageValues) -> Option<String> {
        match values.get(name) {
            Some(MessageValue::Tag(handler)) => Some(handler.render(children)),
            _ => None,
        }
    }
}

/// Default host used by [`CompiledMessage::format`] and [`CompiledCatalog::format`].
#[derive(Debug, Clone)]
pub struct DefaultFormatHost {
    locale: String,
}

impl DefaultFormatHost {
    /// Create a default host for a locale.
    #[must_use]
    pub fn new(locale: impl Into<String>) -> Self {
        Self {
            locale: locale.into(),
        }
    }
}

impl FormatHost for DefaultFormatHost {
    fn locale(&self) -> &str {
        &self.locale
    }
}

/// Trait implemented by tag handlers used during message rendering.
pub trait TagHandler: Send + Sync {
    /// Render child text for a tag.
    fn render(&self, children: &str) -> String;
}

impl<F> TagHandler for F
where
    F: Fn(&str) -> String + Send + Sync,
{
    fn render(&self, children: &str) -> String {
        self(children)
    }
}

/// Value map passed to compiled messages.
pub type MessageValues = BTreeMap<String, MessageValue>;

/// Runtime value used by the Rust compiler/evaluator.
pub enum MessageValue {
    /// Text value.
    String(String),
    /// Numeric value.
    Number(f64),
    /// Boolean value.
    Bool(bool),
    /// List value.
    List(Vec<MessageValue>),
    /// Tag handler.
    Tag(Arc<dyn TagHandler>),
}

impl Clone for MessageValue {
    fn clone(&self) -> Self {
        match self {
            Self::String(value) => Self::String(value.clone()),
            Self::Number(value) => Self::Number(*value),
            Self::Bool(value) => Self::Bool(*value),
            Self::List(values) => Self::List(values.clone()),
            Self::Tag(handler) => Self::Tag(Arc::clone(handler)),
        }
    }
}

impl Debug for MessageValue {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::String(value) => formatter.debug_tuple("String").field(value).finish(),
            Self::Number(value) => formatter.debug_tuple("Number").field(value).finish(),
            Self::Bool(value) => formatter.debug_tuple("Bool").field(value).finish(),
            Self::List(value) => formatter.debug_tuple("List").field(value).finish(),
            Self::Tag(_) => formatter.write_str("Tag(<handler>)"),
        }
    }
}

impl From<&str> for MessageValue {
    fn from(value: &str) -> Self {
        Self::String(value.to_owned())
    }
}

impl From<String> for MessageValue {
    fn from(value: String) -> Self {
        Self::String(value)
    }
}

impl From<f64> for MessageValue {
    fn from(value: f64) -> Self {
        Self::Number(value)
    }
}

impl From<i32> for MessageValue {
    fn from(value: i32) -> Self {
        Self::Number(f64::from(value))
    }
}

impl From<usize> for MessageValue {
    fn from(value: usize) -> Self {
        Self::Number(value as f64)
    }
}

impl From<bool> for MessageValue {
    fn from(value: bool) -> Self {
        Self::Bool(value)
    }
}

/// Options for ICU runtime compilation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CompileIcuOptions {
    /// Locale used for plural selection.
    pub locale: String,
    /// Whether parse errors should be returned instead of falling back.
    pub strict: bool,
}

impl CompileIcuOptions {
    /// Create compiler options for a locale.
    #[must_use]
    pub fn new(locale: impl Into<String>) -> Self {
        Self {
            locale: locale.into(),
            strict: true,
        }
    }
}

/// A compiled message.
#[derive(Debug, Clone)]
pub struct CompiledMessage {
    kind: CompiledMessageKind,
    locale: String,
}

#[derive(Debug, Clone)]
enum CompiledMessageKind {
    Parsed(Vec<IcuNode>),
    GettextPlural {
        variable: String,
        forms: Vec<CompiledMessage>,
    },
    Fallback(String),
}

impl CompiledMessage {
    /// Format the compiled message with the given values.
    #[must_use]
    pub fn format(&self, values: &MessageValues) -> String {
        let host = DefaultFormatHost::new(self.locale.clone());
        self.format_with_host(values, &host)
    }

    /// Format the compiled message with a caller-provided host.
    #[must_use]
    pub fn format_with_host<H: FormatHost>(&self, values: &MessageValues, host: &H) -> String {
        match &self.kind {
            CompiledMessageKind::Parsed(ast) => render_nodes(ast, values, host, None),
            CompiledMessageKind::GettextPlural { variable, forms } => {
                render_gettext_plural(forms, variable, values, host)
            }
            CompiledMessageKind::Fallback(message) => message.clone(),
        }
    }
}

/// Compile a single ICU message.
pub fn compile_icu(
    message: &str,
    options: &CompileIcuOptions,
) -> Result<CompiledMessage, IcuParseError> {
    match parse_icu(message, IcuParserOptions::default()) {
        Ok(ast) => Ok(CompiledMessage {
            kind: CompiledMessageKind::Parsed(ast),
            locale: options.locale.clone(),
        }),
        Err(error) if options.strict => Err(error),
        Err(_) => Ok(CompiledMessage {
            kind: CompiledMessageKind::Fallback(message.to_owned()),
            locale: options.locale.clone(),
        }),
    }
}

/// Options for catalog compilation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CompileCatalogOptions {
    /// Locale used for plural selection.
    pub locale: String,
    /// Use generated message IDs as keys.
    pub use_message_id: bool,
    /// Whether ICU parse errors are fatal.
    pub strict: bool,
}

impl CompileCatalogOptions {
    /// Create catalog compiler options for a locale.
    #[must_use]
    pub fn new(locale: impl Into<String>) -> Self {
        Self {
            locale: locale.into(),
            use_message_id: true,
            strict: false,
        }
    }
}

/// A compiled catalog with lookup and formatting.
#[derive(Debug, Clone)]
pub struct CompiledCatalog {
    messages: BTreeMap<String, CompiledMessage>,
    /// Locale associated with the compiled catalog.
    pub locale: String,
}

impl CompiledCatalog {
    /// Get a compiled message by key.
    #[must_use]
    pub fn get(&self, key: &str) -> Option<&CompiledMessage> {
        self.messages.get(key)
    }

    /// Format a message by key, returning the key itself if missing.
    #[must_use]
    pub fn format(&self, key: &str, values: &MessageValues) -> String {
        let host = DefaultFormatHost::new(self.locale.clone());
        self.format_with_host(key, values, &host)
    }

    /// Format a message with a caller-provided host, returning the key itself if missing.
    #[must_use]
    pub fn format_with_host<H: FormatHost>(
        &self,
        key: &str,
        values: &MessageValues,
        host: &H,
    ) -> String {
        self.messages.get(key).map_or_else(
            || key.to_owned(),
            |message| message.format_with_host(values, host),
        )
    }

    /// Check whether a message exists.
    #[must_use]
    pub fn has(&self, key: &str) -> bool {
        self.messages.contains_key(key)
    }

    /// Get all message keys.
    #[must_use]
    pub fn keys(&self) -> Vec<String> {
        self.messages.keys().cloned().collect()
    }

    /// Number of compiled messages.
    #[must_use]
    pub fn size(&self) -> usize {
        self.messages.len()
    }
}

/// Compile a catalog to a runtime evaluator map.
pub fn compile_catalog(
    catalog: &Catalog,
    options: &CompileCatalogOptions,
) -> Result<CompiledCatalog, IcuParseError> {
    let mut messages = BTreeMap::new();

    for (msgid, entry) in catalog {
        let Some(translation) = &entry.translation else {
            continue;
        };

        let key = if options.use_message_id {
            generate_message_id(msgid, entry.context.as_deref())
        } else {
            msgid.clone()
        };

        let compiled = match translation {
            CatalogTranslation::Singular(text) => compile_icu(
                text,
                &CompileIcuOptions {
                    locale: options.locale.clone(),
                    strict: options.strict,
                },
            )?,
            CatalogTranslation::Plural(translations) => compile_gettext_plural_runtime(
                msgid,
                entry.plural_source.as_deref(),
                translations,
                &options.locale,
                options.strict,
            )?,
        };

        messages.insert(key, compiled);
    }

    Ok(CompiledCatalog {
        messages,
        locale: options.locale.clone(),
    })
}

fn compile_gettext_plural_runtime(
    msgid: &str,
    plural_source: Option<&str>,
    translations: &[String],
    locale: &str,
    strict: bool,
) -> Result<CompiledMessage, IcuParseError> {
    let forms = translations
        .iter()
        .map(|translation| {
            compile_icu(
                translation,
                &CompileIcuOptions {
                    locale: locale.to_owned(),
                    strict,
                },
            )
        })
        .collect::<Result<Vec<_>, _>>()?;

    Ok(CompiledMessage {
        kind: CompiledMessageKind::GettextPlural {
            variable: extract_plural_variable(msgid, plural_source)
                .unwrap_or_else(|| String::from("count")),
            forms,
        },
        locale: locale.to_owned(),
    })
}

fn render_gettext_plural(
    forms: &[CompiledMessage],
    variable: &str,
    values: &MessageValues,
    host: &impl FormatHost,
) -> String {
    let count = values.get(variable).and_then(as_number).unwrap_or(0.0);
    let index = get_plural_index(host.locale(), count);
    let message = forms
        .get(index)
        .or_else(|| forms.last())
        .map_or_else(String::new, |form| form.format_with_host(values, host));

    if message.is_empty() && forms.is_empty() {
        format_number(count)
    } else {
        message
    }
}

fn render_nodes(
    nodes: &[IcuNode],
    values: &MessageValues,
    host: &impl FormatHost,
    plural: Option<PluralRuntime<'_>>,
) -> String {
    let mut output = String::new();
    for node in nodes {
        output.push_str(&render_node(node, values, host, plural));
    }
    output
}

#[derive(Clone, Copy)]
struct PluralRuntime<'a> {
    variable: &'a str,
    offset: i32,
}

fn render_node(
    node: &IcuNode,
    values: &MessageValues,
    host: &impl FormatHost,
    plural: Option<PluralRuntime<'_>>,
) -> String {
    match node {
        IcuNode::Literal { value } => value.clone(),
        IcuNode::Argument { value } => values
            .get(value)
            .map_or_else(|| format!("{{{value}}}"), display_value),
        IcuNode::Number { value, style } => values.get(value).map_or_else(
            || format!("{{{value}}}"),
            |message_value| {
                host.format_number(value, message_value, style.as_deref(), values)
                    .unwrap_or_else(|| display_value(message_value))
            },
        ),
        IcuNode::Date { value, style } => values.get(value).map_or_else(
            || format!("{{{value}}}"),
            |message_value| {
                host.format_date(value, message_value, style.as_deref(), values)
                    .unwrap_or_else(|| display_value(message_value))
            },
        ),
        IcuNode::Time { value, style } => values.get(value).map_or_else(
            || format!("{{{value}}}"),
            |message_value| {
                host.format_time(value, message_value, style.as_deref(), values)
                    .unwrap_or_else(|| display_value(message_value))
            },
        ),
        IcuNode::List { value, style } => values.get(value).map_or_else(
            || format!("{{{value}}}"),
            |message_value| {
                host.format_list(value, message_value, style.as_deref(), values)
                    .unwrap_or_else(|| display_value(message_value))
            },
        ),
        IcuNode::Duration { value, style } => values.get(value).map_or_else(
            || format!("{{{value}}}"),
            |message_value| {
                host.format_duration(value, message_value, style.as_deref(), values)
                    .unwrap_or_else(|| display_value(message_value))
            },
        ),
        IcuNode::Ago { value, style } => values.get(value).map_or_else(
            || format!("{{{value}}}"),
            |message_value| {
                host.format_ago(value, message_value, style.as_deref(), values)
                    .unwrap_or_else(|| display_value(message_value))
            },
        ),
        IcuNode::Name { value, style } => values.get(value).map_or_else(
            || format!("{{{value}}}"),
            |message_value| {
                host.format_name(value, message_value, style.as_deref(), values)
                    .unwrap_or_else(|| display_value(message_value))
            },
        ),
        IcuNode::Pound => plural
            .and_then(|context| {
                values
                    .get(context.variable)
                    .and_then(as_number)
                    .map(|value| (context, value))
            })
            .map_or_else(
                || String::from("#"),
                |(context, value)| format_number(value - f64::from(context.offset)),
            ),
        IcuNode::Select { value, options } => {
            let selector = values.get(value).map_or_else(String::new, display_value);
            options
                .get(&selector)
                .or_else(|| options.get("other"))
                .map_or_else(
                    || format!("{{{value}}}"),
                    |option| render_nodes(&option.value, values, host, plural),
                )
        }
        IcuNode::Plural {
            value,
            options,
            offset,
            ..
        } => {
            let Some(count) = values.get(value).and_then(as_number) else {
                return format!("{{{value}}}");
            };
            if let Some(exact_key) = exact_plural_key(count) {
                if let Some(option) = options.get(&exact_key) {
                    return render_nodes(
                        &option.value,
                        values,
                        host,
                        Some(PluralRuntime {
                            variable: value,
                            offset: *offset,
                        }),
                    );
                }
            }

            let adjusted = count - f64::from(*offset);
            let category_index = get_plural_index(host.locale(), adjusted);
            let category = get_plural_categories(host.locale())
                .get(category_index)
                .copied()
                .unwrap_or("other");
            options
                .get(category)
                .or_else(|| options.get("other"))
                .map_or_else(
                    || format!("{{{value}}}"),
                    |option| {
                        render_nodes(
                            &option.value,
                            values,
                            host,
                            Some(PluralRuntime {
                                variable: value,
                                offset: *offset,
                            }),
                        )
                    },
                )
        }
        IcuNode::Tag { value, children } => {
            let child_text = render_nodes(children, values, host, plural);
            host.render_tag(value, &child_text, values)
                .unwrap_or(child_text)
        }
    }
}

fn display_value(value: &MessageValue) -> String {
    match value {
        MessageValue::String(value) => value.clone(),
        MessageValue::Number(value) => format_number(*value),
        MessageValue::Bool(value) => value.to_string(),
        MessageValue::List(values) => values
            .iter()
            .map(display_value)
            .collect::<Vec<_>>()
            .join(", "),
        MessageValue::Tag(_) => String::new(),
    }
}

fn format_number(value: f64) -> String {
    if value.fract() == 0.0 {
        format!("{value:.0}")
    } else {
        value.to_string()
    }
}

fn as_number(value: &MessageValue) -> Option<f64> {
    match value {
        MessageValue::Number(value) => Some(*value),
        _ => None,
    }
}

fn exact_plural_key(value: f64) -> Option<String> {
    if value.fract() == 0.0 {
        Some(format!("={value:.0}"))
    } else {
        None
    }
}

fn extract_plural_variable(msgid: &str, plural_source: Option<&str>) -> Option<String> {
    plural_source
        .and_then(find_braced_identifier)
        .or_else(|| find_braced_identifier(msgid))
}

fn find_braced_identifier(input: &str) -> Option<String> {
    let start = input.find('{')?;
    let end = input[start + 1..].find('}')? + start + 1;
    let candidate = input[start + 1..end].trim();
    if candidate.is_empty() {
        None
    } else {
        Some(candidate.to_owned())
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;
    use std::sync::Arc;

    use super::{
        compile_catalog, compile_icu, CompileCatalogOptions, CompileIcuOptions, CompiledCatalog,
        FormatHost, MessageValue, MessageValues,
    };
    use crate::catalog::{Catalog, CatalogEntry, CatalogTranslation};

    fn values(entries: &[(&str, MessageValue)]) -> MessageValues {
        entries
            .iter()
            .map(|(key, value)| ((*key).to_owned(), value.clone()))
            .collect()
    }

    #[test]
    fn compile_icu_formats_literals_arguments_and_plurals() {
        let compiled = compile_icu(
            "Hello {name}! {count, plural, one {# item} other {# items}}",
            &CompileIcuOptions::new("en"),
        )
        .expect("should compile");

        let rendered = compiled.format(&values(&[
            ("name", MessageValue::from("World")),
            ("count", MessageValue::from(5usize)),
        ]));
        assert_eq!(rendered, "Hello World! 5 items");
    }

    #[test]
    fn compile_icu_handles_select_and_tags() {
        let compiled = compile_icu(
            "{gender, select, male {He} other {<b>They</b>}}",
            &CompileIcuOptions::new("en"),
        )
        .expect("should compile");

        let rendered = compiled.format(&values(&[
            ("gender", MessageValue::from("other")),
            (
                "b",
                MessageValue::Tag(Arc::new(|text: &str| format!("[{text}]"))),
            ),
        ]));
        assert_eq!(rendered, "[They]");
    }

    #[test]
    fn compile_icu_supports_custom_host_formatters_and_locale() {
        struct TestHost;

        impl FormatHost for TestHost {
            fn locale(&self) -> &str {
                "pl"
            }

            fn format_number(
                &self,
                _name: &str,
                value: &MessageValue,
                _style: Option<&str>,
                _values: &MessageValues,
            ) -> Option<String> {
                match value {
                    MessageValue::Number(number) => Some(format!("n={number:.1}")),
                    _ => None,
                }
            }

            fn render_tag(
                &self,
                _name: &str,
                children: &str,
                _values: &MessageValues,
            ) -> Option<String> {
                Some(format!("<{children}>"))
            }
        }

        let compiled = compile_icu(
            "{count, plural, one {<b>{count, number}</b> file} few {<b>{count, number}</b> files} other {<b>{count, number}</b> files}}",
            &CompileIcuOptions::new("en"),
        )
        .expect("should compile");

        let rendered =
            compiled.format_with_host(&values(&[("count", MessageValue::from(2usize))]), &TestHost);

        assert_eq!(rendered, "<n=2.0> files");
    }

    #[test]
    fn compile_icu_falls_back_when_not_strict() {
        let compiled = compile_icu(
            "{invalid",
            &CompileIcuOptions {
                locale: String::from("en"),
                strict: false,
            },
        )
        .expect("should fall back");

        assert_eq!(compiled.format(&MessageValues::new()), "{invalid");
    }

    #[test]
    fn compile_catalog_formats_messages_and_uses_keys() {
        let catalog = Catalog::from([(
            String::from("Hello {name}!"),
            CatalogEntry {
                translation: Some(CatalogTranslation::Singular(String::from("Hallo {name}!"))),
                ..CatalogEntry::default()
            },
        )]);

        let compiled = compile_catalog(&catalog, &CompileCatalogOptions::new("de"))
            .expect("catalog should compile");
        let key = compiled
            .keys()
            .into_iter()
            .next()
            .expect("key should exist");
        assert_eq!(
            compiled.format(&key, &values(&[("name", MessageValue::from("Sebastian"))])),
            "Hallo Sebastian!"
        );
    }

    #[test]
    fn compile_catalog_handles_gettext_plural_arrays() {
        let catalog = Catalog::from([(
            String::from("{count} item"),
            CatalogEntry {
                translation: Some(CatalogTranslation::Plural(vec![
                    String::from("{count} Artikel"),
                    String::from("{count} Artikel"),
                ])),
                plural_source: Some(String::from("{count} items")),
                ..CatalogEntry::default()
            },
        )]);

        let compiled = compile_catalog(&catalog, &CompileCatalogOptions::new("de"))
            .expect("catalog should compile");
        let key = compiled
            .keys()
            .into_iter()
            .next()
            .expect("key should exist");

        assert_eq!(
            compiled.format(&key, &values(&[("count", MessageValue::from(1usize))])),
            "1 Artikel"
        );
        assert_eq!(
            compiled.format(&key, &values(&[("count", MessageValue::from(5usize))])),
            "5 Artikel"
        );
    }

    #[test]
    fn compiled_catalog_returns_key_for_missing_messages() {
        let compiled = CompiledCatalog {
            messages: BTreeMap::new(),
            locale: String::from("de"),
        };
        assert_eq!(compiled.format("missing", &MessageValues::new()), "missing");
    }
}
