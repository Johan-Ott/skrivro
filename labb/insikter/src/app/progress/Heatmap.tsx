import { heatmap, shortDay } from "../../project/progress.js";
import type { Stats } from "../../project/stats.js";
import { t, formatNumber } from "../../i18n/i18n.js";

export function Heatmap(props: { stats: Stats; today: string; dailyGoal: number | null }) {
  return (
    <section className="progress-section">
      <span className="progress-label">{t("Senaste 12 veckorna")}</span>
      <div className="heatmap">
        {heatmap(props.stats, props.today, props.dailyGoal).map((cell) => (
          <div
            key={cell.day}
            className={cell.level === null ? "heat future" : `heat level-${cell.level}`}
            title={
              cell.level === null
                ? undefined
                : `${shortDay(cell.day)}: ${formatNumber(cell.words)} ord`
            }
          />
        ))}
      </div>
    </section>
  );
}
