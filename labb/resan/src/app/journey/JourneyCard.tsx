import type { Summary } from "../../project/inkwell.js";
import { t, formatNumber } from "../../i18n/i18n.js";

function factsOf(summary: Summary) {
  const next = summary.level.next;
  const days =
    summary.days === 1 ? t("1 dag i rad") : t("{count} dagar i rad", { count: summary.days });
  return [
    next &&
      t("{count} ord till {level}", {
        count: formatNumber(next[1] - summary.words),
        level: next[0],
      }),
    t("{count} bläck", { count: formatNumber(summary.ink) }),
    days,
  ];
}

/** In Insikter: the level and the ink, and the way into the whole journey. */
export function JourneyCard({ summary, onOpen }: { summary: Summary; onOpen: () => void }) {
  return (
    <button className="insight-card insight-journey" onClick={onOpen}>
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <rect className="spine done" x="6" y="16" width="9" height="34" rx="1.5" />
        <rect className="spine now" x="17" y="10" width="11" height="40" rx="1.5" />
        <rect className="spine next" x="30" y="20" width="8" height="30" rx="1.5" />
        <path className="shelf" d="M2 50 h52" />
      </svg>
      <span className="insight-journey-words">
        <span className="insight-title">
          {summary.level.name} · {summary.rank.name}
        </span>
        <span className="insight-muted">{factsOf(summary).filter(Boolean).join(" · ")}</span>
      </span>
    </button>
  );
}
