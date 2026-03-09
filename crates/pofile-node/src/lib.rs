use std::collections::BTreeMap;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex, OnceLock};

use napi::bindgen_prelude::Result;
use napi::Error;
use napi_derive::napi;
use pofile::{
    compile_catalog, compile_icu, parse_po, stringify_po, Catalog, CatalogEntry,
    CatalogTranslation, CompileCatalogOptions, CompileIcuOptions, CompiledCatalog, CompiledMessage,
    MessageValue, MessageValues, PoFile, PoItem, SerializeOptions,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize)]
struct JsPoFile {
    comments: Vec<String>,
    #[serde(rename = "extractedComments")]
    extracted_comments: Vec<String>,
    headers: BTreeMap<String, String>,
    #[serde(rename = "headerOrder")]
    header_order: Vec<String>,
    items: Vec<JsPoItem>,
}

#[derive(Debug, Serialize)]
struct JsPoItem {
    msgid: String,
    msgctxt: Option<String>,
    references: Vec<String>,
    #[serde(rename = "msgid_plural")]
    msgid_plural: Option<String>,
    msgstr: Vec<String>,
    comments: Vec<String>,
    #[serde(rename = "extractedComments")]
    extracted_comments: Vec<String>,
    flags: BTreeMap<String, bool>,
    metadata: BTreeMap<String, String>,
    obsolete: bool,
    nplurals: usize,
}

#[derive(Debug, Default, Deserialize)]
struct InputPoFile {
    comments: Option<Vec<String>>,
    #[serde(rename = "extractedComments")]
    extracted_comments: Option<Vec<String>>,
    headers: Option<BTreeMap<String, String>>,
    #[serde(rename = "headerOrder")]
    header_order: Option<Vec<String>>,
    items: Option<Vec<InputPoItem>>,
}

#[derive(Debug, Default, Deserialize)]
struct InputPoItem {
    msgid: Option<String>,
    msgctxt: Option<String>,
    references: Option<Vec<String>>,
    #[serde(rename = "msgid_plural")]
    msgid_plural: Option<String>,
    msgstr: Option<Vec<String>>,
    comments: Option<Vec<String>>,
    #[serde(rename = "extractedComments")]
    extracted_comments: Option<Vec<String>>,
    flags: Option<BTreeMap<String, bool>>,
    metadata: Option<BTreeMap<String, String>>,
    obsolete: Option<bool>,
    nplurals: Option<usize>,
}

#[derive(Debug, Default, Deserialize)]
struct InputSerializeOptions {
    #[serde(rename = "foldLength")]
    fold_length: Option<usize>,
    #[serde(rename = "compactMultiline")]
    compact_multiline: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct InputCompileIcuOptions {
    locale: String,
    strict: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct InputCompileCatalogOptions {
    locale: String,
    #[serde(rename = "useMessageId")]
    use_message_id: Option<bool>,
    strict: Option<bool>,
}

#[derive(Debug, Default, Deserialize)]
struct InputCatalogEntry {
    translation: Option<InputCatalogTranslation>,
    #[serde(rename = "pluralSource")]
    plural_source: Option<String>,
    context: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum InputCatalogTranslation {
    Singular(String),
    Plural(Vec<String>),
}

type InputCatalog = BTreeMap<String, InputCatalogEntry>;

struct Registry<T> {
    next_id: AtomicU32,
    values: Mutex<BTreeMap<u32, Arc<T>>>,
}

impl<T> Registry<T> {
    fn new() -> Self {
        Self {
            next_id: AtomicU32::new(1),
            values: Mutex::new(BTreeMap::new()),
        }
    }

    fn insert(&self, value: T) -> u32 {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let mut values = self.values.lock().expect("registry mutex poisoned");
        values.insert(id, Arc::new(value));
        id
    }

    fn get(&self, id: u32) -> Option<Arc<T>> {
        let values = self.values.lock().expect("registry mutex poisoned");
        values.get(&id).cloned()
    }

    fn remove(&self, id: u32) {
        let mut values = self.values.lock().expect("registry mutex poisoned");
        values.remove(&id);
    }
}

fn compiled_message_registry() -> &'static Registry<CompiledMessage> {
    static REGISTRY: OnceLock<Registry<CompiledMessage>> = OnceLock::new();
    REGISTRY.get_or_init(Registry::new)
}

fn compiled_catalog_registry() -> &'static Registry<CompiledCatalog> {
    static REGISTRY: OnceLock<Registry<CompiledCatalog>> = OnceLock::new();
    REGISTRY.get_or_init(Registry::new)
}

impl From<PoFile> for JsPoFile {
    fn from(value: PoFile) -> Self {
        Self {
            comments: value.comments,
            extracted_comments: value.extracted_comments,
            headers: value.headers,
            header_order: value.header_order,
            items: value.items.into_iter().map(JsPoItem::from).collect(),
        }
    }
}

impl From<PoItem> for JsPoItem {
    fn from(value: PoItem) -> Self {
        Self {
            msgid: value.msgid,
            msgctxt: value.msgctxt,
            references: value.references,
            msgid_plural: value.msgid_plural,
            msgstr: value.msgstr,
            comments: value.comments,
            extracted_comments: value.extracted_comments,
            flags: value.flags,
            metadata: value.metadata,
            obsolete: value.obsolete,
            nplurals: value.nplurals,
        }
    }
}

impl From<InputPoFile> for PoFile {
    fn from(value: InputPoFile) -> Self {
        let mut po = PoFile::new();
        po.comments = value.comments.unwrap_or_default();
        po.extracted_comments = value.extracted_comments.unwrap_or_default();
        po.headers = value.headers.unwrap_or_else(|| po.headers.clone());
        po.header_order = value.header_order.unwrap_or_default();
        po.items = value
            .items
            .unwrap_or_default()
            .into_iter()
            .map(PoItem::from)
            .collect();
        po
    }
}

impl From<InputPoItem> for PoItem {
    fn from(value: InputPoItem) -> Self {
        let mut item = PoItem::new(value.nplurals.unwrap_or(2));
        item.msgid = value.msgid.unwrap_or_default();
        item.msgctxt = value.msgctxt;
        item.references = value.references.unwrap_or_default();
        item.msgid_plural = value.msgid_plural;
        item.msgstr = value.msgstr.unwrap_or_default();
        item.comments = value.comments.unwrap_or_default();
        item.extracted_comments = value.extracted_comments.unwrap_or_default();
        item.flags = value.flags.unwrap_or_default();
        item.metadata = value.metadata.unwrap_or_default();
        item.obsolete = value.obsolete.unwrap_or(false);
        item
    }
}

impl From<InputCatalogTranslation> for CatalogTranslation {
    fn from(value: InputCatalogTranslation) -> Self {
        match value {
            InputCatalogTranslation::Singular(text) => Self::Singular(text),
            InputCatalogTranslation::Plural(texts) => Self::Plural(texts),
        }
    }
}

#[napi]
pub fn parse_po_json(input: String) -> Result<String> {
    let po = parse_po(&input);
    serde_json::to_string(&JsPoFile::from(po)).map_err(to_napi_error)
}

#[napi]
pub fn stringify_po_json(input: String, options_json: Option<String>) -> Result<String> {
    let po = serde_json::from_str::<InputPoFile>(&input).map_err(to_napi_error)?;
    let options = options_json
        .as_deref()
        .map(serde_json::from_str::<InputSerializeOptions>)
        .transpose()
        .map_err(to_napi_error)?
        .unwrap_or_default();

    let mut serialize_options = SerializeOptions::default();
    if let Some(fold_length) = options.fold_length {
        serialize_options.fold_length = fold_length;
    }
    if let Some(compact_multiline) = options.compact_multiline {
        serialize_options.compact_multiline = compact_multiline;
    }

    Ok(stringify_po(&PoFile::from(po), serialize_options))
}

#[napi]
pub fn compile_icu_json(message: String, options_json: String) -> Result<u32> {
    let options =
        serde_json::from_str::<InputCompileIcuOptions>(&options_json).map_err(to_napi_error)?;
    let compiled = compile_icu(
        &message,
        &CompileIcuOptions {
            locale: options.locale,
            strict: options.strict.unwrap_or(true),
        },
    )
    .map_err(to_napi_error)?;

    Ok(compiled_message_registry().insert(compiled))
}

#[napi]
pub fn format_compiled_message_json(handle: u32, values_json: Option<String>) -> Result<String> {
    let values = parse_message_values(values_json)?;
    let compiled = compiled_message_registry()
        .get(handle)
        .ok_or_else(|| Error::from_reason(format!("Unknown compiled message handle: {handle}")))?;

    Ok(compiled.format(&values))
}

#[napi]
pub fn free_compiled_message(handle: u32) {
    compiled_message_registry().remove(handle);
}

#[napi]
pub fn compile_catalog_json(catalog_json: String, options_json: String) -> Result<u32> {
    let catalog = serde_json::from_str::<InputCatalog>(&catalog_json).map_err(to_napi_error)?;
    let options =
        serde_json::from_str::<InputCompileCatalogOptions>(&options_json).map_err(to_napi_error)?;
    let compiled = compile_catalog(
        &input_catalog_to_catalog(catalog),
        &CompileCatalogOptions {
            locale: options.locale,
            use_message_id: options.use_message_id.unwrap_or(true),
            strict: options.strict.unwrap_or(false),
        },
    )
    .map_err(to_napi_error)?;

    Ok(compiled_catalog_registry().insert(compiled))
}

#[napi]
pub fn format_compiled_catalog_json(
    handle: u32,
    key: String,
    values_json: Option<String>,
) -> Result<String> {
    let values = parse_message_values(values_json)?;
    let compiled = compiled_catalog_registry()
        .get(handle)
        .ok_or_else(|| Error::from_reason(format!("Unknown compiled catalog handle: {handle}")))?;

    Ok(compiled.format(&key, &values))
}

#[napi]
pub fn compiled_catalog_has(handle: u32, key: String) -> Result<bool> {
    let compiled = compiled_catalog_registry()
        .get(handle)
        .ok_or_else(|| Error::from_reason(format!("Unknown compiled catalog handle: {handle}")))?;

    Ok(compiled.has(&key))
}

#[napi]
pub fn compiled_catalog_keys_json(handle: u32) -> Result<String> {
    let compiled = compiled_catalog_registry()
        .get(handle)
        .ok_or_else(|| Error::from_reason(format!("Unknown compiled catalog handle: {handle}")))?;

    serde_json::to_string(&compiled.keys()).map_err(to_napi_error)
}

#[napi]
pub fn compiled_catalog_size(handle: u32) -> Result<u32> {
    let compiled = compiled_catalog_registry()
        .get(handle)
        .ok_or_else(|| Error::from_reason(format!("Unknown compiled catalog handle: {handle}")))?;

    u32::try_from(compiled.size()).map_err(to_napi_error)
}

#[napi]
pub fn compiled_catalog_locale(handle: u32) -> Result<String> {
    let compiled = compiled_catalog_registry()
        .get(handle)
        .ok_or_else(|| Error::from_reason(format!("Unknown compiled catalog handle: {handle}")))?;

    Ok(compiled.locale.clone())
}

#[napi]
pub fn free_compiled_catalog(handle: u32) {
    compiled_catalog_registry().remove(handle);
}

#[napi]
pub fn binding_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

fn parse_message_values(values_json: Option<String>) -> Result<MessageValues> {
    let Some(values_json) = values_json else {
        return Ok(MessageValues::new());
    };

    let raw = serde_json::from_str::<Value>(&values_json).map_err(to_napi_error)?;
    let Value::Object(map) = raw else {
        return Err(Error::from_reason(String::from(
            "Expected JSON object for message values",
        )));
    };

    map.into_iter()
        .map(|(key, value)| match json_to_message_value(value) {
            Some(value) => Ok((key, value)),
            None => Err(Error::from_reason(format!(
                "Unsupported message value for key `{key}`"
            ))),
        })
        .collect()
}

fn input_catalog_to_catalog(value: InputCatalog) -> Catalog {
    value
        .into_iter()
        .map(|(key, entry)| {
            (
                key,
                CatalogEntry {
                    translation: entry.translation.map(CatalogTranslation::from),
                    plural_source: entry.plural_source,
                    context: entry.context,
                    ..CatalogEntry::default()
                },
            )
        })
        .collect()
}

fn json_to_message_value(value: Value) -> Option<MessageValue> {
    match value {
        Value::String(value) => Some(MessageValue::String(value)),
        Value::Number(value) => value.as_f64().map(MessageValue::Number),
        Value::Bool(value) => Some(MessageValue::Bool(value)),
        Value::Array(values) => values
            .into_iter()
            .map(json_to_message_value)
            .collect::<Option<Vec<_>>>()
            .map(MessageValue::List),
        Value::Null | Value::Object(_) => None,
    }
}

fn to_napi_error(error: impl std::fmt::Display) -> Error {
    Error::from_reason(error.to_string())
}
