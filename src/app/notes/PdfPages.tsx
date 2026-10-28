import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { recordFailure } from "@llkit/errorLog.js";
import { t } from "../../i18n/i18n.js";

// pdf.js is a large file, so it is fetched when a PDF is first opened, not when the app starts.
async function openPdf(bytes: Uint8Array) {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  GlobalWorkerOptions.workerSrc = workerUrl;
  return getDocument({ data: bytes.slice() }).promise;
}

function usePdf(read: () => Promise<Uint8Array | null>, key: string) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  useEffect(() => {
    setPdf(null);
    let isCurrent = true;
    void read()
      .then((bytes) => (bytes ? openPdf(bytes) : null))
      .then((doc) => {
        // Read after the writer has gone elsewhere: freed at once, or the worker stays.
        if (doc && !isCurrent) void doc.destroy();
        else if (doc) setPdf(doc);
      })
      .catch(recordFailure("PDF-filen kunde inte läsas"));
    return () => void (isCurrent = false);
    // `read` is made anew each render; the key alone says when it is another file.
  }, [key]);
  useEffect(() => () => void pdf?.destroy(), [pdf]);
  return pdf;
}

// The page fills the canvas's width, drawn at the screen's density so it is sharp on a phone.
function startDrawing(page: PDFPageProxy, target: HTMLCanvasElement) {
  const context = target.getContext("2d");
  if (!context) return null;
  const width = target.parentElement?.clientWidth || 600;
  const scale = (width / page.getViewport({ scale: 1 }).width) * (window.devicePixelRatio || 1);
  const viewport = page.getViewport({ scale });
  target.width = viewport.width;
  target.height = viewport.height;
  target.style.width = `${width}px`;
  return page.render({ canvasContext: context, viewport, canvas: target });
}

function useDrawnPage(pdf: PDFDocumentProxy, number: number) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    let isCurrent = true;
    let drawing: RenderTask | null = null;
    void pdf
      .getPage(number)
      .then((page) => {
        drawing = isCurrent ? startDrawing(page, target) : null;
        // A page cancelled by the next one is not an error; a page that cannot be had is.
        return drawing?.promise.catch(() => undefined);
      })
      .catch(recordFailure("PDF-sidan kunde inte visas"));
    return () => {
      isCurrent = false;
      drawing?.cancel();
    };
  }, [pdf, number]);
  return canvas;
}

function Page({ pdf, number }: { pdf: PDFDocumentProxy; number: number }) {
  return <canvas ref={useDrawnPage(pdf, number)} className="pdf-page" />;
}

/** A PDF read page by page, with the page number and a way to the next and the one before. */
export function PdfPages({ path, read }: { path: string; read: () => Promise<Uint8Array | null> }) {
  const pdf = usePdf(read, path);
  const [number, setNumber] = useState(1);
  useEffect(() => setNumber(1), [path]);
  if (!pdf) return null;
  return (
    <div className="pdf-view">
      <div className="pdf-nav">
        <button
          className="button secondary small"
          disabled={number <= 1}
          onClick={() => setNumber(number - 1)}
        >
          {t("Föregående sida")}
        </button>
        <span aria-live="polite">
          {t("Sida {number} av {total}", { number, total: pdf.numPages })}
        </span>
        <button
          className="button secondary small"
          disabled={number >= pdf.numPages}
          onClick={() => setNumber(number + 1)}
        >
          {t("Nästa sida")}
        </button>
      </div>
      <Page pdf={pdf} number={number} />
    </div>
  );
}
