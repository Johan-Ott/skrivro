// The book's typefaces, which the PDF bundles from public/fonts.
export const BODY_FONTS = [
  "Literata",
  "EB Garamond",
  "Crimson Pro",
  "Libre Baskerville",
  "Source Serif 4",
];
export const HEADING_FONTS = [...BODY_FONTS, "Geist"];

/** The typeface on the screen and in an e-book, with a fallback for a reader that lacks it. */
export const fontStack = (font: string) =>
  font === "Geist" ? '"Geist Sans", system-ui, sans-serif' : `"${font}", Georgia, serif`;
