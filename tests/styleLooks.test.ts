import { describe, expect, it } from "vitest";
import { defaultLook, lookPoints, looksCss, looksOf } from "../src/export/styleLooks";
import { lookSetup } from "../src/export/typstTemplate";

describe("looksOf", () => {
  it("gives each style its own look when the book has none saved", () => {
    const looks = looksOf(undefined);

    expect(looks.brev).toEqual({ font: "", size: 100, italic: true, bold: false });
    expect(looks.underrubrik.bold).toBe(true);
    expect(looks.meddelande).toEqual({ font: "Geist", size: 85, italic: false, bold: false });
    expect(looks.citat).toEqual(defaultLook("citat"));
  });

  it("keeps what is saved and falls back field by field on anything unknown", () => {
    const looks = looksOf({ brev: { font: "Comic Sans", size: 120, italic: false, bold: "ja" } });

    expect(looks.brev).toEqual({ font: "", size: 120, italic: false, bold: false });
  });
});

describe("looksCss", () => {
  it("writes a rule only for the styles not set as the body text", () => {
    const css = looksCss(looksOf(undefined), (name) => `.${name}`);

    expect(css).toContain(".brev { font-style: italic; }");
    expect(css).toContain(
      '.meddelande { font-family: "Geist Sans", system-ui, sans-serif; font-size: 85%; }',
    );
    expect(css).not.toContain(".citat");
  });
});

describe("lookSetup", () => {
  it("wraps each set style in its text settings and leaves the rest as they are", () => {
    const setup = lookSetup(looksOf(undefined));

    expect(setup).toContain('if name == "brev" { text(style: "italic", body) }');
    expect(setup).toContain('if name == "meddelande" { text(font: "Geist", size: 0.85em, body) }');
    expect(setup).not.toContain('"citat"');
    expect(setup.endsWith("else { body }")).toBe(true);
  });
});

describe("lookPoints", () => {
  it("gives the size in points to the half point", () => {
    expect(lookPoints(12, defaultLook("meddelande"))).toBe(10);
    expect(lookPoints(11, defaultLook("meddelande"))).toBe(9.5);
    expect(lookPoints(11, defaultLook("brev"))).toBe(11);
  });
});
