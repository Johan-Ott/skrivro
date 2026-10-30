// Typst sets the book here, away from the window, so writing never waits for a long book.
import rendererWasmUrl from "@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url";
import { createTypst, type Sheets, type TypstFiles } from "../export/typstCompile.js";
import { TypstError } from "../export/typstError.js";

// Each font in public/fonts has its OFL licence beside it.
const FONT_FILES = [
  "literata-400-normal",
  "literata-400-italic",
  "literata-700-normal",
  "literata-700-italic",
  "eb-garamond-400-normal",
  "eb-garamond-400-italic",
  "eb-garamond-700-normal",
  "eb-garamond-700-italic",
  "crimson-pro-400-normal",
  "crimson-pro-400-italic",
  "crimson-pro-700-normal",
  "crimson-pro-700-italic",
  "libre-baskerville-400-normal",
  "libre-baskerville-400-italic",
  "libre-baskerville-700-normal",
  "source-serif-4-400-normal",
  "source-serif-4-400-italic",
  "source-serif-4-700-normal",
  "source-serif-4-700-italic",
  "geist-sans-400-normal",
];

async function bytesAt(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} kunde inte läsas.`);
  return new Uint8Array(await response.arrayBuffer());
}

// In the apps the window hands over the compiler Skrivro fetched; elsewhere it comes with the page.
let giveCompiler: (bytes: Uint8Array) => void = () => undefined;
const handedOver = new Promise<Uint8Array>((resolve) => (giveCompiler = resolve));
async function compilerBytes() {
  if (!__TYPST_BUNDLED__) return handedOver;
  const url =
    await import("@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url");
  return bytesAt(url.default);
}

const typst = createTypst({
  compilerWasm: compilerBytes,
  rendererWasm: () => bytesAt(rendererWasmUrl),
  fonts: () => Promise.all(FONT_FILES.map((name) => bytesAt(`/fonts/${name}.ttf`))),
});

export interface TypstRequest {
  id: number;
  method: "pdf" | "svg" | "pageMarks";
  source: string;
  files: TypstFiles;
  /** For svg: only these sheets drawn. */
  sheets?: Sheets | undefined;
}

// One book at a time: the compiler holds one source, so requests wait their turn.
let queue: Promise<unknown> = Promise.resolve();

self.onmessage = (event: MessageEvent<TypstRequest | { compiler: ArrayBuffer }>) => {
  if ("compiler" in event.data) return giveCompiler(new Uint8Array(event.data.compiler));
  const { id, method, source, files, sheets } = event.data;
  queue = queue.then(async () => {
    try {
      const result =
        method === "svg" ? typst.svg(source, files, sheets) : typst[method](source, files);
      postMessage({ id, result: await result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      postMessage({ id, error: message, isTypst: error instanceof TypstError });
    }
  });
};
