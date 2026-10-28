import { dayAfter } from "./progress.js";
import type { Stats } from "./stats.js";
import { t } from "../i18n/i18n.js";

/** Days from `from` to `to`, or to today while it lasts, neither break the inkwell nor cost ink. */
export interface Holiday {
  from: string;
  to: string | null;
}

/** The writer's journey on one device, or on all of them added up. */
export interface Journey {
  /** Words written each day, in every book. */
  words: Stats;
  /** Ink earned each day for goals, finished scenes and resolved comments. */
  ink: Stats;
  holidays: Holiday[];
  /** Badges unlocked, each with the day it was. */
  badges: Record<string, string>;
}

export const NO_JOURNEY: Journey = { words: {}, ink: {}, holidays: [], badges: {} };

export const INK = { goal: 50, hundredWords: 5, sceneDone: 20, commentDone: 2, missedDay: 10 };

type Step = readonly [name: string, from: number];

/** Levels count the words written in every book; their names are read in the writer's language. */
export const levels = (): readonly Step[] => [
  [t("Första orden"), 0],
  [t("Anteckningsbok"), 1000],
  [t("Novell"), 10_000],
  [t("Kortroman"), 40_000],
  [t("Roman"), 80_000],
  [t("Epos"), 200_000],
];

export const inkRanks = (): readonly Step[] => [
  [t("Bläckplump"), 0],
  [t("Kulspets"), 500],
  [t("Blyerts"), 2000],
  [t("Reservoar"), 5000],
  [t("Fjäderpenna"), 10_000],
  [t("Guldspets"), 25_000],
];

/** The step reached, and the next one when there is one. */
export function stepOf(steps: readonly Step[], value: number) {
  const index = steps.reduce((found, [, from], each) => (value >= from ? each : found), 0);
  return { index, name: steps[index]?.[0] ?? "", next: steps[index + 1] ?? null };
}

const add = (stats: Stats, day: string, amount: number): Stats => ({
  ...stats,
  [day]: (stats[day] ?? 0) + amount,
});

/** Words taken away are not counted: the journey only grows. */
export const withWords = (journey: Journey, day: string, words: number): Journey =>
  words > 0 ? { ...journey, words: add(journey.words, day, words) } : journey;

export const withInk = (journey: Journey, day: string, points: number): Journey => ({
  ...journey,
  ink: add(journey.ink, day, points),
});

export function withHoliday(journey: Journey, isOn: boolean, today: string): Journey {
  const open = journey.holidays.filter((holiday) => holiday.to === null);
  if (isOn === open.length > 0) return journey;
  const holidays = isOn
    ? [...journey.holidays, { from: today, to: null }]
    : journey.holidays.map((holiday) =>
        holiday.to === null ? { ...holiday, to: today } : holiday,
      );
  return { ...journey, holidays };
}

export const isOnHoliday = (journey: Journey) =>
  journey.holidays.some((holiday) => holiday.to === null);

const sumOf = (stats: Stats) => Object.values(stats).reduce((sum, value) => sum + value, 0);

export const totalWords = (journey: Journey) => sumOf(journey.words);

function addStats(all: Stats[]) {
  return all.reduce<Stats>((sum, stats) => {
    for (const [day, value] of Object.entries(stats)) sum[day] = (sum[day] ?? 0) + value;
    return sum;
  }, {});
}

// A badge unlocked on two devices keeps the earlier day.
const earliest = (all: Record<string, string>[]) =>
  all.reduce<Record<string, string>>((kept, badges) => {
    for (const [id, day] of Object.entries(badges)) if (!kept[id] || day < kept[id]) kept[id] = day;
    return kept;
  }, {});

/** Every device's file added up. */
export const mergedJourney = (parts: Journey[]): Journey => ({
  words: addStats(parts.map((part) => part.words)),
  ink: addStats(parts.map((part) => part.ink)),
  holidays: parts.flatMap((part) => part.holidays),
  badges: earliest(parts.map((part) => part.badges)),
});

/** A badge is kept with the day it was first unlocked. */
export const withBadge = (journey: Journey, id: string, day: string): Journey =>
  journey.badges[id] ? journey : { ...journey, badges: { ...journey.badges, [id]: day } };

/** The days from the first one with words or ink up to today, oldest first. */
export function journeyDays(journey: Journey, today: string) {
  const first = [...Object.keys(journey.words), ...Object.keys(journey.ink)].sort()[0];
  const days: string[] = [];
  for (let day = first; day && day <= today; day = dayAfter(day, 1)) days.push(day);
  return days;
}

export const isHoliday = (journey: Journey, day: string, today: string) =>
  journey.holidays.some((holiday) => holiday.from <= day && day <= (holiday.to ?? today));
