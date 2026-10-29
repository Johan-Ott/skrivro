/** Set by vite.config.ts from src-tauri/tauri.conf.json. */
declare const __APP_VERSION__: string;
/** False in the apps outside the Store, which fetch Typst's compiler once instead of carrying
 * its 28 MB. */
declare const __TYPST_BUNDLED__: boolean;
/** True in the Microsoft Store build, which the Store updates (`npm run build:store`). */
declare const __STORE__: boolean;

// Vite gives an imported file's URL when the import ends in ?url.
declare module "*?url" {
  const url: string;
  export default url;
}
