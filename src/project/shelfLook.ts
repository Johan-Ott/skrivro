import { folderTitle } from "./shelf.js";
import { t } from "../i18n/i18n.js";

// A book without a picture gets a cover in its genre's colours, as a shop would show it. A book
// without a genre gets one of the plain looks, from its folder's name, so it keeps it when moved.

const GENRE_LOOKS = [
  "deckare",
  "thriller",
  "skrack",
  "romans",
  "magi",
  "urban",
  "scifi",
  "historisk",
  "feelgood",
  "ungdom",
  "litterar",
  "barnbok",
];

export const COVER_LOOKS = [
  "cover-skog",
  "cover-ockra",
  "cover-oxblod",
  "cover-skiffer",
  "cover-plommon",
];

/** Every look a cover can have, by its colours, as Omslag in the book's menu offers them. */
export const COVER_CHOICES: [string, string][] = [
  ["deckare", t("Midnattsblå")],
  ["thriller", t("Kol")],
  ["skrack", t("Svart och blod")],
  ["romans", t("Rosa")],
  ["magi", t("Djuphav")],
  ["urban", t("Violett natt")],
  ["scifi", t("Rymd")],
  ["historisk", t("Pergament")],
  ["feelgood", t("Solgul")],
  ["ungdom", t("Turkos och korall")],
  ["litterar", t("Benvit")],
  ["barnbok", t("Himmel och äng")],
  ["skog", t("Skog")],
  ["ockra", t("Ockra")],
  ["oxblod", t("Oxblod")],
  ["skiffer", t("Skiffer")],
  ["plommon", t("Plommon")],
];

// A plain look from the folder's name, so a book keeps it when moved.
function plainLook(dir: string) {
  let hash = 0;
  for (const character of folderTitle(dir)) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
  }
  return COVER_LOOKS[hash % COVER_LOOKS.length] ?? "cover-skog";
}

const isChoice = (look: string | null): look is string =>
  COVER_CHOICES.some(([choice]) => choice === look);

/** The look the writer chose, else the genre's, else a plain one from the folder's name. */
export function coverLookOf(
  dir: string,
  genre: string | null = null,
  chosen: string | null = null,
): string {
  if (isChoice(chosen)) return `cover-${chosen}`;
  return genre && GENRE_LOOKS.includes(genre) ? `cover-${genre}` : plainLook(dir);
}

/** How far a book's pages stand out beside its cover, in pixels: one for every 22 pages of 250 words. */
export const pagesWidth = (words: number) =>
  Math.round(Math.min(22, Math.max(3, words / 250 / 22)));
