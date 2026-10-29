//! Typst's compiler, which sets the book as printed: 28 MB that the app does not carry. It is
//! fetched once, at the version Skrivro is built with, and kept in Skrivro's own folder. The
//! Store build carries it instead and never asks for it here.

use crate::spelling::fetch_bytes;
use tauri::{ipc::Response, AppHandle, Manager};

const PACKAGE: &str = "@myriaddreamin/typst-ts-web-compiler@0.7.0";
const FILE: &str = "pkg/typst_ts_web_compiler_bg.wasm";

async fn compiler(app: &AppHandle) -> Result<Vec<u8>, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("typst");
    let path = dir.join("typst_ts_web_compiler_bg-0.7.0.wasm");
    if let Ok(bytes) = std::fs::read(&path) {
        return Ok(bytes);
    }
    let bytes = fetch_bytes(PACKAGE, FILE).await?;
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    // Written beside first and then moved, so a fetch cut off halfway is never taken for whole.
    let part = path.with_extension("part");
    std::fs::write(&part, &bytes).map_err(|error| error.to_string())?;
    std::fs::rename(&part, &path).map_err(|error| error.to_string())?;
    Ok(bytes)
}

/// The compiler's bytes, fetched first if they are not here yet.
#[tauri::command]
pub async fn typst_compiler(app: AppHandle) -> Result<Response, String> {
    Ok(Response::new(compiler(&app).await?))
}

/// Fetches the compiler now, as the first start does, so it is here when a book is set.
#[tauri::command]
pub async fn prepare_typst(app: AppHandle) -> Result<(), String> {
    compiler(&app).await.map(|_| ())
}

/// What Skrivro has fetched so far: the dictionaries' languages, and whether the compiler is here.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Fetched {
    dictionaries: Vec<String>,
    has_typst: bool,
}

#[tauri::command]
pub fn fetched_parts(app: AppHandle) -> Result<Fetched, String> {
    let data = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let dictionaries = std::fs::read_dir(data.join("ordlistor"))
        .map(|entries| {
            entries
                .filter_map(|entry| entry.ok()?.file_name().into_string().ok())
                .filter_map(|name| name.strip_suffix(".dic").map(str::to_string))
                .collect()
        })
        .unwrap_or_default();
    let has_typst = data
        .join("typst")
        .join("typst_ts_web_compiler_bg-0.7.0.wasm")
        .exists();
    Ok(Fetched {
        dictionaries,
        has_typst,
    })
}
