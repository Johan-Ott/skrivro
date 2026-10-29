import type { SceneSummary } from "./sceneSummaries.js";
import { NOTES_ID, sceneIdsIn, sortsOf, type TreeNode } from "./tree.js";

/** A note whose name is linked in the text: an ordinary scene file in a sort. Its title is the name. */
export interface Card {
  id: string;
  sortId: string;
  name: string;
  /** Other names it is linked by, from `aliases:` in its front matter. */
  aliases?: string[];
}

/** Linked unless they say otherwise; in Övrigt only when they say so. */
export const isLinkedByDefault = (sortId: string) => sortId !== NOTES_ID;

/** The ids of the notes: the scene files in sorts. */
export const noteIdsOf = (tree: TreeNode[]) =>
  new Set(sortsOf(tree).flatMap((sort) => sceneIdsIn(tree, sort.id)));

/** Every note in the sorts, linked or not: files too. A scene whose file has not
 * arrived yet has no summary, and so no name. */
export function notesOf(tree: TreeNode[], summaries: Record<string, SceneSummary>): Card[] {
  return sortsOf(tree).flatMap((sort) =>
    sceneIdsIn(tree, sort.id).flatMap((id) => {
      const summary = summaries[id];
      if (!summary) return [];
      const aliases = summary.aliases ? { aliases: summary.aliases } : {};
      return [{ id, sortId: sort.id, name: summary.title, ...aliases }];
    }),
  );
}

/** The notes whose names are linked in the text. */
export const cardsOf = (tree: TreeNode[], summaries: Record<string, SceneSummary>) =>
  notesOf(tree, summaries).filter(
    (card) => summaries[card.id]?.link ?? isLinkedByDefault(card.sortId),
  );

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** What a card is linked by: its title and its aliases, never a guessed part of the title. */
export const namesOf = (card: Card) => [card.name, ...(card.aliases ?? [])];

/** Every name of every card, each once. */
export const everyName = (cards: Card[]) => [...new Set(cards.flatMap(namesOf))];

/** A trailing s is the Swedish genitive: "Arvids händer". The longer name is tried first. */
export function mentionPattern(names: string | string[]): RegExp | null {
  const trimmed = [names].flat().map((name) => name.trim());
  const longestFirst = trimmed
    .filter((name) => name !== "")
    .sort((first, second) => second.length - first.length);
  if (longestFirst.length === 0) return null;
  const group = longestFirst.map(escapeRegExp).join("|");
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${group})s?(?![\\p{L}\\p{N}])`, "gu");
}

/** The cards whose names the text holds. */
export const cardsNamedIn = <C extends Card>(cards: C[], text: string) =>
  cards.filter((card) => mentionPattern(namesOf(card))?.test(text));

export interface Mentions {
  count: number;
  sceneIds: string[];
  /** Keyed by scene id. */
  sentences: Record<string, string>;
}

const SENTENCES = /[^.!?\n]+[.!?]*/g;

function firstSentenceWith(text: string, pattern: RegExp) {
  const sentence = (text.match(SENTENCES) ?? []).find((each) => each.search(pattern) >= 0);
  return sentence?.trim() ?? "";
}

/** Counted, never stored. */
export function countMentions(cards: Card[], sceneTexts: Record<string, string>) {
  const mentions = new Map<string, Mentions>();
  for (const card of cards) {
    const pattern = mentionPattern(namesOf(card));
    const found: Mentions = { count: 0, sceneIds: [], sentences: {} };
    for (const [sceneId, sceneText] of Object.entries(sceneTexts)) {
      const count = pattern ? (sceneText.match(pattern) ?? []).length : 0;
      if (!pattern || count === 0) continue;
      found.count += count;
      found.sceneIds.push(sceneId);
      found.sentences[sceneId] = firstSentenceWith(sceneText, new RegExp(pattern.source, "u"));
    }
    mentions.set(card.id, found);
  }
  return mentions;
}

const MIN_RANGE = 3;

/** "1–8" for a run, otherwise "1, 2, 5, 8". */
export function chapterRuns(chapters: number[]): string {
  const sorted = [...new Set(chapters)].sort((first, second) => first - second);
  const parts: string[] = [];
  for (let start = 0; start < sorted.length;) {
    let end = start;
    while (sorted[end + 1] === (sorted[end] ?? 0) + 1) end++;
    const run = sorted.slice(start, end + 1);
    parts.push(run.length >= MIN_RANGE ? `${run[0]}–${run[run.length - 1]}` : run.join(", "));
    start = end + 1;
  }
  return parts.join(", ");
}
