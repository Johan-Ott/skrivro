import { journeySummary } from "../../project/inkwell.js";
import { INK, type Journey } from "../../project/journey.js";
import { dayKey } from "../../project/stats.js";
import { Dialog } from "@llkit/controls.js";
import { textsToday } from "./todayTexts.js";
import { numberLocale, t, formatNumber } from "../../i18n/i18n.js";

const DROP =
  "M148 35 C170 60 178 78 178 92 C178 109 165 120 148 120 C131 120 118 109 118 92 C118 78 126 60 148 35 Z";

function paceText(days: number) {
  if (days >= 2) return t("Du är i farten. {count} dagar i rad nu.", { count: days });
  if (days === 1) return t("Första dagen i rad. Bra början.");
  return t("Skriv några rader, så börjar bläckhornet fyllas.");
}

// The ink drop on green, ticked once the day's goal is reached.
function Drop({ isDone }: { isDone: boolean }) {
  return (
    <svg width="296" height="150" viewBox="0 0 296 150" aria-hidden="true">
      <circle cx="148" cy="75" r="64" style={{ fill: "var(--primary)" }} />
      <path d={DROP} style={{ fill: "var(--on-primary)" }} />
      {isDone && (
        <path
          d="M134 90 l10 10 l20 -22"
          fill="none"
          style={{ stroke: "var(--primary)" }}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

// The texts that got the most words today, as the design lists them under the day's total.
function TodayTexts() {
  const texts = textsToday().slice(0, 4);
  return texts.map((text) => (
    <div key={text.title} className="day-dialog-text">
      <span>{text.title || t("Namnlös scen")}</span>
      <span className="day-dialog-quiet">{formatNumber(text.words)}</span>
    </div>
  ));
}

function InkLine({ journey }: { journey: Journey }) {
  const today = dayKey(Date.now());
  const summary = journeySummary(journey, today);
  const words = Math.floor((journey.words[today] ?? 0) / 100) * INK.hundredWords;
  const inkToday = words + (journey.ink[today] ?? 0);
  return (
    <>
      <span className="day-dialog-quiet">{paceText(summary.days)}</span>
      <TodayTexts />
      <div className="day-dialog-ink">
        <span>{t("+ {count} bläck idag", { count: formatNumber(inkToday) })}</span>
        <span className="day-dialog-quiet">{`${summary.rank.name} · ${formatNumber(summary.ink)}`}</span>
      </div>
    </>
  );
}

/** Dagens mål: what today brought, in words, days in a row and ink. */
export function DayDialog(props: {
  words: number;
  goal: number | null;
  journey: Journey;
  onGoals: () => void;
  onClose: () => void;
}) {
  const options = { weekday: "short", day: "numeric", month: "short" } as const;
  return (
    <Dialog label={t("Dagens mål")} className="day-dialog" onClose={props.onClose}>
      <span className="day-dialog-quiet">
        {new Date().toLocaleDateString(numberLocale(), options)}
      </span>
      <Drop isDone={props.goal !== null && props.words >= props.goal} />
      <span className="day-dialog-words">
        {t("{count} ord skrivna", { count: formatNumber(props.words) })}
      </span>
      <InkLine journey={props.journey} />
      <div className="dialog-actions">
        <button className="button day-dialog-ghost" onClick={props.onGoals}>
          {t("Ändra mål")}
        </button>
        <button className="button day-dialog-solid" onClick={props.onClose}>
          {t("Stäng")}
        </button>
      </div>
    </Dialog>
  );
}
