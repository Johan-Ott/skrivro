import { journeySummary } from "../../project/inkwell.js";
import type { Journey } from "../../project/journey.js";
import { formatNumber, t } from "../../i18n/i18n.js";
import { KICKER } from "./studioCards.js";
import { PROSE, text, type Card } from "./studioCanvas.js";
import { portrait, type Author } from "./studioSignature.js";

/** What the writer's card counts, each with its label: level, words, longest run and badges. */
export function writerFacts(journey: Journey, today: string): [string, string][] {
  const summary = journeySummary(journey, today);
  return [
    [summary.level.name, t("nivå")],
    [formatNumber(summary.words), t("ord")],
    [String(Math.max(summary.days, summary.record)), t("dagar i rad, rekord")],
    [String(Object.keys(journey.badges).length), t("märken")],
  ];
}

/** Författarkort: the writer as a player card, to share. Laid out from the card's middle. */
export function drawWriter(card: Card, author: Author, facts: [string, string][]) {
  const middle = card.height / 2;
  const radius = Math.min(56, card.height * 0.14);
  text(card, t("Författare"), { x: 44, y: 44 }, KICKER);
  portrait(card, author, { x: 250, y: middle - 96 + (56 - radius) }, radius);
  const name = author.name.trim() || t("Ditt namn");
  text(
    card,
    name,
    { x: 250, y: middle + 10 },
    { size: 30, weight: 600, font: PROSE, align: "center" },
  );
  if (author.title)
    text(
      card,
      author.title,
      { x: 250, y: middle + 32 },
      { size: 11, spacing: 0.12, upper: true, alpha: 0.65, align: "center" },
    );
  facts.forEach(([value, label], index) => {
    const x = 70 + index * 120;
    text(card, value, { x, y: middle + 88 }, { size: 20, weight: 500, align: "center" });
    text(card, label, { x, y: middle + 106 }, { size: 10, alpha: 0.6, align: "center" });
  });
}
