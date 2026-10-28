import { formatNumber, t } from "../i18n/i18n.js";
import { badges } from "./badges.js";
import { journeySummary } from "./inkwell.js";
import type { Journey } from "./journey.js";

// Frames for the writer's portrait and titles under the name, unlocked by what the journey
// already counts: words written, ink earned and badges. Nothing is bought.

export type FlairKind = "ram" | "titel";
type Unlock = { words: number } | { ink: number } | { badge: string } | null;

export interface Flair {
  id: string;
  kind: FlairKind;
  name: string;
  unlock: Unlock;
}

/** What the writer has earned, as the journey keeps it. */
export interface Earned {
  words: number;
  ink: number;
  badges: Record<string, string>;
}

const flair = (id: string, kind: FlairKind, name: string, unlock: Unlock = null): Flair => ({
  id,
  kind,
  name,
  unlock,
});

export const flairs = (): Flair[] => [
  flair("tunn", "ram", t("Tunn linje")),
  flair("grafit", "ram", t("Grafit"), { words: 1000 }),
  flair("dubbel", "ram", t("Dubbel linje"), { words: 10_000 }),
  flair("manus", "ram", t("Manus"), { badge: "forsta-utkastet" }),
  flair("natt", "ram", t("Natt"), { badge: "nattuggla" }),
  flair("rott", "ram", t("Rött bläck"), { badge: "rott-black" }),
  flair("praglad", "ram", t("Präglad"), { words: 80_000 }),
  flair("guld", "ram", t("Guldspets"), { ink: 25_000 }),
  flair("skribent", "titel", t("Skribent")),
  flair("novellist", "titel", t("Novellist"), { words: 10_000 }),
  flair("romanforfattare", "titel", t("Romanförfattare"), { words: 80_000 }),
  flair("epiker", "titel", t("Epiker"), { words: 200_000 }),
  flair("nattuggla", "titel", t("Nattuggla"), { badge: "nattuggla" }),
  flair("morgonpigg", "titel", t("Morgonpigg"), { badge: "morgonpigg" }),
  flair("redaktor", "titel", t("Redaktör"), { badge: "rott-black" }),
  flair("tryckt", "titel", t("Tryckt"), { badge: "till-tryck" }),
  flair("blackmastare", "titel", t("Bläckmästare"), { ink: 10_000 }),
];

export function isUnlocked(item: Flair, earned: Earned): boolean {
  const unlock = item.unlock;
  if (unlock === null) return true;
  if ("words" in unlock) return earned.words >= unlock.words;
  if ("ink" in unlock) return earned.ink >= unlock.ink;
  return Boolean(earned.badges[unlock.badge]);
}

function hintOf(unlock: Unlock): string {
  if (unlock === null) return "";
  if ("words" in unlock)
    return t("Skriv {count} ord sammanlagt.", { count: formatNumber(unlock.words) });
  if ("ink" in unlock) return t("Samla {count} bläck.", { count: formatNumber(unlock.ink) });
  return badges().find((badge) => badge.id === unlock.badge)?.hint ?? "";
}

/** Every frame and title, whether it is unlocked, and how to unlock it while it is not. */
export const flairWithState = (earned: Earned) =>
  flairs().map((item) => ({
    ...item,
    isUnlocked: isUnlocked(item, earned),
    hint: hintOf(item.unlock),
  }));

/** The frame or title the writer wears: the chosen one while it is unlocked, else none. */
export function wornFlair(id: string, earned: Earned): Flair | null {
  const chosen = flairs().find((item) => item.id === id);
  return chosen && isUnlocked(chosen, earned) ? chosen : null;
}

/** What the journey has counted up to today, as the flair asks for it. */
// For trying the styles in Skrivro Test: only where Skrivro runs from the source, never in a release.
const isAllOpen = () => {
  try {
    return import.meta.env.DEV && localStorage.getItem("skrivro.allt-upplast") === "ja";
  } catch {
    return false;
  }
};

export function earnedOf(journey: Journey, today: string): Earned {
  if (isAllOpen()) {
    const all = Object.fromEntries(badges().map((badge) => [badge.id, today]));
    return { words: 1_000_000, ink: 1_000_000, badges: all };
  }
  const summary = journeySummary(journey, today);
  return { words: summary.words, ink: summary.ink, badges: journey.badges };
}
