import {
  readStoredObject,
  writeStored,
  type KeyValueStorage,
} from "@llkit/storage/keyValueStore.js";
import { t } from "../i18n/i18n.js";

export type ProseFont = "serif" | "sans" | "mono";
export type TextWidth = "smal" | "normal" | "bred";
export type FocusMode = "av" | "mening" | "stycke";
export type Theme = "ljust" | "mörkt" | "system";

/** Saved per writer, not per project. */
export interface WritingSettings {
  font: ProseFont;
  size: number;
  lineHeight: number;
  width: TextWidth;
  indent: boolean;
  focus: FocusMode;
  typewriter: boolean;
  theme: Theme;
  spellcheck: boolean;
  typography: boolean;
  /** A capital where a sentence starts, HEj as Hej and obvious misspellings, on a computer. */
  autocorrect: boolean;
  /** The rest of a name or long word, offered in grey while typing, on a computer. */
  completion: boolean;
  review: boolean;
  /** A word used again within this many sentences is marked. */
  repeatWindow: number;
  /** Where the printed book's pages begin, marked in the margin while writing. */
  showPages: boolean;
  /** The text on a sheet of paper, with its printed pages at the foot. */
  paper: boolean;
  /** Justified text, a drop cap where a chapter opens and an ornament for scene breaks. */
  bookType: boolean;
  /** The sidebar as a printed table of contents: dotted leaders to each chapter's page. */
  tableOfContents: boolean;
  /** The sidebar unfolds to the open text and shows it. */
  followOpenText: boolean;
}

export const DEFAULT_SETTINGS: WritingSettings = {
  font: "serif",
  size: 19,
  lineHeight: 1.8,
  width: "normal",
  indent: true,
  focus: "stycke",
  typewriter: true,
  theme: "system",
  spellcheck: true,
  typography: true,
  autocorrect: true,
  completion: true,
  review: true,
  repeatWindow: 3,
  showPages: false,
  paper: true,
  bookType: false,
  tableOfContents: false,
  followOpenText: true,
};

const STORAGE_KEY = "skrivro.writing";
const MIN_SIZE = 14;
const MAX_SIZE = 28;
const LINE_HEIGHTS = [1.5, 1.6, 1.8, 2];
export const REPEAT_WINDOWS = [2, 3, 4, 5];
const FONTS: Record<ProseFont, string> = {
  serif: '"Literata", Georgia, serif',
  sans: '"Geist Sans", system-ui, sans-serif',
  mono: '"Geist Mono", Consolas, monospace',
};
const THEMES: Record<Theme, true> = { ljust: true, mörkt: true, system: true };
const WIDTHS: Record<TextWidth, string> = { smal: "520px", normal: "600px", bred: "720px" };

const isOneOf = <T extends string>(value: unknown, options: Record<T, unknown>): value is T =>
  typeof value === "string" && value in options;

const isSize = (value: unknown) =>
  typeof value === "number" && value >= MIN_SIZE && value <= MAX_SIZE;

// Each stored value is checked on its own, so one bad value never resets the others.
// Older settings stored dark as a switch on top of the system theme, read here as Mörkt.
function validated(stored: Record<string, unknown>): WritingSettings {
  const pick = <K extends keyof WritingSettings>(key: K, isValid: (value: unknown) => boolean) =>
    (isValid(stored[key]) ? stored[key] : DEFAULT_SETTINGS[key]) as WritingSettings[K];
  const isBoolean = (value: unknown) => typeof value === "boolean";
  return {
    font: pick("font", (value) => isOneOf(value, FONTS)),
    size: pick("size", isSize),
    lineHeight: pick("lineHeight", (value) => LINE_HEIGHTS.includes(value as number)),
    width: pick("width", (value) => isOneOf(value, WIDTHS)),
    indent: pick("indent", isBoolean),
    focus: pick("focus", (value) => ["av", "mening", "stycke"].includes(value as string)),
    typewriter: pick("typewriter", isBoolean),
    theme:
      stored["darkTheme"] === true ? "mörkt" : pick("theme", (value) => isOneOf(value, THEMES)),
    spellcheck: pick("spellcheck", isBoolean),
    typography: pick("typography", isBoolean),
    autocorrect: pick("autocorrect", isBoolean),
    completion: pick("completion", isBoolean),
    review: pick("review", isBoolean),
    repeatWindow: pick("repeatWindow", (value) => REPEAT_WINDOWS.includes(value as number)),
    showPages: pick("showPages", isBoolean),
    paper: pick("paper", isBoolean),
    bookType: pick("bookType", isBoolean),
    tableOfContents: pick("tableOfContents", isBoolean),
    followOpenText: pick("followOpenText", isBoolean),
  };
}

export const loadSettings = (storage: KeyValueStorage): WritingSettings =>
  validated(readStoredObject(storage, STORAGE_KEY));

export const saveSettings = (storage: KeyValueStorage, settings: WritingSettings) =>
  writeStored(storage, STORAGE_KEY, settings);

export const changeSize = (settings: WritingSettings, step: 1 | -1): WritingSettings => ({
  ...settings,
  size: Math.min(MAX_SIZE, Math.max(MIN_SIZE, settings.size + step)),
});

export function nextLineHeight(current: number): number {
  return LINE_HEIGHTS[(LINE_HEIGHTS.indexOf(current) + 1) % LINE_HEIGHTS.length] ?? 1.8;
}

export const nextWidth = (current: TextWidth): TextWidth =>
  (({ smal: "normal", normal: "bred", bred: "smal" }) as const)[current];

export function proseStyle(settings: WritingSettings): Record<string, string> {
  return {
    "--prose-font": FONTS[settings.font],
    "--prose-size": `${settings.size}px`,
    "--prose-line-height": String(settings.lineHeight),
    "--prose-width": WIDTHS[settings.width],
    "--prose-indent": settings.indent ? "1.5em" : "0",
  };
}

export const THEME_LABELS: Record<Theme, string> = {
  ljust: t("Ljust"),
  mörkt: t("Mörkt"),
  system: t("System"),
};

export const toggleDark = (settings: WritingSettings): WritingSettings => ({
  ...settings,
  theme: settings.theme === "mörkt" ? "system" : "mörkt",
});
