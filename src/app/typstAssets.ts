import type { PageMarks, Sheets, TypstFiles } from "../export/typstCompile.js";
import { TypstError } from "../export/typstError.js";
import type { TypstRequest } from "./typstWorker.js";
import { platform } from "./platform.js";
import { t } from "../i18n/i18n.js";

type Answer = { id: number; result?: unknown; error?: string; isTypst?: boolean };
type Waiting = { resolve: (result: unknown) => void; reject: (error: Error) => void };

// Typst and its 28 MB compiler load the first time a book is set, not when Skrivro starts.
let worker: Worker | null = null;
let nextId = 0;
const waiting = new Map<number, Waiting>();

// A compiler that cannot be fetched answers every waiting book with why.
function handOverCompiler(started: Worker) {
  if (__TYPST_BUNDLED__ || !platform.typstCompiler) return;
  void platform.typstCompiler().then(
    (compiler) => started.postMessage({ compiler }, [compiler]),
    () => {
      const why = new Error(
        t("Det som gör boken tryckfärdig kunde inte hämtas. Kontrollera nätet och försök igen."),
      );
      waiting.forEach((asked) => asked.reject(why));
      waiting.clear();
      worker = null;
    },
  );
}

function started() {
  if (worker) return worker;
  worker = new Worker(new URL("./typstWorker.ts", import.meta.url), { type: "module" });
  handOverCompiler(worker);
  worker.onmessage = (event: MessageEvent<Answer>) => {
    const { id, result, error, isTypst } = event.data;
    const asked = waiting.get(id);
    waiting.delete(id);
    if (error === undefined) asked?.resolve(result);
    else asked?.reject(isTypst ? new TypstError(error) : new Error(error));
  };
  return worker;
}

function ask<T>(
  method: TypstRequest["method"],
  source: string,
  files: TypstFiles = new Map(),
  sheets?: Sheets,
) {
  const id = ++nextId;
  return new Promise<T>((resolve, reject) => {
    waiting.set(id, { resolve: (result) => resolve(result as T), reject });
    started().postMessage({ id, method, source, files, sheets } satisfies TypstRequest);
  });
}

export const appTypst = {
  pdf: (source: string, files?: TypstFiles) => ask<Uint8Array>("pdf", source, files),
  svg: (source: string, files?: TypstFiles, sheets?: Sheets) =>
    ask<string>("svg", source, files, sheets),
  pageMarks: (source: string, files?: TypstFiles) => ask<PageMarks>("pageMarks", source, files),
};
