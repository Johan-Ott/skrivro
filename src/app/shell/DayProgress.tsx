import type { Today } from "../useWritingStats.js";
import { t, formatNumber } from "../../i18n/i18n.js";

export function dayText({ words, goal }: Today) {
  if (!goal) return t("{count} ord idag", { count: formatNumber(words) });
  if (words >= goal) return t("Dagens mål nått · {count} ord", { count: formatNumber(words) });
  return t("{words} / {goal} ord", { words: formatNumber(words), goal: formatNumber(goal) });
}

// The day's words; a click opens Mål, with the book's goals, the week and the chapters.
export function DayProgress({ today, onProgress }: { today: Today; onProgress: () => void }) {
  const share = today.goal ? Math.min(100, (100 * today.words) / today.goal) : null;
  return (
    <button
      className="day-progress"
      aria-label={t("Insikter och mål")}
      title={t("Insikter och mål")}
      onClick={onProgress}
    >
      <span>{dayText(today)}</span>
      {share !== null && (
        <span className="day-progress-bar">
          <span style={{ width: `${share}%` }} />
        </span>
      )}
    </button>
  );
}
