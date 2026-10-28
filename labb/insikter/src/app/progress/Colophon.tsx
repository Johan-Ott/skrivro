import { useState } from "react";
import { colophon } from "../../project/colophon.js";
import { dayKey, type Stats } from "../../project/stats.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import { recordFailure } from "@llkit/errorLog.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

const ColophonPage = ({ lines }: { lines: string[] }) => (
  <div className="colophon-page">
    <span className="colophon-mark" aria-hidden="true">
      · · ·
    </span>
    <span className="colophon-title">{t("Om den här boken")}</span>
    {lines.map((line) => (
      <p key={line}>{line}</p>
    ))}
    <span className="colophon-rule" aria-hidden="true" />
    <span className="colophon-foot">{t("Skriven i Skrivro.")}</span>
  </div>
);

/** Insikter's numbers written as the book's last page, to copy into the book if you like. */
export function Colophon({ project, stats }: { project: Project; stats: Stats }) {
  const [isCopied, setCopied] = useState(false);
  const words = manuscriptWords(project.tree, project.summaries);
  const lines = colophon(project.name, stats, words, dayKey(Date.now()));
  const copy = () =>
    void navigator.clipboard
      .writeText([t("Om den här boken"), ...lines].join("\n\n"))
      .then(() => setCopied(true))
      .catch(recordFailure("Kolofon"));
  if (lines.length === 0) return null;
  return (
    <section className="colophon">
      <span className="setting-hint">
        {t("Samma siffror som korten, skrivna som bokens sista sida.")}
      </span>
      <ColophonPage lines={lines} />
      <button className="button" onClick={copy}>
        {isCopied ? t("Kopierad") : t("Kopiera texten")}
      </button>
    </section>
  );
}
