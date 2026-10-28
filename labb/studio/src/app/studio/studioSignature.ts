import { GREEN, PROSE, text, type Card } from "./studioCanvas.js";

/** Who wrote it, as the cards show the writer: the picture, its frame, the name and the title. */
export interface Author {
  name: string;
  title: string;
  frame: string;
  picture: ImageBitmap | null;
}

type Ring = { colour: string | null; width: number };

// Each frame from Stil as rings around the picture, from the inside out; null is a gap and "ink"
// is the card's own ink, so the frame reads on light and dark cards alike.
export const FRAME_RINGS: Record<string, { rings: Ring[]; isDashed?: boolean }> = {
  tunn: { rings: [{ colour: "#9a9a9a", width: 1.5 }] },
  grafit: { rings: [{ colour: "#3d3d3d", width: 2.5 }] },
  dubbel: {
    rings: [
      { colour: "ink", width: 1.2 },
      { colour: null, width: 1.5 },
      { colour: "ink", width: 1.2 },
    ],
  },
  manus: { rings: [{ colour: "ink", width: 1.5 }], isDashed: true },
  natt: { rings: [{ colour: "#1c1c1c", width: 3 }] },
  rott: { rings: [{ colour: "#c62828", width: 2.5 }] },
  praglad: { rings: [{ colour: "#8a8a8a", width: 3 }] },
  guld: {
    rings: [
      { colour: "#8a6f00", width: 1 },
      { colour: "#c9a400", width: 2.5 },
    ],
  },
};

function face(card: Card, author: Author, centre: { x: number; y: number }, radius: number) {
  const { context } = card;
  context.save();
  context.beginPath();
  context.arc(centre.x, centre.y, radius, 0, Math.PI * 2);
  context.clip();
  if (author.picture) {
    context.drawImage(author.picture, centre.x - radius, centre.y - radius, radius * 2, radius * 2);
  } else {
    context.fillStyle = GREEN;
    context.fill();
    const initial = (author.name.trim().charAt(0) || "·").toUpperCase();
    const size = radius * 0.9;
    text(
      card,
      initial,
      { x: centre.x, y: centre.y + size * 0.35 },
      { size, weight: 600, font: PROSE, colour: "#ffffff", align: "center" },
    );
  }
  context.restore();
}

function rings(card: Card, frame: string, centre: { x: number; y: number }, radius: number) {
  const style = FRAME_RINGS[frame];
  if (!style) return;
  const { context } = card;
  let reach = radius + radius * 0.08;
  for (const ring of style.rings) {
    if (ring.colour) {
      context.beginPath();
      context.setLineDash(style.isDashed ? [4, 3] : []);
      context.lineWidth = ring.width;
      context.strokeStyle = ring.colour === "ink" ? card.ink : ring.colour;
      context.arc(centre.x, centre.y, reach + ring.width / 2, 0, Math.PI * 2);
      context.stroke();
    }
    reach += ring.width;
  }
  context.setLineDash([]);
}

/** The writer's picture with its frame, centred where it is placed. */
export function portrait(
  card: Card,
  author: Author,
  centre: { x: number; y: number },
  radius: number,
) {
  card.context.globalAlpha = 1;
  face(card, author, centre, radius);
  rings(card, author.frame, centre, radius);
}

/** Top right on a card: who wrote it, when the writer has a name or a picture. */
export function drawSignature(card: Card, author: Author) {
  if (!author.name.trim() && !author.picture) return;
  portrait(card, author, { x: 466, y: 32 }, 13);
  const nameY = author.title ? 30 : 36;
  text(card, author.name, { x: 444, y: nameY }, { size: 12, weight: 600, align: "right" });
  if (author.title)
    text(
      card,
      author.title,
      { x: 444, y: 43 },
      { size: 8, spacing: 0.1, upper: true, alpha: 0.6, align: "right" },
    );
}
