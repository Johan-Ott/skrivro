import {
  INK,
  inkRanks,
  levels,
  isHoliday,
  journeyDays,
  stepOf,
  totalWords,
  type Journey,
} from "./journey.js";
import { t, formatNumber } from "../i18n/i18n.js";

const wordsOn = (journey: Journey, day: string) => journey.words[day] ?? 0;

/** One day off is a rest; a second in a row breaks the inkwell. Today never does, it is not over. */
export function inkwell(journey: Journey, today: string) {
  let days = 0;
  let record = 0;
  let empty = 0;
  for (const day of journeyDays(journey, today)) {
    if (wordsOn(journey, day) > 0) {
      days++;
      empty = 0;
    } else if (!isHoliday(journey, day, today) && day !== today && ++empty >= 2) days = 0;
    record = Math.max(record, days);
  }
  return { days, record };
}

/** Ink earned, less for each missed day after the first day of rest; never below zero. */
export function inkTotal(journey: Journey, today: string) {
  let total = 0;
  let empty = 0;
  for (const day of journeyDays(journey, today)) {
    const words = wordsOn(journey, day);
    empty = words > 0 || isHoliday(journey, day, today) ? 0 : empty + 1;
    const missed = day !== today && empty >= 2 ? INK.missedDay : 0;
    const earned = Math.floor(words / 100) * INK.hundredWords + (journey.ink[day] ?? 0);
    total = Math.max(0, total + earned - missed);
  }
  return total;
}

/** What the celebrations, Insikter and the journey dialog show. */
export function journeySummary(journey: Journey, today: string) {
  const words = totalWords(journey);
  const ink = inkTotal(journey, today);
  const others = Object.entries(journey.words).filter(([day]) => day !== today);
  return {
    words,
    level: stepOf(levels(), words),
    ink,
    rank: stepOf(inkRanks(), ink),
    ...inkwell(journey, today),
    todayWords: wordsOn(journey, today),
    bestDay: Math.max(0, ...others.map(([, value]) => value)),
  };
}

export type Summary = ReturnType<typeof journeySummary>;

export interface Celebration {
  kind: "goal" | "streak" | "level" | "rank" | "best" | "back" | "milestone" | "badge";
  title: string;
  text: string;
}

const STREAKS = [7, 14, 30, 50, 100, 200, 365];
const BEST_DAY_FROM = 500;

function streakText(days: number): Celebration {
  const title = days === 7 ? t("En vecka i sträck.") : t("{count} dagar i rad.", { count: days });
  return { kind: "streak", title, text: t("Bläckhornet fylls en dag i taget.") };
}

/** What a save just reached; nothing is celebrated twice, since each step is crossed once. */
export function celebrationsBetween(before: Summary, after: Summary): Celebration[] {
  const found: Celebration[] = [];
  if (after.level.index > before.level.index)
    found.push({
      kind: "level",
      title: t("Ny nivå: {level}.", { level: after.level.name }),
      text: t("{count} ord sedan du började.", { count: formatNumber(after.words) }),
    });
  if (after.rank.index > before.rank.index)
    found.push({
      kind: "rank",
      title: t("Ny bläcknivå: {rank}.", { rank: after.rank.name }),
      text: t("{count} bläck.", { count: formatNumber(after.ink) }),
    });
  if (after.days > before.days && STREAKS.includes(after.days)) found.push(streakText(after.days));
  const wasBest = before.todayWords > before.bestDay;
  if (!wasBest && after.todayWords > after.bestDay && after.bestDay >= BEST_DAY_FROM)
    found.push({
      kind: "best",
      title: t("Din bästa dag hittills."),
      text: t("{count} ord idag.", { count: formatNumber(after.todayWords) }),
    });
  return found;
}

export const goalReached = (words: number): Celebration => ({
  kind: "goal",
  title: t("Dagens sida är skriven."),
  text: t("{count} ord. Resten av dagen är din.", { count: formatNumber(words) }),
});
