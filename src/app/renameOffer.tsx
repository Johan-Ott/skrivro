import { SearchQuery } from "prosemirror-search";
import { useCallback, useEffect, useState } from "react";
import type { ManuscriptScope } from "../editor/manuscriptSearch.js";
import { findNode } from "../project/tree.js";
import type { AppState } from "./App.js";
import { TemplateSavedToast } from "./notes/TemplateSavedToast.js";
import { ReplaceToast } from "./SaveToast.js";
import type { Project } from "./useProject.js";
import { t } from "../i18n/i18n.js";

// A person or place renamed in its note can be renamed in the manuscript too, as a replace all
// with whole words that the replace toast then lets her undo.

type Offer = { from: string; to: string };

const noteTitle = (project: Project, id: string) =>
  findNode(project.tree, id)?.parent?.kind === "sort" ? project.summaries[id]?.title : undefined;

export function useRenameOffer(scope: ManuscriptScope, project: Project | null) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const noteRenamed = (id: string, title: string) => {
    const from = project && noteTitle(project, id);
    if (from && from !== title) setOffer({ from, to: title });
  };
  const accept = () => {
    if (offer) {
      const { from, to } = offer;
      scope.replaceAll(
        new SearchQuery({ search: from, replace: to, wholeWord: true, caseSensitive: true }),
      );
    }
    setOffer(null);
  };
  const dismiss = useCallback(() => setOffer(null), []);
  return { offer, noteRenamed, accept, dismiss };
}

const OFFER_MS = 10000;

export function RenameOfferToast(props: ReturnType<typeof useRenameOffer>) {
  const { offer, dismiss } = props;
  useEffect(() => {
    if (!offer) return;
    const timer = setTimeout(dismiss, OFFER_MS);
    return () => clearTimeout(timer);
  }, [offer, dismiss]);
  if (!offer) return null;
  return (
    <div className="toast" role="status">
      <span>{t("Byta ”{from}” mot ”{to}” i manuset också?", offer)}</span>
      <button className="link-button" onClick={props.accept}>
        {t("Byt")}
      </button>
      <button className="link-button" onClick={dismiss}>
        {t("Nej")}
      </button>
    </div>
  );
}

/** Toasts about the whole book, seen on whichever screen she is. */
export function BookToasts({ app }: { app: AppState }) {
  return (
    <div className="app-toasts">
      <ReplaceToast {...app.search} />
      <RenameOfferToast {...app.renameOffer} />
      <TemplateSavedToast />
    </div>
  );
}
