import type { weekFigures, yearFigures } from "../../project/studio.js";
import { MONTHS } from "../../project/snapshots.js";
import { GREEN, PROSE, bar, lines, text, type Card } from "./studioCanvas.js";
import { numberLocale, t, formatNumber } from "../../i18n/i18n.js";

export const KICKER = { size: 11, spacing: 0.24, upper: true, alpha: 0.6 };
const dayName = (day: string, weekday: "narrow" | "long") =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(numberLocale(), { weekday, timeZone: "UTC" });

type Week = ReturnType<typeof weekFigures>;

function barColour(card: Card, words: number, most: number) {
  if (words === most) return GREEN;
  return words > 0 ? card.ink : "rgba(128,128,128,0.25)";
}

function weekBars(card: Card, figures: Week, bottom: number) {
  const most = Math.max(1, ...figures.days.map((day) => day.words));
  const step = 412 / 7;
  figures.days.forEach((day, index) => {
    const height = Math.max(3, Math.round((day.words / most) * 70));
    const x = 44 + index * step;
    bar(
      card,
      { x, y: bottom - 16 - height, width: step - 10, height },
      barColour(card, day.words, most),
    );
    const label = { x: x + (step - 10) / 2, y: bottom };
    text(card, dayName(day.day, "narrow"), label, { size: 10, alpha: 0.55, align: "center" });
  });
}

function weekFooter(card: Card, figures: Week, streak: number) {
  const y = card.height - 44;
  const days = figures.writingDays;
  const writing = days === 1 ? t("1 skrivdag") : t("{count} skrivdagar", { count: days });
  text(card, writing, { x: 44, y }, { size: 13 });
  const inRow = streak === 1 ? t("1 dag i rad") : t("{count} dagar i rad", { count: streak });
  text(card, inRow, { x: 250, y }, { size: 13, align: "center" });
  if (figures.best.words === 0) return;
  const best = t("bäst: {day}, {count}", {
    day: dayName(figures.best.day, "long"),
    count: formatNumber(figures.best.words),
  });
  text(card, best, { x: 456, y }, { size: 13, colour: GREEN, align: "right" });
}

export function drawWeek(card: Card, figures: Week, book: string, streak: number) {
  text(card, t("Veckan i siffror · v. {week}", { week: figures.week }), { x: 44, y: 56 }, KICKER);
  const middle = (card.height - 150) / 2;
  text(
    card,
    formatNumber(figures.words),
    { x: 44, y: middle },
    { size: 72, weight: 500, spacing: -0.04 },
  );
  const words = t("ord på {book}", { book });
  text(card, words, { x: 44, y: middle + 32 }, { size: 18, font: PROSE, alpha: 0.75 });
  weekBars(card, figures, card.height - 78);
  weekFooter(card, figures, streak);
}

function yearFacts(figures: ReturnType<typeof yearFigures>): [string, string][] {
  const month = figures.bestMonth ? (MONTHS[figures.bestMonth - 1] ?? "") : "–";
  return [
    [formatNumber(figures.words), t("ord")],
    [String(figures.writingDays), t("skrivdagar")],
    [String(figures.record), t("dagar i rad, rekord")],
    [month, t("bästa månad")],
  ];
}

export function drawYear(card: Card, figures: ReturnType<typeof yearFigures>) {
  text(card, t("Ditt skrivår"), { x: 44, y: 56 }, KICKER);
  text(card, figures.year, { x: 44, y: 128 }, { size: 56, weight: 600, font: PROSE });
  yearFacts(figures).forEach(([value, label], index) => {
    const x = 44 + (index % 2) * 218;
    const y = 200 + Math.floor(index / 2) * 70;
    text(card, value, { x, y }, { size: 30, weight: 500, spacing: -0.02 });
    text(card, label, { x, y: y + 20 }, { size: 12, alpha: 0.65 });
  });
  const level = t("I år är du en {level}.", { level: figures.level });
  text(card, level, { x: 44, y: card.height - 44 }, { size: 20, font: PROSE });
}

/** `days` is null before there is a release day, which shows as a question rather than as 0. */
export function drawCountdown(card: Card, days: number | null, book: string, release: string) {
  const middle = card.height / 2;
  const big = { size: 160, weight: 500, spacing: -0.06, align: "center" as const };
  text(card, days === null ? "?" : String(days), { x: 250, y: middle - 10 }, big);
  const left = { ...KICKER, size: 13, alpha: 0.65, align: "center" as const };
  text(card, t("dagar kvar"), { x: 250, y: middle + 26 }, left);
  const title = { size: 26, weight: 600, font: PROSE, align: "center" as const };
  text(card, book, { x: 250, y: middle + 84 }, title);
  text(card, release, { x: 250, y: middle + 108 }, { size: 13, alpha: 0.7, align: "center" });
}

export function drawRelease(card: Card, book: string, quote: string, link: string) {
  text(card, t("Nu i handeln"), { x: 44, y: 56 }, KICKER);
  const title = { size: 52, weight: 600, font: PROSE };
  const end = lines(card, book, { x: 44, y: card.height / 2 - 40 }, title);
  const said = { size: 18, italic: true, font: PROSE, alpha: 0.8 };
  if (quote) lines(card, `”${quote}”`, { x: 44, y: end + 44 }, said);
  if (link) text(card, link, { x: 44, y: card.height - 44 }, { size: 13, alpha: 0.7 });
}

export interface Milestone {
  name: string;
  book: string;
  kind: string;
  date: string;
  facts: string;
}

/** Milstolpe: the moment written out like a title page, centred on the card. */
export function drawMilestone(card: Card, milestone: Milestone) {
  const middle = card.height / 2;
  const centred = { align: "center" as const, font: PROSE };
  text(card, milestone.name, { x: 250, y: middle - 100 }, { ...KICKER, ...centred, spacing: 0.3 });
  text(card, milestone.book, { x: 250, y: middle - 44 }, { ...centred, size: 40, weight: 600 });
  text(
    card,
    milestone.kind,
    { x: 250, y: middle - 16 },
    { ...centred, size: 13, italic: true, alpha: 0.75 },
  );
  bar(card, { x: 230, y: middle + 14, width: 40, height: 1 }, card.ink);
  text(card, milestone.date, { x: 250, y: middle + 56 }, { ...centred, size: 15 });
  text(card, milestone.facts, { x: 250, y: middle + 78 }, { ...centred, size: 13, alpha: 0.65 });
}

// Without a cover picture the book is drawn as a dark cover with its title.
function bookFace(card: Card, cover: ImageBitmap | null, book: string) {
  const place = { x: 70, y: (card.height - 290) / 2, width: 190, height: 290 };
  if (cover) return void card.context.drawImage(cover, place.x, place.y, place.width, place.height);
  bar(card, place, "#1c1c1c");
  lines(
    card,
    book,
    { x: place.x + 18, y: place.y + 70, width: 154 },
    { size: 26, weight: 600, font: PROSE, colour: "#f2f2f2" },
  );
}

/** Omslaget är här: the cover beside a few words, and when the book is out. */
export function drawCover(card: Card, cover: ImageBitmap | null, book: string, out: string) {
  bookFace(card, cover, book);
  const middle = card.height / 2;
  text(card, t("Omslaget"), { x: 296, y: middle - 40 }, KICKER);
  text(card, t("är här."), { x: 296, y: middle }, { size: 30, weight: 600, font: PROSE });
  if (out) text(card, out, { x: 296, y: middle + 28 }, { size: 13, alpha: 0.75 });
}
