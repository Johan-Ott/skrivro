import { useEffect, useRef } from "react";
import { framePages } from "./framePages.js";
import { type BookPages, useSpread } from "./usePrintPreview.js";
import { t } from "../../i18n/i18n.js";

function usePageFrames(spread: { svg: string; row: number } | null) {
  const pages = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const drawn = pages.current?.querySelector("svg");
    if (spread && drawn) framePages(drawn, spread.row);
  }, [spread]);
  return pages;
}

// A blank spread where the pages will come, until Typst has set them.
const Waiting = () => (
  <div className="print-waiting" role="status">
    <div className="print-spread">
      <span />
      <span />
    </div>
    <p className="kpi-sub">{t("Sätter boken…")}</p>
  </div>
);

/** One spread of the book. The SVG comes from Typst and the writer's own text, never from
 * outside, so it is set as HTML. */
export function PrintPreview({ pages, row }: { pages: BookPages; row: number }) {
  const spread = useSpread(pages.kind === "ready" ? pages.book : null, row);
  const frames = usePageFrames(spread);
  if (pages.kind === "failed")
    return (
      <div className="print-preview">
        <p className="kpi-sub" role="alert">
          {pages.reason}
        </p>
      </div>
    );
  return (
    <div className="print-preview">
      {spread ? (
        <div
          ref={frames}
          className="print-pages"
          dangerouslySetInnerHTML={{ __html: spread.svg }}
        />
      ) : (
        <Waiting />
      )}
    </div>
  );
}
