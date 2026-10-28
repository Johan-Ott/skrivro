/** The text broken into lines that fit `width` in the canvas's current font. */
function wrapLines(context: CanvasRenderingContext2D, text: string, width: number) {
  return text.split("\n").flatMap((paragraph) => {
    const lines: string[] = [];
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > width && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    return [...lines, line];
  });
}

export type Look = "papper" | "ljus" | "mork";
export type CardFormat = "kvadrat" | "story" | "liggande";

const HEIGHTS: Record<CardFormat, number> = { kvadrat: 500, story: 889, liggande: 309 };

const LOOKS: Record<Look, { paper: string; ink: string; grain: string }> = {
  papper: { paper: "#fbfaf7", ink: "#111111", grain: "rgba(0,0,0,0.035)" },
  ljus: { paper: "#ffffff", ink: "#111111", grain: "rgba(0,0,0,0)" },
  mork: { paper: "#141414", ink: "#f2f2f2", grain: "rgba(255,255,255,0.04)" },
};
export const GREEN = "#0e6b4f";
export const PROSE = '"Literata", Georgia, serif';
const SANS = '"Geist Sans", system-ui, sans-serif';

/** Drawn in the design's units, 500 wide, and scaled to 1080 pixels. */
export interface Card {
  context: CanvasRenderingContext2D;
  /** The card's height in design units: 500 for a square, 889 for a story, 309 lying down. */
  height: number;
  ink: string;
}

interface TextStyle {
  size: number;
  font?: string;
  weight?: number;
  italic?: boolean;
  spacing?: number;
  upper?: boolean;
  alpha?: number;
  colour?: string;
  align?: CanvasTextAlign;
}

function setStyle(card: Card, style: TextStyle) {
  const { context } = card;
  const italic = style.italic ? "italic " : "";
  context.font = `${italic}${style.weight ?? 400} ${style.size}px ${style.font ?? SANS}`;
  context.letterSpacing = `${(style.spacing ?? 0) * style.size}px`;
  context.globalAlpha = style.alpha ?? 1;
  context.fillStyle = style.colour ?? card.ink;
  context.textAlign = style.align ?? "left";
}

interface At {
  x: number;
  y: number;
  /** For wrapped text: the width to wrap at. */
  width?: number;
}

/** One line of text with its baseline at `place`. */
export function text(card: Card, words: string, place: At, style: TextStyle) {
  setStyle(card, style);
  card.context.fillText(style.upper ? words.toUpperCase() : words, place.x, place.y);
  card.context.globalAlpha = 1;
}

/** Text wrapped to `place.width`; returns the baseline of its last line. */
export function lines(card: Card, words: string, place: At, style: TextStyle) {
  setStyle(card, style);
  const wrapped = wrapLines(card.context, words, place.width ?? 412);
  const step = style.size * 1.25;
  wrapped.forEach((line, index) => card.context.fillText(line, place.x, place.y + index * step));
  card.context.globalAlpha = 1;
  return place.y + (wrapped.length - 1) * step;
}

export function bar(
  card: Card,
  box: { x: number; y: number; width: number; height: number },
  colour: string,
) {
  const { context } = card;
  context.fillStyle = colour;
  context.beginPath();
  context.roundRect(box.x, box.y, box.width, box.height, 3);
  context.fill();
}

// Paper with a faint grain of dots, as on the design's cards.
function paper(context: CanvasRenderingContext2D, look: Look, width: number, height: number) {
  const { paper: colour, grain } = LOOKS[look];
  context.fillStyle = colour;
  context.fillRect(0, 0, width, height);
  context.fillStyle = grain;
  for (let y = 0; y < height; y += 3)
    for (let x = 0; x < width; x += 3) context.fillRect(x, y, 1, 1);
}

/** Readies the canvas place 1080 pixels wide and hands a card to draw on in design units. */
export function startCard(canvas: HTMLCanvasElement, look: Look, format: CardFormat): Card | null {
  const height = HEIGHTS[format];
  const scale = 1080 / 500;
  canvas.width = 1080;
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) return null;
  paper(context, look, canvas.width, canvas.height);
  context.scale(scale, scale);
  context.textBaseline = "alphabetic";
  return { context, height, ink: LOOKS[look].ink };
}

/** "Skriven i Skrivro" in the corner, when the writer keeps it. */
export const penMark = (card: Card) =>
  text(
    card,
    "SKRIVEN I SKRIVRO",
    { x: 484, y: card.height - 12 },
    {
      size: 9,
      spacing: 0.08,
      alpha: 0.45,
      align: "right",
    },
  );
