//! A temp file is written through to the disk before it is renamed over a book's file, so a
//! power cut right after a save never leaves an empty or half-written file.

use std::io::Write;

/// Writes only Skrivro's own temp files, those ending in ".skrivro-tmp".
#[tauri::command]
pub fn write_temp_text(path: String, text: String) -> Result<(), String> {
    if !path.ends_with(".skrivro-tmp") || path.contains("..") {
        return Err("Det är ingen tillfällig fil från Skrivro".into());
    }
    let mut file = std::fs::File::create(&path).map_err(|error| error.to_string())?;
    file.write_all(text.as_bytes())
        .map_err(|error| error.to_string())?;
    file.sync_all().map_err(|error| error.to_string())
}

/// Every file in `dir` with its last change in milliseconds since 1970, in one call instead of
/// one per file; empty when the folder is missing.
#[tauri::command]
pub fn folder_times(dir: String) -> Vec<(String, u64)> {
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return Vec::new();
    };
    entries
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let changed = entry.metadata().ok()?.modified().ok()?;
            let millis = changed.duration_since(std::time::UNIX_EPOCH).ok()?.as_millis();
            Some((entry.file_name().to_string_lossy().into_owned(), millis as u64))
        })
        .collect()
}
