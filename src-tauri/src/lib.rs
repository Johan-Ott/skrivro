mod backups;
mod books;
mod files;
mod google;
#[cfg(desktop)]
mod remote;
#[cfg(mobile)]
mod share;
mod spelling;
mod typst;

use tauri::WebviewWindowBuilder;

#[cfg(desktop)]
const BROWSER_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection";

// The window is made here rather than from tauri.conf.json, so a computer's WebView2 starts
// without Edge's own popups.
fn open_window(app: &tauri::App) -> tauri::Result<()> {
    let config = app.config().app.windows[0].clone();
    let builder = WebviewWindowBuilder::from_config(app.handle(), &config)?;
    #[cfg(desktop)]
    let builder = {
        let args = if remote::take(app.handle()) {
            format!("{BROWSER_ARGS} {}", remote::PORT_ARG)
        } else {
            BROWSER_ARGS.to_string()
        };
        builder.additional_browser_args(&args)
    };
    // Skrivro's top bar is the title bar: Windows draws Skrivro's own buttons in it, and a Mac keeps
    // its own buttons over it, which needs the window's frame left on.
    #[cfg(all(desktop, not(target_os = "macos")))]
    let builder = builder.decorations(false);
    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true);
    // Hidden until the page has drawn its first frame (public/theme.js shows it), so the start is
    // never a white flash; shown anyway after a moment, should the page not get that far.
    #[cfg(desktop)]
    let builder = builder.visible(false);
    let window = builder.build()?;
    #[cfg(desktop)]
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(3));
        let _ = window.show();
    });
    #[cfg(mobile)]
    let _ = window;
    Ok(())
}

// A second start of Skrivro brings the open window forward instead, so two windows never save
// the same book.
#[cfg(desktop)]
fn show_open_window(app: &tauri::AppHandle) {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _, _| {
        show_open_window(app)
    }));
    // The window opens where and as big as it was last closed. Not its visibility: it stays hidden
    // until the first frame (public/theme.js).
    #[cfg(desktop)]
    let builder = builder.plugin(
        tauri_plugin_window_state::Builder::new()
            .with_state_flags(
                tauri_plugin_window_state::StateFlags::SIZE
                    | tauri_plugin_window_state::StateFlags::POSITION
                    | tauri_plugin_window_state::StateFlags::MAXIMIZED,
            )
            .build(),
    );
    let builder = builder
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init());
    // Remembers folders picked in the dialog, so the last project opens after a restart, and
    // takes updates as signed releases on GitHub.
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            spelling::misspelled_words,
            spelling::spelling_suggestions,
            spelling::prepare_dictionary,
            typst::typst_compiler,
            typst::prepare_typst,
            typst::fetched_parts,
            books::remove_book,
            files::write_temp_text,
            files::folder_times,
            files::read_texts,
            files::write_texts,
            backups::remove_backup,
            google::sign_in_in_browser,
            google::saved_google_key,
            google::save_google_key,
            remote::remote_control
        ]);
    #[cfg(mobile)]
    let builder = builder
        .plugin(google::init())
        .plugin(share::init())
        .invoke_handler(tauri::generate_handler![
            spelling::misspelled_words,
            spelling::spelling_suggestions,
            spelling::prepare_dictionary,
            typst::typst_compiler,
            typst::prepare_typst,
            typst::fetched_parts,
            books::remove_book,
            files::write_temp_text,
            files::folder_times,
            files::read_texts,
            files::write_texts,
            backups::remove_backup,
            google::google_access_token,
            share::share_file
        ]);
    builder
        .manage(spelling::Dictionaries::default())
        .setup(|app| Ok(open_window(app)?))
        .run(tauri::generate_context!())
        .expect("error while running Skrivro");
}
