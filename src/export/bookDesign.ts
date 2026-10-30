import { BODY_FONTS, HEADING_FONTS } from "./fonts.js";
import { isPictureName, openingsOf, type OpeningTemplate } from "./openings.js";
import { looksOf, type StyleLooks } from "./styleLooks.js";

/** Kept in project.json under `design`. */
export type BookTheme = "klassisk" | "modern" | "luftig";

export type ChapterStart = "valfri" | "hoger";
/** What a page's running header shows. */
export type HeaderContent = "titel" | "forfattare" | "kapitel" | "inget";
/** How a chapter is numbered above its title: "Kapitel 1", "1", "I" or not at all. */
export type ChapterLabel = "ord" | "siffra" | "romersk" | "ingen";
export type TitleCase = "vanlig" | "kapitaler" | "versaler";
/** Space between the lines, and between the text and the paper's edges. */
export type Leading = "tatt" | "normalt" | "luftigt";
export type MarginSize = "smala" | "normala" | "breda";
/** Where the page number stands; the outer corner is right on a right-hand page. */
export type FolioPlace = "mitten" | "ytterhorn" | "overst";

export interface BookDesign {
  theme: BookTheme;
  /** Width × height in millimetres, as "130x200". */
  trim: string;
  bodyFont: string;
  /** Points; 14 and up is large print. */
  bodySize: number;
  leading: Leading;
  margins: MarginSize;
  dropCap: boolean;
  sceneBreak: string;
  /** "hoger": every part and chapter opens on a right-hand page. */
  chapterStart: ChapterStart;
  headerLeft: HeaderContent;
  headerRight: HeaderContent;
  folio: FolioPlace;
  /** A number at the foot of a chapter's first page too, which has no running head. */
  openingFolio: boolean;
  chapterLabel: ChapterLabel;
  headingFont: string;
  titleCase: TitleCase;
  /** The chapter's first words in small capitals, when there is no drop cap. */
  leadIn: boolean;
  /** The picture in bilder/ used when the scene break is BREAK_PICTURE; "" for none. */
  breakPicture: string;
  /** How chapters open; there is always at least one. */
  openings: OpeningTemplate[];
  /** The template a chapter uses unless it picks another. */
  opening: string;
  looks: StyleLooks;
}

export const BOOK_THEMES: BookTheme[] = ["klassisk", "modern", "luftig"];

// The sizes Amazon KDP, Books on Demand and Swedish printers offer; any other is a custom size.
export const TRIMS: [string, string][] = [
  ["120x190", "12 × 19 cm"],
  ["125x190", "12,5 × 19 cm"],
  ["127x203", "12,7 × 20,3 cm (5 × 8 in)"],
  ["130x200", "13 × 20 cm"],
  ["135x215", "13,5 × 21,5 cm"],
  ["140x216", "14 × 21,6 cm (5,5 × 8,5 in)"],
  ["148x210", "14,8 × 21 cm (A5)"],
  ["150x230", "15 × 23 cm"],
  ["152x229", "15,2 × 22,9 cm (6 × 9 in)"],
  ["170x220", "17 × 22 cm"],
];

const TRIM_LIMITS = { smallest: 90, largest: 300 };

export const BODY_SIZES = [10, 10.5, 11, 11.5, 12, 13, 14, 16];
const LEADINGS: Leading[] = ["tatt", "normalt", "luftigt"];
const FOLIO_PLACES: FolioPlace[] = ["mitten", "ytterhorn", "overst"];
const MARGIN_SIZES: MarginSize[] = ["smala", "normala", "breda"];
/** Lines apart in em, and how much of the theme's margins are kept. */
export const LEADING_EM: Record<Leading, number> = { tatt: 0.5, normalt: 0.62, luftigt: 0.78 };
const MARGIN_SCALE: Record<MarginSize, number> = { smala: 0.8, normala: 1, breda: 1.25 };
// The marks the design offers between scenes: stars, an asterism and a long dash.
const LONG_DASH = String.fromCharCode(0x2014);
export const SCENE_BREAKS = ["* * *", "⁂", LONG_DASH];
/** The scene break that is a picture of the writer's own. */
export const BREAK_PICTURE = "bild";

/** Picking a theme also sets the heading typeface it comes with; it can be changed after. */
export const THEME_FONTS: Record<BookTheme, string> = {
  klassisk: "Literata",
  modern: "Geist",
  luftig: "Literata",
};

export const DEFAULT_DESIGN: BookDesign = {
  theme: "klassisk",
  trim: "130x200",
  bodyFont: "Literata",
  bodySize: 10.5,
  leading: "normalt",
  margins: "normala",
  dropCap: true,
  sceneBreak: "* * *",
  chapterStart: "valfri",
  headerLeft: "titel",
  headerRight: "titel",
  folio: "mitten",
  openingFolio: false,
  chapterLabel: "ord",
  headingFont: THEME_FONTS.klassisk,
  titleCase: "vanlig",
  leadIn: false,
  breakPicture: "",
  openings: openingsOf(undefined),
  opening: "klassisk",
  looks: looksOf(undefined),
};

const CHAPTER_STARTS: ChapterStart[] = ["valfri", "hoger"];
export const HEADER_CONTENTS: HeaderContent[] = ["titel", "forfattare", "kapitel", "inget"];
export const CHAPTER_LABELS: ChapterLabel[] = ["ord", "siffra", "romersk", "ingen"];
export const TITLE_CASES: TitleCase[] = ["vanlig", "kapitaler", "versaler"];

function isPrintableTrim(value: unknown) {
  if (typeof value !== "string" || !/^\d+x\d+$/.test(value)) return false;
  const { width, height } = trimSize(value);
  const { smallest, largest } = TRIM_LIMITS;
  return [width, height].every((side) => side >= smallest && side <= largest);
}

const oneOf = <T>(value: unknown, allowed: T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const isOn = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

function headingOf(stored: Record<string, unknown>, theme: BookTheme) {
  const openings = openingsOf(stored["openings"]);
  const ids = openings.map((template) => template.id);
  return {
    chapterLabel: oneOf(stored["chapterLabel"], CHAPTER_LABELS, DEFAULT_DESIGN.chapterLabel),
    headingFont: oneOf(stored["headingFont"], HEADING_FONTS, THEME_FONTS[theme]),
    titleCase: oneOf(stored["titleCase"], TITLE_CASES, DEFAULT_DESIGN.titleCase),
    leadIn: isOn(stored["leadIn"], DEFAULT_DESIGN.leadIn),
    breakPicture: isPictureName(stored["breakPicture"]) ? stored["breakPicture"] : "",
    openings,
    opening: oneOf(stored["opening"], ids, ids[0] ?? DEFAULT_DESIGN.opening),
  };
}

/** Anything missing or unknown falls back to Klassisk. */
export function designOf(fields: Record<string, unknown>): BookDesign {
  const stored = (fields["design"] ?? {}) as Record<string, unknown>;
  const theme = oneOf(stored["theme"], BOOK_THEMES, DEFAULT_DESIGN.theme);
  const heading = headingOf(stored, theme);
  const breaks = [...SCENE_BREAKS, BREAK_PICTURE];
  return {
    theme,
    trim: isPrintableTrim(stored["trim"]) ? String(stored["trim"]) : DEFAULT_DESIGN.trim,
    bodyFont: oneOf(stored["bodyFont"], BODY_FONTS, DEFAULT_DESIGN.bodyFont),
    bodySize: oneOf(stored["bodySize"], BODY_SIZES, DEFAULT_DESIGN.bodySize),
    leading: oneOf(stored["leading"], LEADINGS, DEFAULT_DESIGN.leading),
    margins: oneOf(stored["margins"], MARGIN_SIZES, DEFAULT_DESIGN.margins),
    dropCap: isOn(stored["dropCap"], DEFAULT_DESIGN.dropCap),
    sceneBreak: oneOf(stored["sceneBreak"], breaks, DEFAULT_DESIGN.sceneBreak),
    chapterStart: oneOf(stored["chapterStart"], CHAPTER_STARTS, DEFAULT_DESIGN.chapterStart),
    headerLeft: oneOf(stored["headerLeft"], HEADER_CONTENTS, DEFAULT_DESIGN.headerLeft),
    headerRight: oneOf(stored["headerRight"], HEADER_CONTENTS, DEFAULT_DESIGN.headerRight),
    folio: oneOf(stored["folio"], FOLIO_PLACES, DEFAULT_DESIGN.folio),
    openingFolio: isOn(stored["openingFolio"], DEFAULT_DESIGN.openingFolio),
    ...heading,
    looks: looksOf(stored["looks"]),
  };
}

/** Millimetres from the paper's edges to the text. */
export interface Margins {
  inside: number;
  outside: number;
  top: number;
  bottom: number;
}

const THEME_MARGINS: Record<BookTheme, Margins> = {
  klassisk: { inside: 20, outside: 15, top: 18, bottom: 20 },
  modern: { inside: 20, outside: 15, top: 18, bottom: 20 },
  luftig: { inside: 24, outside: 19, top: 24, bottom: 24 },
};

// Smala and Breda scale the theme's margins, to the half millimetre.
export function marginsOf(design: BookDesign): Margins {
  const scale = MARGIN_SCALE[design.margins];
  const round = (size: number) => Math.round(size * scale * 2) / 2;
  const { inside, outside, top, bottom } = THEME_MARGINS[design.theme];
  return { inside: round(inside), outside: round(outside), top: round(top), bottom: round(bottom) };
}

export function trimSize(trim: string) {
  const [width = 130, height = 200] = trim.split("x").map(Number);
  return { width, height };
}
