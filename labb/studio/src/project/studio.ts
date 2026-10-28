import { DAY } from "./stats.js";
import { journeySummary } from "./inkwell.js";
import type { Journey } from "./journey.js";
import { daysBetween, weekOf } from "./progress.js";
import type { Stats } from "./stats.js";

/** ISO week number: the week with the year's first Thursday is week 1. */
export function weekNumber(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 3 - ((date.getUTCDay() + 6) % 7));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.floor((thursday.getTime() - yearStart) / DAY / 7) + 1;
}

/** This week in the book: the words of each day, the writing days and the best day. */
export function weekFigures(stats: Stats, today: string) {
  const days = weekOf(stats, today);
  const best = days.reduce(
    (top, day) => (day.words > top.words ? day : top),
    days[0] ?? { day: today, words: 0 },
  );
  return {
    week: weekNumber(today),
    days,
    words: days.reduce((sum, day) => sum + day.words, 0),
    writingDays: days.filter((day) => day.words > 0).length,
    best,
  };
}

/** The writer's year in every book: words, writing days, the record run and the best month. */
export function yearFigures(journey: Journey, today: string) {
  const year = today.slice(0, 4);
  const days = Object.entries(journey.words).filter(
    ([day, words]) => day.startsWith(year) && words > 0,
  );
  const months = new Map<number, number>();
  for (const [day, words] of days) {
    const month = Number(day.slice(5, 7));
    months.set(month, (months.get(month) ?? 0) + words);
  }
  const bestMonth = [...months].sort((one, two) => two[1] - one[1])[0]?.[0] ?? null;
  const summary = journeySummary(journey, today);
  return {
    year,
    words: days.reduce((sum, [, words]) => sum + words, 0),
    writingDays: days.length,
    record: summary.record,
    bestMonth,
    level: summary.level.name,
  };
}

/** Days left to the release, never below zero; null without a release day. */
export const daysToRelease = (release: string | null, today: string) =>
  release && /^\d{4}-\d{2}-\d{2}$/.test(release) ? Math.max(0, daysBetween(today, release)) : null;

/** The first paragraphs that hold about `words` words, for an excerpt in a newsletter. */
export function excerptBlocks<T>(blocks: T[], wordsOf: (block: T) => number, words: number) {
  const kept: T[] = [];
  let count = 0;
  for (const block of blocks) {
    if (count >= words) break;
    kept.push(block);
    count += wordsOf(block);
  }
  return kept;
}
