import { shortDay, weekOf } from "../../project/progress.js";
import { streak, type Stats } from "../../project/stats.js";
import { chapterWords } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import { numberLocale, t, formatNumber } from "../../i18n/i18n.js";

// Under Mål: the words of each day this week, and of each chapter.

/** The day's first letter, M for Monday. */
const weekday = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(numberLocale(), {
    weekday: "narrow",
    timeZone: "UTC",
  });

// "·" for a day without words, "1,3k" from a thousand.
function shortWords(words: number) {
  if (words <= 0) return "·";
  if (words < 1000) return formatNumber(words);
  return `${(words / 1000).toLocaleString(numberLocale(), { maximumFractionDigits: 1 })}k`;
}

function barClass(words: number, best: number) {
  if (words === best) return "bar best";
  return words > 0 ? "bar" : "bar empty";
}

function DayBar({ day, words, best }: { day: string; words: number; best: number }) {
  return (
    <div className="insight-day-bar" title={`${shortDay(day)}: ${formatNumber(words)}`}>
      <span>{shortWords(words)}</span>
      <span className="bar-room">
        <span
          className={barClass(words, best)}
          style={{ height: `${Math.max(3, Math.round((words / best) * 32))}px` }}
        />
      </span>
      <span className="insight-muted">{weekday(day)}</span>
    </div>
  );
}

function paceLine(stats: Stats, today: string, average: number) {
  const days = streak(stats, today);
  return t("{streak} i rad · i snitt {average} ord per dag", {
    streak: days === 1 ? t("1 dag") : t("{count} dagar", { count: days }),
    average: formatNumber(average),
  });
}

/** The best day in green. */
export function WeekBars(props: { stats: Stats; today: string; average: number }) {
  const week = weekOf(props.stats, props.today);
  const best = Math.max(1, ...week.map((day) => day.words));
  const total = week.reduce((sum, day) => sum + day.words, 0);
  return (
    <section className="progress-section">
      <div className="insight-row">
        <span className="progress-label">{t("Den här veckan")}</span>
        <span className="progress-label">{t("{count} ord", { count: formatNumber(total) })}</span>
      </div>
      <div className="insight-week">
        {week.map((day) => (
          <DayBar key={day.day} day={day.day} words={day.words} best={best} />
        ))}
      </div>
      <span className="progress-label">{paceLine(props.stats, props.today, props.average)}</span>
    </section>
  );
}

export function ChapterBars({ project }: { project: Project }) {
  const chapters = chapterWords(project.tree, project.summaries);
  const most = Math.max(1, ...chapters.map((chapter) => chapter.words));
  if (chapters.length === 0) return null;
  return (
    <section className="progress-section">
      <span className="progress-label">{t("Ord per kapitel")}</span>
      {chapters.map((chapter) => (
        <div key={chapter.id} className="chapter-bar">
          <span className="chapter-name">{chapter.label}</span>
          <div className="progress-bar thin">
            <div style={{ width: `${(100 * chapter.words) / most}%` }} />
          </div>
          <span className="progress-label">{formatNumber(chapter.words)}</span>
        </div>
      ))}
    </section>
  );
}
