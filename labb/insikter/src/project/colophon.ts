import { dayAfter, daysBetween } from "./progress.js";
import type { Stats } from "./stats.js";
import { numberLocale, t, formatNumber } from "../i18n/i18n.js";

const dateOf = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString(numberLocale(), { ...options, timeZone: "UTC" });

// The most days in a row the book was written on.
function longestRun(days: string[]) {
  let best = 0;
  let run = 0;
  days.forEach((day, index) => {
    run = index > 0 && dayAfter(days[index - 1] ?? day, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

/** The book's writing told as a printed book's last page: when, how much, and its best days. */
export function colophon(title: string, stats: Stats, words: number, today: string): string[] {
  const days = Object.keys(stats)
    .filter((day) => (stats[day] ?? 0) > 0)
    .sort();
  const first = days[0];
  if (!first) return [];
  const best = days.reduce((top, day) => ((stats[day] ?? 0) > (stats[top] ?? 0) ? day : top));
  const span = daysBetween(first, today) + 1;
  const run = longestRun(days);
  const date = dateOf(first, { day: "numeric", month: "long" });
  return [
    days.length === 1
      ? t("{title} har skrivits sedan den {date}.", { title, date })
      : t("{title} har skrivits sedan den {date}, på {days} dagar av {span}.", {
          title,
          date,
          days: days.length,
          span,
        }),
    t("Den har {words} ord. Den längsta dagen gav {best} av dem, en {weekday} i {month}.", {
      words: formatNumber(words),
      best: formatNumber(stats[best] ?? 0),
      weekday: dateOf(best, { weekday: "long" }),
      month: dateOf(best, { month: "long" }),
    }),
    ...(run > 1 ? [t("Som mest skrevs den {count} dagar i rad.", { count: run })] : []),
  ];
}
