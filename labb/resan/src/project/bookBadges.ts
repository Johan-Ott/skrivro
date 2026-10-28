import type { SceneSummary } from "./sceneSummaries.js";
import { projectGoals } from "./progress.js";
import {
  CHARACTERS_ID,
  manuscriptSceneIds,
  PLACES_ID,
  SECRETS_ID,
  sceneIdsIn,
  type TreeNode,
} from "./tree.js";
import { manuscriptWords } from "./treeLabels.js";
import { t } from "../i18n/i18n.js";

// Badges for one book, reached by what the book holds; kept in project.json under `badges`.

export interface Book {
  tree: TreeNode[];
  summaries: Record<string, SceneSummary>;
  fields: Record<string, unknown>;
}

export interface BookBadge {
  id: string;
  name: string;
  hint: string;
  isReached: (book: Book) => boolean;
}

function chaptersOf(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((node) => {
    if (node.kind === "chapter") return [node];
    return node.kind === "part" ? chaptersOf(node.children ?? []) : [];
  });
}

const isDone = (book: Book, id: string) => book.summaries[id]?.status === "klar";
const scenesOf = (chapter: TreeNode) =>
  (chapter.children ?? []).filter((child) => child.kind === "scene").map((child) => child.id);
const allDone = (book: Book, ids: string[]) =>
  ids.length > 0 && ids.every((id) => isDone(book, id));
const notesIn = (book: Book, folder: string) => sceneIdsIn(book.tree, folder).length;
const words = (book: Book) => manuscriptWords(book.tree, book.summaries);
const goal = (book: Book) => projectGoals(book.fields).totalGoal;

const REACHED: Record<string, (book: Book) => boolean> = {
  "forsta-kapitlet": (book) =>
    chaptersOf(book.tree).some((chapter) => allDone(book, scenesOf(chapter))),
  "tio-kapitel": (book) => chaptersOf(book.tree).length >= 10,
  "forsta-delen": (book) => book.tree.some((node) => node.kind === "part"),
  halvvags: (book) => goal(book) !== null && words(book) >= (goal(book) ?? 0) / 2,
  "hundra-sidor": (book) => words(book) >= 25_000,
  persongalleri: (book) => notesIn(book, CHARACTERS_ID) >= 10,
  varldsbygge: (book) => notesIn(book, PLACES_ID) >= 5,
  "en-hemlighet": (book) => notesIn(book, SECRETS_ID) >= 1,
  tidslinje: (book) => {
    const chapters = chaptersOf(book.tree);
    return chapters.length >= 3 && chapters.every((chapter) => chapter.when?.trim());
  },
  "allt-klart": (book) => allDone(book, manuscriptSceneIds(book.tree)),
};

const TEXTS = (): [string, string, string][] => [
  ["forsta-kapitlet", t("Första kapitlet klart"), t("Sätt alla scener i ett kapitel som Klar.")],
  ["tio-kapitel", t("Tio kapitel"), t("Ha tio kapitel i boken.")],
  ["forsta-delen", t("Delad i delar"), t("Lägg kapitlen i en del.")],
  ["halvvags", t("Halvvägs"), t("Nå halva bokens mål.")],
  ["hundra-sidor", t("Hundra sidor"), t("Skriv 25 000 ord i boken.")],
  ["persongalleri", t("Persongalleri"), t("Ha tio personer bland anteckningarna.")],
  ["varldsbygge", t("Världsbygge"), t("Ha fem platser bland anteckningarna.")],
  ["en-hemlighet", t("En hemlighet"), t("Skriv ner en hemlighet.")],
  ["tidslinje", t("Tidslinje"), t("Säg när varje kapitel händer, i minst tre kapitel.")],
  ["allt-klart", t("Allt klart"), t("Sätt varje scen i boken som Klar.")],
];

export const bookBadges = (): BookBadge[] =>
  TEXTS().map(([id, name, hint]) => ({ id, name, hint, isReached: REACHED[id] ?? (() => false) }));

/** Null for a book that has never been counted, so what it already holds is kept quietly. */
export function bookBadgesHeld(fields: Record<string, unknown>): Record<string, string> | null {
  const stored = fields["badges"];
  if (typeof stored !== "object" || stored === null || Array.isArray(stored)) return null;
  return Object.fromEntries(
    Object.entries(stored).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

/** What the book has reached and does not hold yet. */
export const reachedBookBadges = (book: Book, held: Record<string, string>) =>
  bookBadges().filter((each) => !held[each.id] && each.isReached(book));
