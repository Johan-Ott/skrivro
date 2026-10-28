import { PROSE, text, type Card } from "../studio/studioCanvas.js";
import type { PageBlock } from "./spreadPages.js";

// A page in the design's units: 300 by 450, with text 9 on 14.4 inside its margins.
const PAGE = { width: 300, height: 450, side: 34, top: 44, bottom: 30 };
const SIZE = 9;
const LEADING = 14.4;
const INK = "#1a1a1a";

/** Words broken into lines, the first line shorter by `indent`. */
function wrap(context: CanvasRenderingContext2D, words: string, width: number, indent: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of words.split(/\s+/).filter(Boolean)) {
    const room = lines.length === 0 ? width - indent : width;
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > room && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  return line ? [...lines, line] : lines;
}

type Pen = { card: Card; y: number };
const WIDTH = PAGE.width - PAGE.side * 2;

function drawChapter(pen: Pen, block: { number: string; title: string }) {
  pen.y += 64;
  const centred = { align: "center" as const, font: PROSE, colour: INK };
  text(
    pen.card,
    block.number,
    { x: PAGE.width / 2, y: pen.y },
    { ...centred, size: 7, spacing: 0.22, upper: true, alpha: 0.6 },
  );
  text(
    pen.card,
    block.title,
    { x: PAGE.width / 2, y: pen.y + 26 },
    { ...centred, size: 20, weight: 600 },
  );
  pen.y += 52;
}

function drawText(pen: Pen, block: { text: string; isFirst: boolean; isQuoted: boolean }) {
  const { context } = pen.card;
  const margin = block.isQuoted ? 16 : 0;
  const indent = block.isFirst || block.isQuoted ? 0 : SIZE * 1.5;
  context.font = `${block.isQuoted ? "italic " : ""}${SIZE}px ${PROSE}`;
  context.letterSpacing = "0px";
  context.fillStyle = INK;
  context.textAlign = "left";
  wrap(context, block.text, WIDTH - margin * 2, indent).forEach((line, index) => {
    context.fillText(line, PAGE.side + margin + (index === 0 ? indent : 0), pen.y);
    pen.y += LEADING;
  });
}

function drawBlock(pen: Pen, block: PageBlock) {
  if (block.kind === "chapter") return drawChapter(pen, block);
  if (block.kind === "text") return drawText(pen, block);
  pen.y += 6;
  text(
    pen.card,
    "* * *",
    { x: PAGE.width / 2, y: pen.y + 4 },
    { size: SIZE, spacing: 0.3, align: "center", alpha: 0.55, colour: INK },
  );
  pen.y += LEADING + 6;
}

// White paper, a breath darker right at the fold.
function paperWithFold(context: CanvasRenderingContext2D, isLeft: boolean) {
  const fold = isLeft ? PAGE.width : 0;
  const shade = context.createLinearGradient(
    fold,
    0,
    isLeft ? PAGE.width * 0.95 : PAGE.width * 0.05,
    0,
  );
  shade.addColorStop(0, "rgba(0,0,0,0.035)");
  shade.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, PAGE.width, PAGE.height);
  context.fillStyle = shade;
  context.fillRect(0, 0, PAGE.width, PAGE.height);
}

const QUIET = { alpha: 0.5, align: "center" as const, colour: INK };
const HEAD = { ...QUIET, size: 6, spacing: 0.28, upper: true, font: PROSE };

// The text is cut at the bottom margin, as a page ends; the right page carries the book's title.
function drawPage(
  card: Card,
  page: { blocks: PageBlock[]; number: number; isLeft: boolean; title: string },
) {
  const { context } = card;
  paperWithFold(context, page.isLeft);
  if (!page.isLeft && page.blocks[0]?.kind !== "chapter")
    text(card, page.title, { x: PAGE.width / 2, y: PAGE.top - 16 }, HEAD);
  context.save();
  context.beginPath();
  context.rect(0, PAGE.top - 10, PAGE.width, PAGE.height - PAGE.top - PAGE.bottom);
  context.clip();
  const pen = { card, y: PAGE.top + SIZE };
  page.blocks.forEach((block) => drawBlock(pen, block));
  context.restore();
  text(
    card,
    String(page.number),
    { x: PAGE.width / 2, y: PAGE.height - 14 },
    { ...QUIET, size: 7 },
  );
}

/** The spread on the card, as large as it fits, with a soft shadow under the open book. */
export function drawSpread(card: Card, pages: PageBlock[][], firstNumber: number, title: string) {
  const { context } = card;
  const scale = Math.min(
    (500 * 0.86) / (PAGE.width * pages.length),
    (card.height * 0.86) / PAGE.height,
  );
  const width = PAGE.width * pages.length * scale;
  context.save();
  context.translate((500 - width) / 2, (card.height - PAGE.height * scale) / 2);
  context.scale(scale, scale);
  context.shadowColor = "rgba(0,0,0,0.28)";
  context.shadowBlur = 40;
  context.shadowOffsetY = 20;
  context.fillRect(0, 0, PAGE.width * pages.length, PAGE.height);
  context.shadowColor = "transparent";
  pages.forEach((blocks, index) => {
    context.save();
    context.translate(index * PAGE.width, 0);
    drawPage(card, {
      blocks,
      number: firstNumber + index,
      isLeft: index === 0 && pages.length > 1,
      title,
    });
    context.restore();
  });
  context.restore();
}

/** Hela boken: a little page for each written page, and outlined ones for what is left. */
export function drawWholeBook(
  card: Card,
  book: { title: string; label: string; progress: string; written: number; total: number },
) {
  const top = card.height / 2 - 150;
  text(
    card,
    book.title,
    { x: 250, y: top },
    { size: 30, weight: 600, font: PROSE, align: "center" },
  );
  text(card, book.label, { x: 250, y: top + 22 }, { size: 13, alpha: 0.65, align: "center" });
  text(card, book.progress, { x: 250, y: top + 40 }, { size: 11, alpha: 0.5, align: "center" });
  const columns = Math.max(1, Math.min(24, book.total));
  const width = 12 * columns + 4 * (columns - 1);
  for (let index = 0; index < book.total; index++) {
    const x = (500 - width) / 2 + (index % columns) * 16;
    const y = top + 58 + Math.floor(index / columns) * 21;
    card.context.fillStyle = card.ink;
    card.context.strokeStyle = "rgba(128,128,128,0.5)";
    if (index < book.written) card.context.fillRect(x, y, 12, 17);
    else card.context.strokeRect(x + 0.5, y + 0.5, 11, 16);
  }
}
