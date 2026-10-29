import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bookOutline, readBookScenes } from "../src/export/book";
import { DEFAULT_DESIGN } from "../src/export/bookDesign";
import type { OpeningTemplate } from "../src/export/openings";
import { createTypst } from "../src/export/typstCompile";
import { typstFiles, typstSource, type PrintInput } from "../src/export/typstBook";
import { withSpecialFolders, type TreeNode } from "../src/project/tree";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";

const bytesOf = (path: string) => Promise.resolve(new Uint8Array(readFileSync(path)));
const typst = createTypst({
  compilerWasm: () =>
    bytesOf("node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm"),
  rendererWasm: () =>
    bytesOf("node_modules/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm"),
  fonts: () =>
    Promise.all(
      readdirSync("public/fonts")
        .filter((name) => name.endsWith(".ttf"))
        .map((name) => bytesOf(`public/fonts/${name}`)),
    ),
});

const tree: TreeNode[] = withSpecialFolders([
  {
    id: "del1",
    kind: "part",
    title: "Vintern",
    children: [
      {
        id: "kap1",
        kind: "chapter",
        title: "Brevet",
        children: [
          { id: "koket", kind: "scene" },
          { id: "isen", kind: "scene" },
        ],
      },
    ],
  },
]);
const scene = (id: string, body: string) => `---\nid: ${id}\ntitle: ${id}\n---\n${body}`;
// Text with every character Typst could read as code, which must come out as text.
const TRICKY =
  "# Rubrik? \\*inte fet\\* `kod` $5 <x> @ref [hak] ~ = + 1/2 // inte (parentes) {klammer}";
const FILES = {
  "/bok/scenes/koket.md": scene("koket", `Brevet låg på *bordet*(alltid).\n\n${TRICKY}\n`),
  "/bok/scenes/isen.md": scene(
    "isen",
    ":::brev\nKära Elin.\n:::\n\n:::meddelande\nKom hem.\n:::\n\n:::centrerat\nStockholm, 1912\n:::\n\n:::hoger\nDin Henrik\n:::\n\n:::utan-indrag\nUtan indrag.\n:::\n\n:::kapitaler\nHotell Kallsta\n:::\n\n:::punktlista\nMjöl\n\nÄgg\n:::\n\n:::numrerad\nFörst\n\nSedan\n:::\n\n:::indrag\nInskjutet.\n:::\n\n:::underrubrik\nVägen\n:::\n\n:::ruta\nFakta.\n:::\n\n:::hangande-indrag\nBerg, E. (2026).\n:::\n\nH<sub>2</sub>O och 10<sup>3</sup> på [Skrivro](https://skrivro.se).\n\nHon sa ”nej”.\n",
  ),
};

async function input(): Promise<PrintInput> {
  const files = createMemoryFileSystem(FILES);
  const outline = bookOutline(tree);
  const scenes = await readBookScenes(files, "/bok", ["koket", "isen"], {});
  return {
    book: { title: "Vintervägen", subtitle: "Roman", author: "Elin Berg", words: 40 },
    outline,
    scenes,
    typography: "svensk",
    language: "sv-SE",
    design: DEFAULT_DESIGN,
    parts: { hasTitlePage: true, hasCopyrightPage: true, hasContents: true },
    extras: { dedication: "Till Henrik", about: "Elin Berg bor på Gotland." },
    year: 2026,
  };
}

describe("typstSource", () => {
  it("sets the page size and font from the design, with the anfang on the chapter's first letter", async () => {
    const source = typstSource({
      ...(await input()),
      design: { ...DEFAULT_DESIGN, trim: "150x230" },
    });

    expect(source).toContain("width: 150mm");
    expect(source).toContain("height: 230mm");
    expect(source).toContain('font: "Literata"');
    expect(source).toContain('#kapitel("Kapitel 1", "Brevet", "Kapitel 1. Brevet"');
    expect(source).toContain('#anfang("B", ([revet], [låg], [på], [#emph[bordet]\\(alltid).],))');
    expect(source).toContain("#let break-mark = [\\* \\* \\*]");
    expect(source).toContain("#scenbrytning(break-mark)");
  });

  it("compiles to a PDF and to preview pages without Typst errors, whatever the text holds", async () => {
    const source = typstSource(await input());

    const pdf = await typst.pdf(source);
    const svg = await typst.svg(source);

    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
    expect(svg).toContain("<svg");
  }, 30_000);

  it("compiles with right-hand chapters, the chapter in the header and numbers at the top", async () => {
    const design = {
      ...DEFAULT_DESIGN,
      bodyFont: "Source Serif 4",
      chapterStart: "hoger" as const,
      headerLeft: "forfattare" as const,
      headerRight: "kapitel" as const,
      folio: "overst" as const,
      openingFolio: true,
    };

    const source = typstSource({ ...(await input()), design });
    const pdf = await typst.pdf(source);

    expect(source).toContain('#let chapter-start = "odd"');
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
  }, 30_000);
});

// The smallest PNG there is: one transparent pixel.
const PIXEL = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  ),
  (letter) => letter.charCodeAt(0),
);

// Two templates: a picture across the top, out to the paper's edge, and a small ornament.
const TEMPLATES: OpeningTemplate[] = [
  {
    id: "topp",
    name: "Bild överst",
    headingTop: 0.45,
    headingAlign: "vanster",
    areas: [{ id: "bild1", picture: "is.png", x: 0, y: 0, width: 1, height: 0.38, fit: "fyll" }],
  },
  {
    id: "ornament",
    name: "Ornament",
    headingTop: 0.27,
    headingAlign: "mitten",
    areas: [
      {
        id: "bild1",
        picture: "rosett.png",
        x: 0.35,
        y: 0.17,
        width: 0.3,
        height: 0.07,
        fit: "hela",
      },
    ],
  },
];

async function designedInput(): Promise<PrintInput> {
  const plain = await input();
  const outline = plain.outline.map((item) =>
    item.kind === "chapter"
      ? {
          ...item,
          subtitle: "Elin",
          epigraph: "Isen bär.",
          epigraphBy: "Gammalt ordspråk",
          pictures: { bild1: "fyr.png" },
        }
      : item,
  );
  const design = {
    ...DEFAULT_DESIGN,
    chapterLabel: "romersk" as const,
    titleCase: "kapitaler" as const,
    dropCap: false,
    leadIn: true,
    openings: TEMPLATES,
    opening: "topp",
    breakPicture: "rosett.png",
    sceneBreak: "bild",
  };
  const images = new Map(["is.png", "rosett.png", "fyr.png"].map((name) => [name, PIXEL]));
  return { ...plain, outline, design, images };
}

describe("typstSource with chapter opening templates", () => {
  it("prints the label, subtitle and epigraph, with the chapter's own picture in the template", async () => {
    const source = typstSource(await designedInput());

    expect(source).toContain('#kapitel("I", "Brevet", "Kapitel 1. Brevet", layout: (');
    expect(source).toContain('subtitle: "Elin", epigraph: "Isen bär.", by: "Gammalt ordspråk"');
    expect(source).toContain('path: "/bilder/fyr.png"');
    expect(source).not.toContain('path: "/bilder/is.png"');
    expect(source).toContain('#let break-mark = fitted("/bilder/rosett.png"');
    expect(source).toContain("#leadin-par(([Brevet], [låg]");
    expect(source).toContain('case: "kapitaler"');
  });

  it("gives the paper 3 mm bleed when a picture reaches its edge, and reaches into it", async () => {
    const source = typstSource(await designedInput());

    expect(source).toContain("width: 136mm");
    expect(source).toContain('path: "/bilder/fyr.png", x: -3mm, y: -3mm, width: 136mm');
  });

  it("has no bleed when the chapter's template keeps its pictures inside the page", async () => {
    const designed = await designedInput();
    const outline = designed.outline.map((item) =>
      item.kind === "chapter" ? { ...item, opening: "ornament", pictures: {} } : item,
    );

    const source = typstSource({ ...designed, outline });

    expect(source).toContain("width: 130mm");
    expect(source).toContain('path: "/bilder/rosett.png"');
  });

  it("compiles with the pictures handed to Typst", async () => {
    const designed = await designedInput();

    const pdf = await typst.pdf(typstSource(designed), typstFiles(designed));

    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
  }, 30_000);

  it("leaves out a picture that could not be read instead of failing", async () => {
    const designed = { ...(await designedInput()), images: new Map<string, Uint8Array>() };

    const source = typstSource(designed);

    expect(source).toContain("pictures: ()");
    expect(source).toContain("#let break-mark = [\\* \\* \\*]");
  });
});
