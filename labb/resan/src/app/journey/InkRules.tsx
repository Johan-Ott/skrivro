import type { Summary } from "../../project/inkwell.js";
import { INK, inkRanks } from "../../project/journey.js";
import { t, formatNumber } from "../../i18n/i18n.js";

function RuleList() {
  const rules: [string, string][] = [
    [t("Dagens mål nått"), `+${INK.goal}`],
    [t("Varje 100 ord"), `+${INK.hundredWords}`],
    [t("Scen satt som Klar"), `+${INK.sceneDone}`],
    [t("Kommentar avbockad"), `+${INK.commentDone}`],
    [t("Andra dagen i rad utan ord"), `−${INK.missedDay}`],
  ];
  return rules.map(([what, points]) => (
    <div key={what} className="ink-rule">
      <span>{what}</span>
      <span className="ink-points">{points}</span>
    </div>
  ));
}

function RankList({ summary }: { summary: Summary }) {
  return inkRanks().map(([name, from], index) => (
    <div key={name} className={summary.ink >= from ? "ink-rank reached" : "ink-rank"}>
      <span className="ink-dot" />
      <span className={index === summary.rank.index ? "ink-rank-name now" : "ink-rank-name"}>
        {name}
      </span>
      <span>{t("{count} bläck", { count: formatNumber(from) })}</span>
    </div>
  ));
}

/** What gives ink and what takes it, and the ranks the ink reaches. */
export function InkRules({ summary }: { summary: Summary }) {
  return (
    <section className="journey-ink" aria-label={t("Bläck")}>
      <span className="journey-title">{t("Bläck")}</span>
      <span className="insight-muted">
        {t("Poäng som bara du ser. Du tävlar mot ditt förra jag, inte mot andra.")}
      </span>
      <RuleList />
      <span className="insight-title">{t("Din bläcknivå")}</span>
      <RankList summary={summary} />
      <span className="inkwell-hint">
        {t("Semesterläge pausar avdragen. Inget försvinner för att livet händer.")}
      </span>
    </section>
  );
}
