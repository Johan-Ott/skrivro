import { STYLE_NAMES, type StyleName } from "../manuscript/schema.js";
import { fontStack, HEADING_FONTS } from "./fonts.js";

/** How a style's text is set: its typeface ("" for the body text's), its size in percent of the
 * body text, and whether it is italic or bold. */
export interface StyleLook {
  font: string;
  size: number;
  italic: boolean;
  bold: boolean;
}

/** Kept in project.json under `design.looks`. */
export type StyleLooks = Record<StyleName, StyleLook>;

export const LOOK_FONTS = ["", ...HEADING_FONTS];
export const LOOK_SIZES = [80, 85, 90, 100, 110, 120, 140];

const PLAIN: StyleLook = { font: "", size: 100, italic: false, bold: false };
const MESSAGE: StyleLook = { ...PLAIN, font: "Geist", size: 85 };
const DEFAULTS: Partial<StyleLooks> = {
  brev: { ...PLAIN, italic: true },
  motto: { ...PLAIN, italic: true },
  underrubrik: { ...PLAIN, bold: true },
  meddelande: MESSAGE,
  "meddelande-ut": MESSAGE,
};

export const defaultLook = (name: StyleName) => DEFAULTS[name] ?? PLAIN;

/** The style's size in points, to the half point, from the body text's. */
export const lookPoints = (bodySize: number, look: StyleLook) =>
  Math.round((bodySize * look.size) / 50) / 2;

const recordOf = (value: unknown) =>
  (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;

function lookOf(stored: unknown, fallback: StyleLook): StyleLook {
  const { font, size, italic, bold } = recordOf(stored);
  return {
    font: typeof font === "string" && LOOK_FONTS.includes(font) ? font : fallback.font,
    size: typeof size === "number" && LOOK_SIZES.includes(size) ? size : fallback.size,
    italic: typeof italic === "boolean" ? italic : fallback.italic,
    bold: typeof bold === "boolean" ? bold : fallback.bold,
  };
}

/** Anything missing or unknown falls back to the style's own look. */
export function looksOf(stored: unknown): StyleLooks {
  const saved = recordOf(stored);
  const looks = STYLE_NAMES.map((name) => [name, lookOf(saved[name], defaultLook(name))]);
  return Object.fromEntries(looks) as StyleLooks;
}

function declarations(look: StyleLook) {
  return [
    look.font && `font-family: ${fontStack(look.font)};`,
    look.size !== 100 && `font-size: ${look.size}%;`,
    look.italic && "font-style: italic;",
    look.bold && "font-weight: bold;",
  ]
    .filter(Boolean)
    .join(" ");
}

/** A CSS rule for each style that is not set as the body text, its selector made from its name. */
export function looksCss(looks: StyleLooks, selector: (name: StyleName) => string) {
  return STYLE_NAMES.flatMap((name) => {
    const set = declarations(looks[name]);
    return set ? [`${selector(name)} { ${set} }`] : [];
  }).join("\n");
}
