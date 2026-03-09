use std::collections::BTreeMap;

use napi::bindgen_prelude::Result;
use napi::Error;
use napi_derive::napi;
use pofile::{parse_po, stringify_po, PoFile, PoItem, SerializeOptions};
use serde::{Deserialize, Serialize};

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
pub fn binding_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

fn to_napi_error(error: impl std::fmt::Display) -> Error {
    Error::from_reason(error.to_string())
}
