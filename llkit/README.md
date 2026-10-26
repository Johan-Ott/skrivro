# llkit

What any llstudios app is built on. Skrivro is the first app on it.

- llkit knows nothing of the app: it never imports from `src/`. Lint stops it.
- The app imports it as `@llkit/...`, for example `import { store } from "@llkit/store.js"`.
- Texts: llkit's own are in `llkit/en.json`. An app hands in its English with `addEnglish` before
  anything is shown (Skrivro does it in `src/i18n/i18n.ts`).
- Something belongs here when a second app would want it as it is. Something with books, scenes or
  Skrivro's name in it stays in `src/`.

## In it now

- `store`, `useRootClass`, `tooltips`, `errorLog`, `thisComputer`, `i18n`
- `controls` (Row, Switch, Choice, Dropdown, Dialog, CloseButton), `Menu`, `keys` (shortcuts,
  Escape, G and a letter), `shortcutKeys`
- `storage/`: the file system interface and its Tauri, Node and memory versions, atomic writes,
  autosave, save errors, key-value storage
- `platform/`: `BasePlatform`, the device as an app sees it, built for Tauri with
  `createTauriPlatform({ releases })` or for the browser with `createBrowserPlatform(home, files)`.
  The app adds its own parts, hands the result in with `provideDevice`, and llkit's parts read it
  with `device()`. A test build (identifier ending in `.test`) answers dialogs from
  `window.appTest`.

- `shell/WindowControls`: the window's buttons and drag bar, and the start picture while the app
  starts (`StartPicture`, which also takes away the start page's tip after the first start)
- `updates`: the update the app has found, shared by its notice and its menus
- `feedback/`: the feedback dialog and what it sends, with the session's error report
- `guide/`: `createGuide(steps, storageKey)` and `GuideTip`, a tip per part of the app, one at a
  time, that can be skipped or started over
- `appInfo`: the app's name, handed in with `provideAppName`, for the report and feedback
- `Side`: the side panel, the same in every view: `SideFrame` round the app's screen, `SideToggle`
  in its top bar, and each view's `<Side>` with what goes in it; folded or out per view with the
  button or Ctrl+\, floating out while the pointer rests on the button. On a phone an open side
  fills the screen, and `foldOnPhone` folds it after a pick

## A new app

`npm run ny-app <namn>` makes the app in its own folder beside Skrivro, from `template/`, with a
copy of llkit and a fresh git repository. The copy is never edited there: change llkit here and
hand it over with `npm run llkit:uppdatera ../<mapp>`. `template/` is the new app's code, so
Skrivro's typecheck, lint and text test leave it out.

## Still Skrivro's name

- Atomic writes leave `.skrivro-tmp` files, which the crash recovery and a Rust command look for.
  They get a general name when a second app comes, with the old one still read.

## Styles

`tokens.css` holds the colours, layers, radii and fonts, light and dark. `kit.css` draws the
controls from them. The app imports those two first and its own styles after, so a rule of the
app may build on a control; `motion.css`, how things move, comes last. A rule that styles
only llkit's classes belongs in `kit.css`, whole: splitting one between the two lets the order
decide what shows.
