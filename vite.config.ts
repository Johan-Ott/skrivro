import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

// The version shown under "Om Skrivro" is the one Tauri builds the app with. Imported, so the dev
// server starts over by itself when npm run version changes it.
import tauriConfig from "./src-tauri/tauri.conf.json" with { type: "json" };

const LEFT_OUT = "\0typst-compiler-left-out";

// An asset is written out as soon as it is imported, dead code or not, so in the apps the
// compiler's 28 MB file is swapped for nothing before it is ever read.
const typstLeftOut = (isBundled: boolean): Plugin => ({
  name: "typst-compiler-left-out",
  enforce: "pre",
  resolveId: (id) =>
    !isBundled && id.includes("typst_ts_web_compiler_bg.wasm?url") ? LEFT_OUT : null,
  load: (id) => (id === LEFT_OUT ? "export default '';" : null),
});

// Tauri expects the dev server on a fixed port and prints its own output. A Tauri build leaves
// Typst's compiler out of the app, which fetches it once; the browser and the dev server keep it.
export default defineConfig(({ command }) => {
  // The Store build keeps it too, as the Store allows no code fetched after installing.
  const isStore = process.env["PENNA_STORE"] === "1";
  // The dev server keeps it, unless PENNA_TYPST_FETCH=1 tries the apps' way in Skrivro Test.
  const isTypstBundled =
    command === "serve"
      ? !process.env["PENNA_TYPST_FETCH"]
      : isStore || !process.env["TAURI_ENV_PLATFORM"];
  return {
    plugins: [react()],
    // llkit: what any llstudios app is built on, kept apart from what is Skrivro's own.
    resolve: { alias: { "@llkit": fileURLToPath(new URL("./llkit", import.meta.url)) } },
    clearScreen: false,
    server: { port: 1420, strictPort: true },
    // Typst runs in a worker that loads its parts as modules.
    worker: { format: "es", plugins: () => [typstLeftOut(isTypstBundled)] },
    define: {
      __APP_VERSION__: JSON.stringify(tauriConfig.version),
      __TYPST_BUNDLED__: JSON.stringify(isTypstBundled),
      __STORE__: JSON.stringify(isStore),
    },
  };
});
