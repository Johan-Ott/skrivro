import { SCENE_STATUSES, type SceneStatus } from "../manuscript/sceneFile.js";
import type { SceneSummary } from "./sceneSummaries.js";
import { findNode, moveNode, numberNodes, TRASH_ID, type TreeNode } from "./tree.js";
import { withNodeFields } from "./nodeFields.js";

type Summaries = Record<string, SceneSummary>;

/** A chapter, or a scene outside any chapter. */
export interface ContentsRow {
  id: string;
  /** Null for a scene outside a chapter. */
  number: number | null;
  title: string;
  summary: string;
  when: string;
  pov: string;
  words: number;
  status: SceneStatus;
  sceneIds: string[];
}

const scenesIn = (node: TreeNode): string[] =>
  node.kind === "scene" ? [node.id] : (node.children ?? []).flatMap(scenesIn);

/** A chapter is only as far along as its least finished scene. */
export function leastFinished(statuses: SceneStatus[]): SceneStatus {
  const ranks = statuses.map((status) => SCENE_STATUSES.indexOf(status));
  return SCENE_STATUSES[Math.min(...ranks)] ?? "idé";
}

function rowOf(node: TreeNode, number: number | null, summaries: Summaries): ContentsRow {
  const sceneIds = scenesIn(node);
  const title = node.kind === "scene" ? (summaries[node.id]?.title ?? "") : (node.title ?? "");
  return {
    id: node.id,
    number,
    title,
    summary: node.summary ?? "",
    when: node.when ?? "",
    pov: node.pov ?? "",
    words: sceneIds.reduce((sum, id) => sum + (summaries[id]?.words ?? 0), 0),
    status: leastFinished(sceneIds.map((id) => summaries[id]?.status ?? "idé")),
    sceneIds,
  };
}

// Parts and folders only group, so they are walked through.
function walk(nodes: TreeNode[], numbers: Map<string, number>, summaries: Summaries) {
  return nodes.flatMap((node): ContentsRow[] => {
    if (node.kind === "chapter") return [rowOf(node, numbers.get(node.id) ?? null, summaries)];
    if (node.kind === "scene") return [rowOf(node, null, summaries)];
    return walk(node.children ?? [], numbers, summaries);
  });
}

/** A part of the book and its chapters' rows; chapters outside any part have no part. */
export interface ContentsGroup {
  part: { id: string; title: string } | null;
  rows: ContentsRow[];
}

const partOf = (node: TreeNode) =>
  node.kind === "part" ? { id: node.id, title: node.title ?? "" } : null;

const inBook = (node: TreeNode) => node.kind !== "sort" && node.id !== TRASH_ID;

/** The book in parts, as Innehåll lists it in reading order. */
export function contentsGroups(tree: TreeNode[], summaries: Summaries): ContentsGroup[] {
  const numbers = numberNodes(tree, "chapter");
  const groups: ContentsGroup[] = [];
  for (const node of tree.filter(inBook)) {
    const part = partOf(node);
    const rows = walk(part ? (node.children ?? []) : [node], numbers, summaries);
    const last = groups[groups.length - 1];
    if (!part && last?.part === null) last.rows.push(...rows);
    else groups.push({ part, rows });
  }
  return groups;
}

export function contentsRows(tree: TreeNode[], summaries: Summaries): ContentsRow[] {
  const book = tree.filter((node) => node.kind !== "sort" && node.id !== TRASH_ID);
  return walk(book, numberNodes(tree, "chapter"), summaries);
}

/** A chapter's scenes, each as a row of its own. */
export function sceneRows(tree: TreeNode[], summaries: Summaries, chapterId: string) {
  const children = findNode(tree, chapterId)?.node.children ?? [];
  return children
    .filter((node) => node.kind === "scene")
    .map((node) => rowOf(node, null, summaries));
}

/** The scene moved into a chapter, just before another scene, or last when there is none. */
export function withSceneMoved(
  tree: TreeNode[],
  sceneId: string,
  chapterId: string,
  beforeId: string | null,
) {
  const siblings = (findNode(tree, chapterId)?.node.children ?? []).filter(
    (node) => node.id !== sceneId,
  );
  const index = siblings.findIndex((node) => node.id === beforeId);
  return moveNode(tree, sceneId, chapterId, index < 0 ? siblings.length : index);
}

const byWhen = (first: ContentsRow, second: ContentsRow) =>
  !first.when || !second.when
    ? Number(!first.when) - Number(!second.when)
    : first.when.localeCompare(second.when, undefined, { numeric: true, sensitivity: "base" });

/** By När until a row is dragged, then as dragged; rows without När, or new ones, keep reading order. */
export function inTimeOrder(rows: ContentsRow[], order: string[]): ContentsRow[] {
  if (order.length === 0) return [...rows].sort(byWhen);
  const rank = (row: ContentsRow) => {
    const index = order.indexOf(row.id);
    return index === -1 ? order.length + rows.indexOf(row) : index;
  };
  return [...rows].sort((first, second) => rank(first) - rank(second));
}

export function movedInTime(shown: ContentsRow[], id: string, index: number): string[] {
  const ids = shown.map((row) => row.id).filter((rowId) => rowId !== id);
  return [...ids.slice(0, index), id, ...ids.slice(index)];
}

export const withNodeText = (
  tree: TreeNode[],
  id: string,
  field: "summary" | "when" | "pov",
  text: string,
) => withNodeFields(tree, id, { [field]: text });
