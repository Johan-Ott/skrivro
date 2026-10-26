# Skrivro

- Spec: https://claude.ai/artifact/X69SvjmxRQrtJjVszL9Qsn
- Design: https://claude.ai/artifact/L7PB4FUJKpiCT2wjDWzepd
- Short summary: docs/spec.md

Local-first writing app for novelists. Tauri 2, TypeScript, React, ProseMirror.
No server, no accounts, no AI. Text lives as plain files in a folder the user picks.

Code rules: @.claude/rules/code-quality.md

Run `npm run check` before saying a task is done. A Stop hook runs it too and blocks once if it fails.

## Layout

- `src/manuscript/`: scene files. Markdown is read into ProseMirror and written back; every
  block keeps the text it was read from, so untouched blocks are saved byte for byte.
- `src/storage/`: everything that touches disk goes through the `FileSystem` interface
  (`nodeFileSystem` in tests, `tauriFileSystem` in the app, `memoryFileSystem` in a browser).
- `src/project/`: project.json and the tree (parts, chapters, scenes, folders, sorts). Tree edits
  are pure functions in `tree.ts`. A scene node has no title: the title lives in the scene file's
  front matter, so moving a scene changes project.json only. A chapter (or a loose scene) can hold
  `summary` and `when` for Innehåll. The sorts Personer, Platser, Saker, Övrigt (ids `karaktarer`,
  `platser`, `saker`, `anteckningar`) and Papperskorg (`trash`) always exist.
- `src/editor/`: ProseMirror commands, keys, Swedish typography, search panel, focus and
  typewriter plugins. Writing settings (`writingSettings.ts`) are per writer, kept in the
  webview's localStorage until the Inställningar screen exists. Typography applies everywhere;
  focus dimming and typewriter only in the focus mode (Ctrl+Shift+F, Esc leaves).
- `src/app/`: React. Logic sits in plain modules (`sceneSession.ts`); hooks and components
  only hold React state. `platform.ts` picks Tauri or the in-browser example project.
- `src/app/Menu.tsx` is the only menu: right-click, the add button and the style picker. Tree menu
  contents come from `tree/treeMenus.ts`. The command palette (Ctrl+K) lives in `app/palette/`;
  new commands go in `paletteEntries.ts`.
- The editor is read-only whenever no scene is open, so text can never be typed into nowhere.
- Start: `useStartup` reopens the last project if its folder still exists; otherwise the
  onboarding runs the first time (`app/onboarding/`) and the bookshelf (`app/shelf/`) after
  that. App preferences (onboarding done, the Skrivro library folder, last project, projects
  opened from elsewhere) live in localStorage (`appPreferences.ts`). New projects are made in
  the library folder by `project/newProject.ts`.
- The shelf shows every `.skrivro` folder in the library plus `knownProjects`. Book status and
  progress come from the scenes' `status` in front matter (`project/shelf.ts`). A folder that
  is gone shows as "Hittas inte"; Skrivro never deletes it, only forgets it on request.
- Sync copies, crash temp files and iCloud placeholders are found when a project is read
  (`storage/syncFiles.ts`, `atomicWrite.ts`) and settled in `app/syncRepairs.ts`. What the
  writer chooses away goes to the project's `trash/` folder, never deleted. Crash text is settled
  in a dialog before any scene opens, because the next save would write over the temp file.
  A book folder kept in iCloud Drive, OneDrive or Dropbox is the way to sync without an account,
  named in Inställningar, Synk; docs/synk.md describes both ways a writer has.
- Google Drive sync (Inställningar, Synk): the open book and its series sync with
  `Skrivro/<folder>` in the writer's Drive when the book opens and every five minutes
  (`app/useDriveSync.ts`, engine in `sync/driveSync.ts`, Drive's web API in `sync/googleDrive.ts`).
  Scope `drive.file`: Skrivro sees only files it made. A text changed on both sides is kept twice
  ("(Drive date)" copy, never uploaded); project.json is merged instead (`sync/mergeProject.ts`).
  A file removed on one side goes to Drive's trash or the book's `trash/` on the other. Before
  Drive's text replaces a scene, the old text becomes a version in Versioner (`sync/localSide.ts`).
  Sign-in is `platform.googleSignIn`: on Android Google Play hands out access keys
  (`src-tauri/android/GoogleSignInPlugin.kt` via `google_access_token` in `src-tauri/src/google.rs`);
  on a computer Google's page opens in the browser and answers to `127.0.0.1`, and the lasting key
  is kept in the system's password store (`app/tauriGoogleSignIn.ts`, `sync/googleAuth.ts`).
- Words per day live in `stats/<device>.json` as `{ "2026-10-02": 812 }`, one file per device so
  synced devices never write the same file; reading adds them up with the older `stats.json`
  (`project/stats.ts`). The device name is made once and kept in localStorage.
  Each scene save adds what it changed (`onSaved` in `sceneSession.ts`), so moving or trashing
  scenes never counts as writing. The daily goal is `dailyGoal` in project.json.
- Footnotes are Markdown footnotes: `[^1]` in the text, `[^1]: Text.` at the end of the scene file
  (`manuscript/footnotes.ts`). In the editor a footnote is an inline atom holding its plain text;
  CSS numbers them. Ctrl+Alt+F, the palette or the selection bar inserts one
  (`editor/footnoteEditing.ts`, `app/FootnotePopover.tsx`). Export: Word footnotes, EPUB notes
  per scene, Typst `#footnote`.
- Error report: `app/errorLog.ts` keeps the latest 20 errors of the session in memory (failed saves,
  sync errors, uncaught errors). Om Skrivro copies a report to the clipboard; nothing is sent.
- Search (Ctrl+F) covers the whole manuscript by default ("Hela manuset"). Other scenes are
  searched with the same prosemirror-search plugin as the editor (`editor/manuscriptSearch.ts`),
  so counts match. "Alla" writes every scene file and can be undone while no one wrote in them
  since (`app/manuscriptReplace.ts`, `app/useManuscriptSearch.ts`).
- Snapshots are copies of the scene file in `snapshots/<scene id>/2026-10-02T14-03.md`, marked
  `snapshot: automatisk|manuell` (`project/snapshots.ts`). An automatic one keeps the text from
  before a save when the scene had none, or when the text moved 100+ words from the last one.
  Restoring snapshots the current text first (`app/snapshotActions.ts`).
- Inställningar (Ctrl+, or the palette) lives in `app/settings/`. Writing settings (theme,
  font, spellcheck, Swedish typography) are in `skrivro.writing`; author name, default daily goal
  and automatic snapshots in `skrivro.app`. Editor switches are read through refs on every
  update (`useEditorView`), so changing them needs no new editor state.
- Views of a project (Skriv, Innehåll, Publicera; G S / G I / G P) are listed in `VIEWS` in
  `useWritingMode.ts`. The writing area stays mounted but hidden in other views, so the editor
  keeps its scene and undo. Framsteg is a popover from the top bar; its numbers are pure functions in `project/progress.ts`; the
  goals (`dailyGoal`, `totalGoal`, `deadline`) live in project.json, written by `updateFields`.
- Export lives in `src/export/`: `book.ts` reads the manuscript in order (`bookOutline`) and every
  scene before anything is written; `standardManuscript.ts` builds the DOCX with `docx` (npm), as
  the spec decided. `platform.saveFile` asks where and writes the file whole (a download in the
  browser). An `ExportError` names the scene and the reason; nothing is saved then.
- EPUB is our own generator (`export/epub.ts` + `xhtml.ts`, zipped with jszip): mimetype first and
  uncompressed, a page per part and chapter, nav.xhtml, and a typographic SVG cover until the
  writer picks a picture (`cover.jpg`/`cover.png` in the project folder, `project/cover.ts`; an
  older picture goes to trash/). The book id (ISBN, else `bookId` in project.json) stays between exports.
  Check an exported book with W3C epubcheck (needs Java): `java -jar epubcheck.jar bok.epub`.
- Print PDF and Publicera's preview use Typst as WebAssembly in the web view (a decided change from the
  spec's Rust, see docs/spec.md), so the preview and the PDF come from one compilation path.
  `export/typstText.ts` turns scenes into Typst markup (every code character escaped),
  `typstTemplate.ts` holds the three themes (Klassisk, Modern, Luftig: headings and margins), the
  running head and folio and the anfang, which Typst measures to sink two lines into the text
  (the paragraph is passed as a list of words). `typstBook.ts` puts the book together and
  `typstCompile.ts` runs Typst with assets passed in: fetched in the app (`app/typstAssets.ts`),
  read from disk in tests. Fonts are static TTFs in `public/fonts` with their OFL licences; Typst
  never loads fonts from the internet. The design lives in project.json `design` (`bookDesign.ts`).
  The pages around the story are in `export/bookParts.ts`: cover, title, copyright and dedication
  before, thanks and about the author after. Their texts are `dedication`, `thanks` and
  `aboutAuthor` in project.json, written in Publicera's Bokuppgifter when the part is ticked.
- Import lives in `src/import/`, used by onboarding's Importera. Every format becomes Markdown and
  then a book (`ImportedNode[]`, `markdownImport.ts`): with two heading levels the top is parts and
  the next chapters, deeper headings name scenes, and `***` splits scenes. DOCX goes through
  mammoth's HTML (`docxImport.ts`); Scrivener is picked by its .scrivx, whose binder's draft gives
  the tree and each text's RTF (`scrivenerImport.ts`, `rtf.ts`). `paragraphs.ts` writes the text
  with the editor's own serializer, so escaping matches a saved scene. `createProject` takes the book.
- Notes are ordinary scene files in sorts (tree nodes of kind `sort`), shown under Anteckningar in
  the sidebar (`app/notes/`; a decided change from the spec's entities.json, see docs/spec.md).
  The title is the name. A note's name is linked in the text unless its front matter says
  `link: false`; in Övrigt only when it says `link: true` (`cards.ts`). The writer can add own
  sorts in Ny anteckning. Mentions are counted from the manuscript text, never stored; a note's
  page shows them under Nämns i. Connections ("Elin, brorsdotter") are project.json `connections`.
  Older projects' Karaktärer, Tidslinje and Research folders become sorts when they are read.
- Pack notes (`src/packs/*/notes`) are read by `noteOf`: `sort:` and `standard: true` in the front
  matter, other lines ignored. `src/packs/grund` is the free basics: in every book, never listed or
  bought (`basics()` in `packs.ts`). A new note in a sort starts as that sort's `standard` template
  (`standardNoteBody`), the chip Enkel. A template question is `**Label:**`, a blank line and
  `<!-- the question -->` on its own line. In a note (`parseMarkdown(text, { isNote })`, told by
  `session.isNote`), never in a scene, a one-line comment right under such a label is read as
  an empty paragraph with a `prompt` attribute (`manuscript/prompts.ts`), shown as grey hint text
  (`editor/promptHints.ts`), saved as the comment until the writer answers, and counted as no words,
  nor the label above it. A note beside the text (`app/beside/`) is read with `isNote` off, so an
  unanswered question shows there as a raw comment.
- A series is a folder beside its books (`Vintervägen.serie`), built like a project but holding
  only sorts (`project/series.ts`). A book names it in project.json `series` (the folder name),
  and `useSeries` reads, watches and writes it beside the book. Notes live in "homes": the series
  first, then the book (`notes/noteHomes.ts`); the sidebar shows the series' sorts and the book's
  own only when they hold notes. Moving notes into a series renames their files there
  (`moveNotesToSeries`), so nothing is copied or deleted; an open note is closed first.
- Names of notes are underlined in the open scene by a decoration plugin (`editor/mentions.ts`);
  nothing is written into the scene file. The editor only gets `{ id, pattern }` pairs from
  `useMentionLinks`; a click shows `MentionCard`.
- The shell (`app/shell/`): the top bar (menu, sidebar, back and forward, Skriv or Publicera, the
  day's words that open Framsteg, search, focus), the sidebar beside a white card, and Publicera in
  their place. Innehåll lists chapters with what happens, when and status; Tidsordning is the
  order the writer drags them into (project.json `timeOrder`).
- `src/thisComputer.ts` says whether this is a Mac, from the user agent, so the browser version
  follows the same code. Three places ask: the window has no frame on Windows and draws Skrivro's
  own buttons in the top bar (`shell/WindowControls.tsx`), while a Mac keeps its frame with
  `TitleBarStyle::Overlay` and a hidden title and its own buttons sit over the top left, which
  `main.tsx` leaves room for with a `mac` class on the page. Shortcut labels follow the computer
  (`shortcuts.ts`): Ctrl+Shift+F on Windows, ⇧⌘F on a Mac, the keys being the same ones.
  And `storage/saveError.ts` reads `(os error N)` by the system that numbered it, since a Mac
  numbers io errors by errno and Windows does not.
- Granskning (`app/review/`) works on the open scene only, as the spec says of visible text:
  repeated words (`manuscript/review.ts`, dots via `editor/repetitionMarks.ts`, sentences counted
  across paragraphs, names and small common words left out) and names one or two letters from a
  card title. "Ändra alla" replaces in the whole manuscript through the search's replace, so Ångra
  undoes it in one step; "Ignorera" keeps the word in `ignoredNames` in project.json.
- Comments live in `comments/<scene id>.json` in the spec's shape (`project/comments.ts`), anchored
  by quote, prefix and suffix and found again with `locate`, so they survive edits; a reply is a
  comment with `replyTo` (our addition). Ctrl+Shift+M on a selection starts one; they show in the
  review panel (`app/review/`), which appears when Granskning is on or the scene has comments.
  `useComments` lives in the app state, so the selection bar (`SelectionBar.tsx`: bold, italic,
  style, comment) reaches it too. Right-click keeps the system menu for its spelling suggestions.
- The book's language is `language` in project.json (`project/bookLanguage.ts`, Swedish by
  default): spellcheck, the EPUB's and the DOCX's language, the export's starting quote style and
  the fixed words both formats print (`export/bookWords.ts`: Kapitel, Innehåll, "ca … ord").
  A new language is one entry in `BOOK_LANGUAGES` and one in `bookWords.ts`. WebView2 takes its dictionary from `--lang` when
  the window starts, not from the page's `lang`, so Rust creates the window (`main.rs`, the config
  window has `create: false`) with the language in `spell-language.txt` in the app config folder.
  `set_spell_language` saves a new one and restarts; `useSpellLanguage` calls it as a book opens.
- project.json carries `formatVersion` (`FORMAT_VERSION` in `projectFile.ts`, now 1), stamped on
  every write. A newer one opens read-only (`project.isReadOnly`): no project.json writes, no new
  scenes, the editor not editable. When format 2 comes, add its migration step in `readProjectFile`.
- The top bar shows today's words against the daily goal. The reminder (`reminder.ts`)
  sends a local notice after the chosen hour when nothing is written; it needs Skrivro open.
- Publicera's export reports progress per chapter while scenes are read (`bookMaterial` onProgress);
  Avbryt bumps the run number so an old run's file is never saved.
- The phone (`app/phone/`, `styles/phone.css`) follows the mobile design with screens of its own:
  Bokhylla, Boken, a sort's notes and Skriv, stacked in the browser history so Android's back
  button works. `usePhone` (width at most 600 px) picks it; the desktop window is never that
  narrow. On a phone the books live in Skrivro's own folder (`appDataDir`), and the Rust side
  (`src-tauri/src/lib.rs`) leaves out updates, the spelling language and picked folders.
- Layout lives in `styles/shell.css`. Granska opens from the chip at the card's corner; under
  1200 px it covers the text. Under 960 px the sidebar starts hidden and floats over the card when
  shown (Ctrl+. or the sidebar button; `isSidebarOpen` in `useWritingMode`). The smallest window
  is 720 × 500.
- Läs (view `las`, `contents/ReadView.tsx`) shows a chapter or the whole book in a row, drawn
  read-only with the editor's own schema; a click opens that scene in Skriv at the paragraph
  (`cursorAtBlock`). Dela scenen (Ctrl+Shift+Enter) moves the text after the cursor to a new
  scene after it; Slå ihop med nästa scen takes the next scene's text in and moves that scene to
  Papperskorg (`sceneSplitActions.ts`, `editor/sceneSplit.ts`).
- The top bar has no formatting buttons: bold, italic and style are on the selection bar, a scene
  break is typed as `***` on an empty line (an input rule in `editorState.ts`) or Ctrl+Enter.
- Editor switches (typewriter, typography, spellcheck, mentions, repetitions, comments) are one
  object, `editor.modes.current`, read by ProseMirror on every update.
- Tauri may read and write under $HOME and $DOCUMENT without a dialog (capabilities), and
  `tauri-plugin-persisted-scope` keeps folders picked in the dialog across restarts.
- `npm run icons` rebuilds every icon from the logo `src-tauri/icons/icon-source.png`: desktop,
  Android launcher (`src-tauri/icons/android`, copied in by `build:android`) and
  `src/assets/skrivro-logo.png` for the logo inside the app.
- `src-tauri/`: plugin setup only. Permissions are in `capabilities/default.json`.
- The webview has a strict CSP (`app.security.csp` in tauri.conf.json): only Skrivro's own files, plus
  `'wasm-unsafe-eval'` for Typst and inline styles for React. A new kind of resource (an outside
  URL, a worker) needs a line there. `style-src` is left without Tauri's nonces, or the browser
  would ignore `'unsafe-inline'`.
- Heavy modules load on first use, not at start: Word export and import, EPUB, zip and Typst
  (`await import(...)` in `useExport.ts`, `importManuscript.ts`, `typstAssets.ts`). Keep it so.

## Running

- `npm run dev` starts the Tauri window. Johan runs it; Claude starts only Skrivro Test (below),
  never the real app.
- `npm run app:test` starts Skrivro Test: the real app with identifier `se.skrivro.test`
  (`src-tauri/tauri.test.conf.json`), so its books, backups, settings and Google sign-in are its
  own, under `%APPDATA%\se.skrivro.test` on Windows and `~/Library/Application Support`,
  `~/Library/Caches` and `~/Library/WebKit` on macOS. Its WebView listens on port 9333;
  `node scripts/drive-app.mjs steps.mjs` runs steps in it. File dialogs and questions take their
  answers from `window.skrivroTest` (`app/testMode.ts`), since no test can click a system dialog.
- `node scripts/skrivro.mjs [--app] <call> [args]` makes one call to `window.skrivro` (`app/remote.ts`)
  in Skrivro Test, or with `--app` in the real Skrivro once Inställningar, "Styr Skrivro från den här
  datorn" is on (port 9334, `src-tauri/src/remote.rs`; see docs/styrning.md): `state`, `tree`, `commands`, `run <command>`, `open <id>`, `text`, `type <text>`,
  `add <kind> [title] [afterId]`, `note <sort> <name>`, `rename <id> <title>`,
  `set <id> vad|när|pov <text>`, `status <id> <status>`, `move <id> <afterId>`, `trash <id>`,
  `read <id>` (`app/remoteBook.ts`).
  It goes through the app's own palette commands and editor, so it writes as a hand would.
- The phone the same way: start the emulator (Medium_Phone_API_36.1), `npm run build:android --
--emulator` puts a debug build in it, and `node scripts/drive-app.mjs --android steps.mjs`
  drives it through adb. It is the normal app, since the emulator holds no real books.
- `e2e/roller/`: whole sessions as the people Skrivro is for (a novelist on her phone, a planner,
  the editor's round in Word, the print, a move from Word). They go through the screen as a
  person would and run with `npm run test:ui`; a step that fails is often a real finding.
- `npm run test:ui`: Playwright flows in `e2e/` against `dev:web` (the example project in memory):
  writing, footnotes, palette, search, focus mode, export, the tree and the phone screens. Not part
  of `npm run check`; run it before a release or after changing the interface.
- `npm run dev:web` serves the same app in a browser against the example project in memory.
  Start it with `--host 127.0.0.1` for Claude's browser pane, which can not reach `::1`.
- ProseMirror reads a click's selection on the next turn of the event loop. A test that types at
  once after a click can land its text at the start of the document: wait ~50 ms
  (`settleSelection` in `e2e/helpers.ts`).
- Typing tests in the browser pane: the pane's `type` action pastes whole strings, so input
  rules (typography) only fire with `document.execCommand("insertText")` one character at a time.
- Stopping a background `npx vite` leaves its node process on port 1420; stop that process too,
  or the next server serves stale modules.

## Building

- `npm run build:windows`: the Windows installer in `out/` (no update files, no signing key).
- `npm run build:android`: `out/Skrivro.apk` for arm64 phones, signed with Android's test key so it
  installs from a file. The SDK and NDK come from `ANDROID_HOME`, else from Android Studio's own
  folder (`%LOCALAPPDATA%\Android\Sdk`, on macOS `~/Library/Android/sdk`), and it makes
  `src-tauri/gen/android` the first time (gen is not committed). Our own Kotlin files in
  `src-tauri/android/` are copied in on every build, and the Google Play sign-in library is added
  to its Gradle file. `MainActivity.kt` puts Skrivro in the background on back from the shelf,
  since Tauri hangs on its splash if Android closes the window and reopens it.
- The computer's Google sign-in needs the Desktop client's secret as `VITE_GOOGLE_COMPUTER_SECRET`
  in `.env.local` (ignored by git; the release build takes it from a GitHub secret of that name).
  Without it, Koppla Drive says the key is missing. Android needs no secret: Google knows the app by
  `se.skrivro.app` and the SHA-1 of the signing key, which today is Android's test key.
- The Windows installer installs for the current user (no admin prompt), in Swedish or English
  after Windows. Uninstalling removes the Google sign-in from Credential Manager
  (`src-tauri/windows/hooks.nsh`) and offers to remove the app's data; the books are never touched.
  On Android `hasFragileUserData` makes uninstalling ask whether to keep the books.
- `npm run build:check`: the full check, then the desktop app without installers.

## Releasing

- `npm run version -- 1.0.3` sets the version in package.json, tauri.conf.json and Cargo.toml.
  Commit, tag `v1.0.3` and push: `.github/workflows/release.yml` builds Windows with
  `tauri.release.conf.json` (bundling and updater files on) into a draft GitHub release. The
  matrix has no macOS runner: an unsigned Mac app does not open, so macOS waits for an Apple
  Developer account (docs/release.md).
- Publishing the draft makes its `latest.json` the newest; the app asks for it once at start
  (`UpdateNotice.tsx`) and offers to restart into the new version. Updates are signed: the public
  key is in tauri.conf.json, the private key is `~/.tauri/penna-updater.key` on Johan's computer
  and the GitHub secret `TAURI_SIGNING_PRIVATE_KEY`. Losing it means users must reinstall once.

## Interface language

- Every interface text goes through `t()` (`src/i18n/i18n.ts`) with the Swedish text as the key:
  `t("Ny scen")`, `t("{count} ord", { count })`. English lives in `src/i18n/en.json`. A test reads
  every `t("…")` in src and fails on a missing or unused English entry. ESLint allows `t` as a
  short name (id-length exceptions) for this.
- The language is set by `src/i18n/startLanguage.ts`, imported first in main.tsx, so lists made
  when modules load are translated too. Changing it in Inställningar saves and reloads.
- Book text is not interface text: exports use the book's language (`export/bookWords.ts`), and
  the fixed tree folders keep their Swedish titles in project.json but show translated.
