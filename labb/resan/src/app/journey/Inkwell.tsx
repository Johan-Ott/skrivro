import { weekday } from "../progress/InsightCards.js";
import { weekOf } from "../../project/progress.js";
import { isHoliday, isOnHoliday, type Journey } from "../../project/journey.js";
import type { Summary } from "../../project/inkwell.js";
import { t } from "../../i18n/i18n.js";

const OUTLINE =
  "M30 34 h50 v10 c10 6 18 18 18 34 v34 a8 8 0 0 1 -8 8 h-70 a8 8 0 0 1 -8 -8 v-34 c0 -16 8 -28 18 -34 z";

function ringOf(journey: Journey, day: string, today: string) {
  if ((journey.words[day] ?? 0) > 0) return "ring done";
  if (day === today) return "ring today";
  if (day > today) return "ring later";
  return isHoliday(journey, day, today) ? "ring holiday" : "ring rest";
}

function Bottle({ share }: { share: number }) {
  const top = Math.round(120 - share * 78);
  return (
    <svg width="110" height="130" viewBox="0 0 110 130" aria-hidden="true">
      <defs>
        <clipPath id="inkwell-shape">
          <path d={OUTLINE} />
        </clipPath>
      </defs>
      <rect className="ink" x="0" y={top} width="110" height="130" clipPath="url(#inkwell-shape)" />
      <path className="glass" d={OUTLINE} />
      <rect className="glass" x="38" y="18" width="34" height="16" rx="3" />
      <path className="glass" d="M58 10 l14 -8" />
    </svg>
  );
}

function InkwellCount({ summary }: { summary: Summary }) {
  return (
    <div className="inkwell-row">
      <Bottle share={summary.record > 0 ? summary.days / summary.record : 0} />
      <div className="inkwell-count">
        <span className="inkwell-days">{summary.days}</span>
        <span className="inkwell-label">{t("dagar i rad")}</span>
        <span className="inkwell-hint">
          {t("Rekord {count}. Fylls en dag i taget.", { count: summary.record })}
        </span>
      </div>
    </div>
  );
}

function InkwellWeek({ journey, today }: { journey: Journey; today: string }) {
  return (
    <div className="inkwell-week">
      {weekOf(journey.words, today).map(({ day }) => (
        <span key={day} className="inkwell-day">
          <span className={ringOf(journey, day, today)} />
          <span>{weekday(day)}</span>
        </span>
      ))}
    </div>
  );
}

/** Bläckhornet: the days in a row, filled one day at a time towards the record. */
export function Inkwell(props: {
  journey: Journey;
  summary: Summary;
  today: string;
  onHoliday: (isOn: boolean) => void;
}) {
  const { journey, summary, today } = props;
  const isAway = isOnHoliday(journey);
  return (
    <section className="journey-inkwell" aria-label={t("Bläckhornet")}>
      <span className="journey-kicker">{t("Bläckhornet")}</span>
      <InkwellCount summary={summary} />
      <InkwellWeek journey={journey} today={today} />
      <span className="inkwell-hint">
        {t("Ringar utan fyllning är vilodagar. En vilodag bryter inte bläckhornet, två gör det.")}
      </span>
      <button
        className="inkwell-holiday"
        aria-pressed={isAway}
        onClick={() => props.onHoliday(!isAway)}
      >
        {isAway ? t("Semesterläge på · bläcket torkar inte") : t("Slå på semesterläge")}
      </button>
    </section>
  );
}
