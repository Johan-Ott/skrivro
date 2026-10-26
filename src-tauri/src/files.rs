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

// Only inside a book's or a series' folder, such as Vintervägen.skrivro, so these calls reach no
// further than the books, as the file permissions do.
fn is_in_book(path: &str) -> bool {
    !path.contains("..")
        && path.split(['/', '\\']).any(|part| {
            [".skrivro", ".skrivro.skapas", ".penna", ".serie"]
                .iter()
                .any(|suffix| part.ends_with(suffix))
        })
}

/// Every file in a book's `dir` with its last change in milliseconds since 1970, in one call
/// instead of one per file; empty when the folder is missing.
#[tauri::command]
pub fn folder_times(dir: String) -> Vec<(String, u64)> {
    if !is_in_book(&dir) {
        return Vec::new();
    }
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

/// Many of a book's files in one call; None for one that is missing or outside a book.
#[tauri::command]
pub fn read_texts(paths: Vec<String>) -> Vec<Option<String>> {
    paths
        .iter()
        .map(|path| is_in_book(path).then(|| std::fs::read_to_string(path).ok()).flatten())
        .collect()
}

/// Writes a new book's files in one call, with their folders. The book is made under another
/// name and renamed when whole, so each file needs no temp file of its own.
#[tauri::command]
pub fn write_texts(files: Vec<(String, String)>) -> Result<(), String> {
    for (path, text) in files {
        if !is_in_book(&path) {
            return Err(format!("Utanför en bok: {path}"));
        }
        if let Some(parent) = std::path::Path::new(&path).parent() {
            std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        std::fs::write(&path, text).map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::is_in_book;

    #[test]
    fn reaches_only_into_books() {
        assert!(is_in_book("C:/Users/Elin/Documents/Skrivro/Isen.skrivro/scenes/A.md"));
        assert!(is_in_book("C:/Users/Elin/Documents/Skrivro/Isen.skrivro.skapas/project.json"));
        assert!(is_in_book("C:/Users/Elin/Documents/Skrivro/Isen.serie/scenes/B.md"));
        assert!(!is_in_book("C:/Users/Elin/.ssh/id_ed25519"));
        assert!(!is_in_book("C:/Users/Elin/Isen.skrivro/../../.ssh/id_ed25519"));
    }
}
