import { useEffect, useState } from "react";
import { bookLanguage, quoteStyleFor } from "../project/bookLanguage.js";
import { contentsRows } from "../project/contents.js";
import { pageMap, type PageMap } from "../project/pageMap.js";
import { typstFiles, typstSource } from "../export/typstBook.js";
import { recordFailure } from "@llkit/errorLog.js";
import { bookMaterial, chosenExtras, printInput } from "./exporting/bookMaterial.js";
import type { ExportChoices } from "./exporting/useExport.js";
import { appTypst } from "./typstAssets.js";
import type { Project } from "./useProject.js";
import { findNode, type TreeNode } from "../project/tree.js";

// Waits for a pause in the writing; setting the whole book takes about 0.1 s once Typst is warm.
const SETTLE_MS = 3000;

// The parts a printed book usually has, so the count is close to the exported PDF.
const choicesFor = (project: Project): ExportChoices => ({
  format: "tryck",
  typography: quoteStyleFor(bookLanguage(project.fields)),
  hasTitlePage: true,
  hasCopyrightPage: true,
  hasContents: true,
  hasDedication: true,
  hasThanks: true,
  hasAbout: true,
  hasAlsoBy: true,
  hasNewsletter: true,
  hasStores: false,
  hasExcerpt: false,
  hasLetterPage: false,
});

async function buildPageMap(project: Project, generalAuthor: string): Promise<PageMap> {
  const material = await bookMaterial(project, generalAuthor, () => undefined);
  const choices = choicesFor(project);
  const extras = chosenExtras(project, choices);
  const input = { ...printInput({ project, material, choices, extras }), markPages: true };
  const found = await appTypst.pageMarks(typstSource(input), typstFiles(input));
  return pageMap(found, contentsRows(project.tree, project.summaries));
}

/** The open scene's block pages, while page breaks are shown in the margin. */
export function scenePagesOf(
  app: {
    scene: { id: string } | null;
    writingMode: { settings: { showPages: boolean; paper: boolean } };
  },
  map: PageMap | null,
) {
  const { showPages, paper } = app.writingMode.settings;
  if (!(showPages || paper) || !app.scene) return null;
  return map?.blockPages.get(app.scene.id) ?? null;
}

/** The page the open scene ends on, for the foot of the sheet; null until they are counted. */
export function lastPageOf(sceneId: string | null, map: PageMap | null) {
  const pages = (sceneId ? (map?.blockPages.get(sceneId) ?? []) : []).filter(
    (page): page is number => page !== undefined,
  );
  return pages.length === 0 ? null : Math.max(...pages);
}

/** Where a part, chapter or scene starts in the printed book, for the table of contents. */
export function pageFinder(map: PageMap | null, tree: TreeNode[]) {
  return (id: string): number | null => {
    if (!map) return null;
    const chapter = map.chapterPages.get(id);
    if (chapter) return chapter.first;
    const scene = map.blockPages.get(id)?.find((page) => page !== undefined);
    if (scene !== undefined) return scene;
    const children = findNode(tree, id)?.node.children ?? [];
    return children.map((child) => map.chapterPages.get(child.id)?.first).find(Boolean) ?? null;
  };
}

/** The book set as printed, in the background, while something on screen shows its pages. */
/** `settleMs` is how long the book must stay unchanged before its pages are counted again. */
export function usePageMap(
  project: Project,
  generalAuthor: string,
  isWanted: boolean,
  settleMs = SETTLE_MS,
) {
  const [map, setMap] = useState<PageMap | null>(null);
  useEffect(() => {
    if (!isWanted) return;
    let isCurrent = true;
    const timer = setTimeout(() => {
      buildPageMap(project, generalAuthor)
        .then((built) => isCurrent && setMap(built))
        .catch(recordFailure("Sidantal"));
    }, settleMs);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [project, generalAuthor, isWanted, settleMs]);
  return isWanted ? map : null;
}
