import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN } from "../src/export/bookDesign";
import { typstSource, type PrintInput } from "../src/export/typstBook";
import { createTypst } from "../src/export/typstCompile";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { pageMap } from "../src/project/pageMap";

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

const long = (words: number) => `${"Isen låg tjock över viken. ".repeat(words / 5)}\n`;

function input(markPages: boolean): PrintInput {
  return {
    book: { title: "Vintervägen", subtitle: "", author: "Elin Berg", words: 0 },
    outline: [
      { kind: "chapter", number: 1, title: "Brevet" },
      { kind: "scene", id: "S1" },
      { kind: "chapter", number: 2, title: "Fyren" },
      { kind: "scene", id: "S2" },
    ],
    scenes: new Map([
      ["S1", parseMarkdown(`${long(600)}\n${long(600)}`)],
      ["S2", parseMarkdown(long(100))],
    ]),
    typography: "svensk",
    language: "sv-SE",
    design: DEFAULT_DESIGN,
    parts: { hasTitlePage: true, hasCopyrightPage: false, hasContents: false },
    extras: {},
    year: 2026,
    markPages,
  };
}

describe("page marks", () => {
  it("are only written into the source when the page map asks for them", () => {
    expect(typstSource(input(false))).not.toContain("#pagemark(");
    expect(typstSource(input(true))).toContain('#pagemark("S1", 0)');
  });

  it("leave the printed book exactly as it is", async () => {
    const plain = await typst.svg(typstSource(input(false)));
    const marked = await typst.svg(typstSource(input(true)));

    expect(marked).toBe(plain);
  }, 30_000);

  it("tell the page of every block and the book's length", async () => {
    const found = await typst.pageMarks(typstSource(input(true)));

    const map = pageMap(found, [
      { id: "K1", sceneIds: ["S1"] },
      { id: "K2", sceneIds: ["S2"] },
    ]);

    expect(map.pages).toBeGreaterThan(4);
    expect(map.blockPages.get("S1")?.[0]).toBe(1);
    expect(map.blockPages.get("S1")?.[1]).toBeGreaterThan(1);
    expect(map.chapterPages.get("K1")).toEqual({
      first: 1,
      last: (map.blockPages.get("S2")?.[0] ?? 0) - 1,
    });
  }, 30_000);
});

describe("pageMap", () => {
  it("runs each chapter from its first page to the page before the next one, in the book's numbering", () => {
    const marks = {
      marks: [
        { scene: "S1", block: 0, page: 1 },
        { scene: "S1", block: 1, page: 3 },
        { scene: "S2", block: 0, page: 5 },
      ],
      pages: 10,
      lastPage: 8,
      openings: [],
    };

    const map = pageMap(marks, [
      { id: "K1", sceneIds: ["S1"] },
      { id: "K2", sceneIds: ["S2"] },
    ]);

    expect(map.chapterPages.get("K1")).toEqual({ first: 1, last: 4 });
    expect(map.chapterPages.get("K2")).toEqual({ first: 5, last: 8 });
    expect(map.blockPages.get("S1")).toEqual([1, 3]);
    expect(map.pages).toBe(10);
  });
});
