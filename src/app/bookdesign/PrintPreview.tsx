import { useEffect, useRef } from "react";
import type { Project } from "../useProject.js";
import { framePages } from "./framePages.js";
import { usePrintPreview } from "./usePrintPreview.js";
import { t } from "../../i18n/i18n.js";

function usePageFrames(svg: string | null) {
  const pages = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const drawn = pages.current?.querySelector("svg");
    if (svg && drawn) framePages(drawn);
  }, [svg]);
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

/** The SVG comes from Typst and the writer's own text, never from outside, so it is set as HTML. */
export function PrintPreview({
  project,
  generalAuthor,
}: {
  project: Project;
  generalAuthor: string;
}) {
  const preview = usePrintPreview(project, generalAuthor);
  const pages = usePageFrames(preview.kind === "ready" ? preview.svg : null);
  return (
    <div className="print-preview">
      <span className="setting-hint">{t("Förhandsvisning · första kapitlet")}</span>
      {preview.kind === "working" && <Waiting />}
      {preview.kind === "failed" && (
        <p className="kpi-sub" role="alert">
          {preview.reason}
        </p>
      )}
      {preview.kind === "ready" && (
        <div
          ref={pages}
          className="print-pages"
          dangerouslySetInnerHTML={{ __html: preview.svg }}
        />
      )}
    </div>
  );
}
