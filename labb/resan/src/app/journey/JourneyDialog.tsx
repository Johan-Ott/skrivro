import { journeySummary, type Summary } from "../../project/inkwell.js";
import { levels, type Journey } from "../../project/journey.js";
import { dayKey } from "../../project/stats.js";
import { Dialog } from "@llkit/controls.js";
import { InkRules } from "./InkRules.js";
import { Inkwell } from "./Inkwell.js";
import { t, formatNumber } from "../../i18n/i18n.js";
import { latestBadges } from "../../project/badges.js";
import { Medal } from "../profile/Badges.js";

// Each level a book spine, taller the further it is; reached ones dark, the current one green.
const SPINES = [
  [18, 70],
  [22, 95],
  [28, 125],
  [34, 160],
  [42, 195],
  [52, 225],
];

function spineClass(index: number, current: number) {
  if (index === current) return "level-spine now";
  return index < current ? "level-spine done" : "level-spine";
}

function Spines({ current }: { current: number }) {
  return (
    <div className="level-shelf" role="list" aria-label={t("Nivåer")}>
      {levels().map(([name, from], index) => (
        <div key={name} className="level" role="listitem">
          <div
            className={spineClass(index, current)}
            style={{ width: SPINES[index]?.[0], height: SPINES[index]?.[1] }}
          >
            <span>{name}</span>
          </div>
          <span className="insight-muted">{from === 0 ? t("start") : `${from / 1000}k`}</span>
        </div>
      ))}
    </div>
  );
}

function wordsLine({ words, level }: Summary) {
  const since = t("{count} ord sedan du började.", { count: formatNumber(words) });
  if (!level.next) return since;
  const left = formatNumber(level.next[1] - words);
  return `${since} ${t("{count} ord kvar till {level}.", { count: left, level: level.next[0] })}`;
}

function wayLine({ words, level }: Summary) {
  if (!level.next) return t("Nivåer räknas i ord du skrivit, i alla böcker.");
  const share = Math.round((100 * words) / level.next[1]);
  return t("{share} % av vägen till {level}. Nivåer räknas i ord du skrivit, i alla böcker.", {
    share,
    level: level.next[0],
  });
}

function LevelShelf({ summary }: { summary: Summary }) {
  const next = summary.level.next;
  const share = next ? Math.round((100 * summary.words) / next[1]) : 100;
  return (
    <section className="journey-levels" aria-label={t("Din skrivarresa")}>
      <span className="journey-kicker">{t("Din skrivarresa")}</span>
      <span className="journey-headline">
        {summary.level.index === 0 ? (
          t("Här börjar resan.")
        ) : (
          <>
            {t("Du är en")} <em>{summary.level.name}</em>.
          </>
        )}
      </span>
      <span className="journey-sub">{wordsLine(summary)}</span>
      <Spines current={summary.level.index} />
      <div className="progress-bar journey-bar">
        <div style={{ width: `${share}%` }} />
      </div>
      <span className="insight-muted">{wayLine(summary)}</span>
    </section>
  );
}

/** The whole journey: levels in words, the inkwell of days in a row, and the ink. */
// The newest badges under the journey; all of them are in the profile.
function RecentBadges({ held }: { held: Record<string, string> }) {
  const latest = latestBadges(held, 3);
  if (latest.length === 0) return null;
  return (
    <div className="journey-badges">
      <span className="field-label">{t("Senaste utmärkelserna")}</span>
      <ul className="badge-grid">
        {latest.map((badge) => (
          <Medal key={badge.id} badge={badge} day={held[badge.id]} />
        ))}
      </ul>
      <span className="setting-hint">{t("Alla utmärkelser finns i din profil.")}</span>
    </div>
  );
}

export function JourneyDialog(props: {
  journey: Journey;
  onHoliday: (isOn: boolean) => void;
  onClose: () => void;
}) {
  const today = dayKey(Date.now());
  const summary = journeySummary(props.journey, today);
  return (
    <Dialog label={t("Skrivarresan")} className="journey-dialog" onClose={props.onClose}>
      <div className="journey-grid">
        <LevelShelf summary={summary} />
        <Inkwell
          journey={props.journey}
          summary={summary}
          today={today}
          onHoliday={props.onHoliday}
        />
        <InkRules summary={summary} />
      </div>
      <RecentBadges held={props.journey.badges} />
    </Dialog>
  );
}
