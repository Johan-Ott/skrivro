import type { NoteKind } from "../../project/noteKinds.js";

export interface PaletteEntry {
  id: string;
  label: string;
  group: string;
  shortcut?: string;
  /** Grey text on the right, such as the scene's chapter. */
  hint?: string;
  /** The ids of the book's labels on the scene, chapter or note. */
  labels?: string[];
  /** A note that is a file, a lapp or a guide, shown with its sign. */
  kind?: NoteKind;
  run: () => void;
}

// "ä" and "a" match each other when searching, so "fokuslage" finds "Fokusläge".
export const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function hasLettersInOrder(text: string, query: string): boolean {
  let position = 0;
  for (const letter of query) {
    position = text.indexOf(letter, position) + 1;
    if (position === 0) return false;
  }
  return true;
}

/** Higher is better; zero means no match. */
function score(label: string, query: string): number {
  const text = fold(label);
  if (text.startsWith(query)) return 4;
  if (text.split(/\s+/).some((word) => word.startsWith(query))) return 3;
  if (text.includes(query)) return 2;
  // Letters spread out over a label match almost anything when only one or two are typed.
  return query.length >= 3 && hasLettersInOrder(text, query) ? 1 : 0;
}

/** How often each entry has been chosen, by id. */
export type Uses = Record<string, number>;

const MOST_USED = 6;

// Before anything is typed: what is used the most, then the commands; the scenes and notes
// come once their names are typed.
function startEntries(entries: PaletteEntry[], uses: Uses) {
  const top = entries
    .filter((entry) => (uses[entry.id] ?? 0) > 0)
    .sort((first, second) => (uses[second.id] ?? 0) - (uses[first.id] ?? 0))
    .slice(0, MOST_USED);
  const rest = entries.filter((entry) => entry.group === "Kommandon" && !top.includes(entry));
  return [...top.map((entry) => ({ ...entry, group: "Mest använda" })), ...rest];
}

// The most used come first, then notes, scenes, chapters and commands. A lapp is a scrap, so a
// scene with the same name comes before it.
const GROUP_ORDER: Record<string, number> = {
  "Mest använda": -1,
  Scener: 1,
  Kapitel: 2,
  Kommandon: 3,
};
const rank = (entry: PaletteEntry) => GROUP_ORDER[entry.group] ?? (entry.kind === "lapp" ? 1.5 : 0);

/** Best first, and among equals the most used, then notes before scenes, but a lapp after them;
 * what is used the most when nothing is typed. */
export function searchPalette(entries: PaletteEntry[], query: string, uses: Uses = {}) {
  const folded = fold(query.trim());
  if (folded === "") return startEntries(entries, uses);
  const used = (entry: PaletteEntry) => uses[entry.id] ?? 0;
  const scored = entries
    .map((entry, index) => ({ entry, index, points: score(entry.label, folded) }))
    .filter((match) => match.points > 0);
  // Letters spread out are a last resort, so they never crowd out a real match.
  const hasRealMatch = scored.some((match) => match.points > 1);
  return scored
    .filter((match) => !hasRealMatch || match.points > 1)
    .sort(
      (first, second) =>
        second.points - first.points ||
        used(second.entry) - used(first.entry) ||
        rank(first.entry) - rank(second.entry) ||
        first.index - second.index,
    )
    .map((match) => match.entry);
}

const USES_KEY = "skrivro.palette.uses";

export function readUses(): Uses {
  try {
    return JSON.parse(localStorage.getItem(USES_KEY) ?? "{}") as Uses;
  } catch {
    return {};
  }
}

export function recordUse(id: string) {
  const uses = readUses();
  try {
    localStorage.setItem(USES_KEY, JSON.stringify({ ...uses, [id]: (uses[id] ?? 0) + 1 }));
  } catch {
    // Without storage the palette keeps its plain order.
  }
}

export const inGroups = (found: PaletteEntry[]) =>
  [...found].sort((first, second) => rank(first) - rank(second));

/** The results in groups, each group where its best match is: a scene named "Isen" comes before a
 * lapp that only holds the word. */
export function inResultGroups(found: PaletteEntry[]) {
  const groups = [...new Set(found.map((entry) => entry.group))];
  return groups.flatMap((group) => found.filter((entry) => entry.group === group));
}
