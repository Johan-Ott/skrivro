import type { Summary } from "./inkwell.js";
import { t } from "../i18n/i18n.js";

/** Första resan leads a new writer through Skrivro; the milestones come with time. */
export type BadgeGroup = "resan" | "milstolpe";

export interface Badge {
  id: string;
  name: string;
  /** How it is unlocked, shown while it is still locked. */
  hint: string;
  group: BadgeGroup;
  /** Reached by the journey's numbers; the rest are unlocked where they happen in the app. */
  isReached?: (summary: Summary) => boolean;
}

const bestDay = (summary: Summary) => Math.max(summary.todayWords, summary.bestDay);
const longestRun = (summary: Summary) => Math.max(summary.days, summary.record);

const badge = (
  id: string,
  [name, hint]: [string, string],
  group: BadgeGroup,
  isReached?: (summary: Summary) => boolean,
): Badge => ({ id, name, hint, group, ...(isReached ? { isReached } : {}) });

// Första resan, in the order a new writer meets them.
const journeyBadges = (): Badge[] => [
  badge(
    "forsta-orden",
    [t("Första orden"), t("Skriv ditt första ord.")],
    "resan",
    (summary) => summary.words > 0,
  ),
  badge(
    "en-sida",
    [t("En hel sida"), t("Skriv 250 ord på en dag.")],
    "resan",
    (summary) => bestDay(summary) >= 250,
  ),
  badge("rollistan", [t("Rollistan"), t("Skapa din första anteckning.")], "resan"),
  badge("dagens-mal", [t("Dagens sida"), t("Nå dagens mål.")], "resan"),
  badge("klar", [t("Klar!"), t("Sätt en scen som Klar.")], "resan"),
  badge("som-en-bok", [t("Som en bok"), t("Läs texten i Läs som bok.")], "resan"),
  badge(
    "tre-dagar",
    [t("Tre dagar i rad"), t("Skriv tre dagar i rad.")],
    "resan",
    (summary) => longestRun(summary) >= 3,
  ),
];

// Unlocked where they happen in the app, not by the journey's numbers.
const eventBadges = (): Badge[] => [
  badge(
    "forsta-utkastet",
    [t("Första utkastet"), t("Nå bokens mål för första utkastet.")],
    "milstolpe",
  ),
  badge("rott-black", [t("Rött bläck"), t("Bocka av en kommentar.")], "milstolpe"),
  badge("ut-i-varlden", [t("Ut i världen"), t("Dela ett utdrag eller ett uppslag.")], "milstolpe"),
  badge("till-tryck", [t("Till tryck"), t("Exportera boken.")], "milstolpe"),
  badge("nattuggla", [t("Nattuggla"), t("Skriv mellan midnatt och fem.")], "milstolpe"),
  badge("morgonpigg", [t("Morgonpigg"), t("Skriv före sju på morgonen.")], "milstolpe"),
];

export const badges = (): Badge[] => [
  ...journeyBadges(),
  ...runs(),
  ...amounts(),
  ...eventBadges(),
];

function runs(): Badge[] {
  const run = (id: string, name: string, days: number) =>
    badge(
      id,
      [name, t("Skriv {count} dagar i rad.", { count: days })],
      "milstolpe",
      (summary) => longestRun(summary) >= days,
    );
  return [
    run("en-vecka", t("En vecka i sträck"), 7),
    run("en-manad", t("En månad i sträck"), 30),
    run("hundra-dagar", t("Hundra dagar"), 100),
  ];
}

function amounts(): Badge[] {
  const inDay = (id: string, texts: [string, string], words: number) =>
    badge(id, texts, "milstolpe", (summary) => bestDay(summary) >= words);
  const inAll = (id: string, texts: [string, string], words: number) =>
    badge(id, texts, "milstolpe", (summary) => summary.words >= words);
  return [
    inDay("tusen-pa-en-dag", [t("Tusen på en dag"), t("Skriv 1 000 ord på en dag.")], 1000),
    inDay("maraton", [t("Maraton"), t("Skriv 5 000 ord på en dag.")], 5000),
    inAll("tiotusen", [t("Tiotusen ord"), t("Skriv 10 000 ord sammanlagt.")], 10_000),
    inAll("nano", [t("NaNo-längd"), t("Skriv 50 000 ord sammanlagt.")], 50_000),
    inAll("hundratusen", [t("Hundratusen ord"), t("Skriv 100 000 ord sammanlagt.")], 100_000),
  ];
}

/** The badges the numbers have reached and the journey does not hold yet. */
export const reachedBadges = (summary: Summary, held: Record<string, string>) =>
  badges().filter((badge) => !held[badge.id] && badge.isReached?.(summary));

/** Writing at night or at dawn unlocks a badge of its own. */
export function badgeForHour(hour: number) {
  if (hour < 5) return "nattuggla";
  return hour < 7 ? "morgonpigg" : null;
}

/** The last badges unlocked, newest first. */
export const latestBadges = (held: Record<string, string>, count: number) =>
  badges()
    .filter((badge) => held[badge.id])
    .sort((first, second) => (held[second.id] ?? "").localeCompare(held[first.id] ?? ""))
    .slice(0, count);
