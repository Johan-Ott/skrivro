import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN, designOf, marginsOf, trimSize } from "../src/export/bookDesign";

describe("designOf", () => {
  it("reads the book design from project.json", () => {
    const fields = {
      design: {
        theme: "luftig",
        trim: "150x230",
        bodyFont: "EB Garamond",
        bodySize: 11,
        dropCap: false,
      },
    };

    const design = designOf(fields);

    expect(design).toEqual({
      ...DEFAULT_DESIGN,
      theme: "luftig",
      trim: "150x230",
      bodyFont: "EB Garamond",
      bodySize: 11,
      dropCap: false,
    });
  });

  it("falls back to Klassisk's defaults for anything missing or unknown", () => {
    const fields = {
      design: { theme: "barock", trim: "1x1", bodyFont: "Comic Sans", bodySize: "stor" },
    };

    const design = designOf(fields);

    expect(design).toEqual(DEFAULT_DESIGN);
  });
});

describe("designOf with the print options", () => {
  it("reads large print, the space between lines and the margins", () => {
    const design = designOf({ design: { bodySize: 16, leading: "luftigt", margins: "breda" } });

    expect([design.bodySize, design.leading, design.margins]).toEqual([16, "luftigt", "breda"]);
    expect(marginsOf(design)).toEqual({ inside: 25, outside: 19, top: 22.5, bottom: 25 });
    expect(designOf({ design: { leading: "x", margins: 3 } }).margins).toBe("normala");
  });

  it("accepts a custom page size within what printers handle", () => {
    expect(designOf({ design: { trim: "140x220" } }).trim).toBe("140x220");
    expect(designOf({ design: { trim: "40x500" } }).trim).toBe(DEFAULT_DESIGN.trim);
  });

  it("reads where chapters start and what each page's header shows", () => {
    const fields = {
      design: { chapterStart: "hoger", headerLeft: "forfattare", headerRight: "kapitel" },
    };

    const design = designOf(fields);

    expect(design).toMatchObject({
      chapterStart: "hoger",
      headerLeft: "forfattare",
      headerRight: "kapitel",
    });
  });

  it("offers the newer typefaces with free licences", () => {
    expect(designOf({ design: { bodyFont: "Source Serif 4" } }).bodyFont).toBe("Source Serif 4");
  });
});

describe("trimSize", () => {
  it("turns a trim into the page size in millimetres", () => {
    expect(trimSize("130x200")).toEqual({ width: 130, height: 200 });
  });
});

describe("designOf with chapter opening templates", () => {
  it("takes the heading typeface from the theme until the writer picks their own", () => {
    expect(designOf({ design: { theme: "modern" } }).headingFont).toBe("Geist");
    expect(designOf({ design: { theme: "modern", headingFont: "EB Garamond" } }).headingFont).toBe(
      "EB Garamond",
    );
  });

  it("always has a template, and a standard one that exists", () => {
    expect(designOf({}).openings.map((template) => template.id)).toEqual(["klassisk"]);
    expect(designOf({ design: { opening: "saknas" } }).opening).toBe("klassisk");
  });

  it("keeps picture areas on the page and their pictures inside the book's folder", () => {
    const area = { id: "a", picture: "../../hemlig.png", x: -1, y: 0.2, width: 2, height: 0.3 };
    const openings = [{ id: "m", name: "Min", headingTop: 0.4, areas: [area] }];

    const [template] = designOf({ design: { openings } }).openings;

    expect(template?.areas[0]).toMatchObject({ picture: "", x: 0, width: 1 });
  });
});
