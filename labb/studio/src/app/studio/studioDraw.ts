import { journeySummary } from "../../project/inkwell.js";
import type { Journey } from "../../project/journey.js";
import { shortDay } from "../../project/progress.js";
import { dayKey, type Stats } from "../../project/stats.js";
import { daysToRelease, weekFigures, yearFigures } from "../../project/studio.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import { penMark, startCard, type Card, type CardFormat, type Look } from "./studioCanvas.js";
import { drawSignature, type Author } from "./studioSignature.js";
import { drawWriter, writerFacts } from "./studioWriter.js";
import {
  drawCountdown,
  drawCover,
  drawMilestone,
  drawRelease,
  drawWeek,
  drawYear,
} from "./studioCards.js";
import { bookOutline, estimatedPages } from "../../export/book.js";
import { KIND_LABELS } from "../../project/shelf.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import { numberLocale, t, formatNumber } from "../../i18n/i18n.js";
import { earnBadge } from "../journey/journeyEvents.js";

export type ImageCardId =
  "vecka" | "skrivar" | "milstolpe" | "forfattare" | "omslag" | "nedrakning" | "handeln";

export interface StudioData {
  project: Project;
  stats: Stats;
  journey: Journey;
  /** The link from the writer's profile. */
  link: string;
  /** The book's cover picture, when it has one. */
  cover: ImageBitmap | null;
  author: Author;
}

export const bookField = (project: Project, key: string) => {
  const value = project.fields[key];
  return typeof value === "string" ? value : "";
};

function countdown(card: Card, { project }: StudioData, today: string) {
  const release = bookField(project, "releaseDate");
  const when = release ? shortDay(release) : t("Sätt utgivningsdag");
  drawCountdown(card, daysToRelease(release, today), project.name, when);
}

function milestone(card: Card, { project, stats }: StudioData, today: string) {
  const words = manuscriptWords(project.tree, project.summaries);
  const pages = estimatedPages(words, bookOutline(project.tree));
  const days = Object.values(stats).filter((count) => count > 0).length;
  const kind = project.fields["type"];
  drawMilestone(card, {
    name: bookField(project, "milestone") || t("Första utkastet"),
    book: project.name,
    kind: (typeof kind === "string" && KIND_LABELS[kind]) || "",
    date: new Date(`${today}T12:00:00`).toLocaleDateString(numberLocale(), { dateStyle: "long" }),
    facts: t("{words} ord · {pages} sidor · {days} skrivdagar", {
      words: formatNumber(words),
      pages,
      days,
    }),
  });
}

const DRAWERS: Record<ImageCardId, (card: Card, data: StudioData, today: string) => void> = {
  vecka: (card, data, today) =>
    drawWeek(
      card,
      weekFigures(data.stats, today),
      data.project.name,
      journeySummary(data.journey, today).days,
    ),
  skrivar: (card, data, today) => drawYear(card, yearFigures(data.journey, today)),
  milstolpe: milestone,
  forfattare: (card, data, today) =>
    drawWriter(card, data.author, writerFacts(data.journey, today)),
  omslag: (card, data) => {
    const release = bookField(data.project, "releaseDate");
    const out = release ? t("Ute {day}.", { day: shortDay(release) }) : "";
    drawCover(card, data.cover, data.project.name, out);
  },
  nedrakning: countdown,
  handeln: (card, data) =>
    drawRelease(card, data.project.name, bookField(data.project, "quote"), data.link),
};

export interface ImageChoices {
  look: Look;
  format: CardFormat;
  isMarked: boolean;
  /** The writer's picture, name and title in the corner. */
  isSigned: boolean;
}

export function drawCard(
  canvas: HTMLCanvasElement,
  id: ImageCardId,
  choices: ImageChoices,
  data: StudioData,
) {
  const card = startCard(canvas, choices.look, choices.format);
  if (!card) return;
  DRAWERS[id](card, data, dayKey(Date.now()));
  if (choices.isMarked) penMark(card);
  // Författarkort is the writer already; a signature there would say it twice.
  if (choices.isSigned && id !== "forfattare") drawSignature(card, data.author);
}

const PNG = { name: t("Bild"), extension: "png" };
const pngOf = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));

export async function savePng(canvas: HTMLCanvasElement, name: string) {
  const blob = await pngOf(canvas);
  if (!blob) return;
  const path = await platform.saveFile(
    `${name}.png`,
    new Uint8Array(await blob.arrayBuffer()),
    PNG,
  );
  if (path) earnBadge("ut-i-varlden");
}

export async function copyPng(canvas: HTMLCanvasElement) {
  const blob = await pngOf(canvas);
  if (!blob) return;
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  earnBadge("ut-i-varlden");
}
