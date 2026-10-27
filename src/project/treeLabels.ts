import type { SceneSummary } from "./sceneSummaries.js";
import { STICKY_ID } from "./sorts.js";
import {
  CHARACTERS_ID,
  findNode,
  isSpecialFolder,
  manuscriptNodes,
  manuscriptSceneIds,
  NOTES_ID,
  numberNodes,
  PLACES_ID,
  SECRETS_ID,
  sceneIdsIn,
  THINGS_ID,
  TRASH_ID,
  type TreeNode,
} from "./tree.js";
import { t, formatNumber } from "../i18n/i18n.js";

type Summaries = Record<string, SceneSummary>;

// The fixed sorts are named in the interface language; project.json keeps its own titles.
const specialFolderLabel = (id: string) =>
  ({
    [CHARACTERS_ID]: t("Personer"),
    [PLACES_ID]: t("Platser"),
    [THINGS_ID]: t("Saker"),
    [NOTES_ID]: t("Övrigt"),
    [STICKY_ID]: t("Lappar"),
    [SECRETS_ID]: t("Hemligheter"),
    [TRASH_ID]: t("Papperskorg"),
  })[id] ?? "";

const ROMAN: [number, string][] = [
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function romanNumeral(value: number): string {
  let rest = value;
  return ROMAN.reduce((result, [size, numeral]) => {
    const count = Math.floor(rest / size);
    rest -= count * size;
    return result + numeral.repeat(count);
  }, "");
}

export function nodeLabel(node: TreeNode, tree: TreeNode[], summaries: Summaries): string {
  if (node.kind === "scene") return summaries[node.id]?.title ?? t("Hittas inte");
  if (node.kind === "folder" || node.kind === "sort")
    return node.title ?? (isSpecialFolder(node.id) ? specialFolderLabel(node.id) : "");
  return numberedLabel(node, tree);
}

function numberedLabel(node: TreeNode, tree: TreeNode[]): string {
  const title = node.title ?? "";
  const number = numberNodes(tree, node.kind === "part" ? "part" : "chapter").get(node.id);
  if (number === undefined) return title;
  return node.kind === "part"
    ? t("Del {number} · {title}", { number: romanNumeral(number), title })
    : `${number}. ${title}`;
}

export function nodeWords(node: TreeNode, summaries: Summaries): number {
  if (node.kind === "scene") return summaries[node.id]?.words ?? 0;
  return (node.children ?? []).reduce((sum, child) => sum + nodeWords(child, summaries), 0);
}

export function shortWordCount(words: number): string {
  if (words < 1000) return String(words);
  if (words < 10000) return `${(words / 1000).toFixed(1).replace(".", ",")}k`;
  return `${Math.round(words / 1000)}k`;
}

/** Words, or how many notes a sort holds. */
export function nodeMeta(node: TreeNode, summaries: Summaries): string {
  if (node.kind === "scene") return formatNumber(summaries[node.id]?.words ?? 0);
  if (node.kind === "sort") return String(sceneIdsIn([node], node.id).length);
  if (node.kind === "part") return "";
  const words = nodeWords(node, summaries);
  return words > 0 ? shortWordCount(words) : "";
}

export interface SceneChapter {
  id: string;
  number: number;
  title: string;
  /** The chapter heading is shown above the text of the chapter's first scene. */
  isFirstScene: boolean;
}

export function chapterOf(tree: TreeNode[], sceneId: string): SceneChapter | null {
  const found = findNode(tree, sceneId);
  const chapter = found?.parent;
  if (!found || chapter?.kind !== "chapter") return null;
  const number = numberNodes(tree, "chapter").get(chapter.id);
  if (number === undefined) return null;
  return { id: chapter.id, number, title: chapter.title ?? "", isFirstScene: found.index === 0 };
}

export const chapterWords = (tree: TreeNode[], summaries: Summaries) =>
  manuscriptNodes(tree, "chapter").map((node) => ({
    id: node.id,
    label: nodeLabel(node, tree, summaries),
    words: nodeWords(node, summaries),
  }));

/** Notes and Papperskorg left out. */
export const manuscriptWords = (tree: TreeNode[], summaries: Summaries) =>
  manuscriptSceneIds(tree).reduce((sum, id) => sum + (summaries[id]?.words ?? 0), 0);

/** Where a scene is: "3. Fyren · Natten", or only its title outside a chapter. */
export function placeOf(tree: TreeNode[], summaries: Summaries, sceneId: string) {
  const chapter = chapterOf(tree, sceneId);
  const title = summaries[sceneId]?.title ?? "";
  return chapter ? `${chapter.number}. ${chapter.title} · ${title}` : title;
}
