import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { bookOutline, readBookScenes } from "../src/export/book";
import { DEFAULT_DESIGN, type BookDesign } from "../src/export/bookDesign";
import { buildEpub, type BookExtras, type EpubInput } from "../src/export/epub";
import { withSpecialFolders, type TreeNode } from "../src/project/tree";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";

const tree: TreeNode[] = withSpecialFolders([
  { id: "01INLEDNING", kind: "scene" },
  {
    id: "kap1",
    kind: "chapter",
    title: "Brevet",
    children: [
      { id: "01KOKET", kind: "scene" },
      { id: "01ISEN", kind: "scene" },
    ],
  },
  { id: "kap2", kind: "chapter", title: "Fyren & havet", children: [] },
]);
const scene = (id: string, body: string) => `---\nid: ${id}\ntitle: ${id}\n---\n${body}`;
const FILES = {
  "/bok/scenes/01INLEDNING.md": scene("01INLEDNING", "Det var vinter.\n"),
  "/bok/scenes/01KOKET.md": scene("01KOKET", "Brevet låg på *bordet* <& så>.\n\n– Vet du?\n"),
  "/bok/scenes/01ISEN.md": scene(
    "01ISEN",
    ":::brev\nKära Elin.\n:::\n\nHon sa ”nej”.\n\nSe [Skrivro](https://skrivro.se) och H<sub>2</sub>O.\n",
  ),
};
const BOOK = { title: "Vintervägen", subtitle: "Roman", author: "Elin Berg", words: 1200 };

async function build(language = "sv-SE", extras: BookExtras = {}, more: Partial<EpubInput> = {}) {
  const files = createMemoryFileSystem(FILES);
  const outline = bookOutline(tree);
  const ids = outline.flatMap((item) => (item.kind === "scene" ? [item.id] : []));
  const scenes = await readBookScenes(files, "/bok", ids, {});
  const bytes = await buildEpub({
    book: BOOK,
    outline,
    scenes,
    typography: "svensk",
    language,
    extras,
    identifier: "urn:uuid:3f1c2a64-0d5e-4b7a-9a1e-6c2b8d4e5f70",
    modified: new Date("2026-10-03T12:00:00Z"),
    parts: { hasTitlePage: true, hasCopyrightPage: true, hasContents: true },
    ...more,
  });
  return { bytes, zip: await JSZip.loadAsync(bytes) };
}

const read = (zip: JSZip, path: string) => zip.file(path)?.async("string") ?? Promise.resolve("");

describe("buildEpub", () => {
  it("adds the dedication after the copyright page, and thanks and the author at the end", async () => {
    const extras = {
      dedication: "Till Henrik",
      thanks: "Tack till Maja.",
      about: "Elin Berg bor på Gotland.\n\nVintervägen är hennes första roman.",
    };

    const { zip } = await build("sv-SE", extras);

    const opf = await read(zip, "OEBPS/content.opf");
    const order = ["copyright", "dedication", "nav", "chapter-2", "thanks", "about"];
    const positions = order.map((id) => opf.indexOf(`<itemref idref="${id}"`));
    expect(positions).toEqual([...positions].sort((first, second) => first - second));
    expect(await read(zip, "OEBPS/text/dedication.xhtml")).toContain("Till Henrik");
    const about = await read(zip, "OEBPS/text/about.xhtml");
    expect(about).toContain("<h1>Om författaren</h1>");
    expect(about).toContain("<p>Vintervägen är hennes första roman.</p>");
  });

  it("gives the book the project's language", async () => {
    const { zip } = await build("en-GB");

    const opf = await read(zip, "OEBPS/content.opf");

    expect(opf).toContain("<dc:language>en-GB</dc:language>");
    expect(opf).toContain('xml:lang="en-GB"');
    expect(await read(zip, "OEBPS/nav.xhtml")).toContain("<h1>Contents</h1>");
    expect(await read(zip, "OEBPS/text/chapter-1.xhtml")).toContain("Chapter 1");
    expect(await read(zip, "OEBPS/text/copyright.xhtml")).toContain("All rights reserved.");
  });

  it("describes its accessibility, as the EU accessibility act asks of e-books", async () => {
    const { zip } = await build();

    const opf = await read(zip, "OEBPS/content.opf");

    expect(opf).toContain('<meta property="schema:accessMode">textual</meta>');
    expect(opf).toContain('<meta property="schema:accessModeSufficient">textual</meta>');
    expect(opf).toContain('<meta property="schema:accessibilityFeature">tableOfContents</meta>');
    expect(opf).toContain('<meta property="schema:accessibilityHazard">none</meta>');
    expect(opf).toContain('<meta property="schema:accessibilitySummary">');
  });

  it("starts with an uncompressed mimetype, as EPUB readers require", async () => {
    const { bytes } = await build();

    const header = new TextDecoder().decode(bytes.slice(30, 58));

    expect(header).toBe("mimetypeapplication/epub+zip");
  });

  it("points the container at the package, which lists every page in reading order", async () => {
    const { zip } = await build();
    const container = await read(zip, "META-INF/container.xml");
    const opf = await read(zip, "OEBPS/content.opf");

    expect(container).toContain('full-path="OEBPS/content.opf"');
    expect(opf).toContain("<dc:title>Vintervägen</dc:title>");
    expect(opf).toContain("<dc:creator>Elin Berg</dc:creator>");
    expect(opf).toContain("<dc:language>sv-SE</dc:language>");
    expect(opf).toContain("2026-10-03T12:00:00Z");
    expect(opf).toContain('properties="cover-image"');
    const spine = [...opf.matchAll(/<itemref idref="([^"]+)"/g)].map((match) => match[1]);
    expect(spine).toEqual([
      "cover",
      "title",
      "copyright",
      "nav",
      "opening",
      "chapter-1",
      "chapter-2",
    ]);
  });

  it("lists the chapters in the table of contents", async () => {
    const { zip } = await build();

    const nav = await read(zip, "OEBPS/nav.xhtml");

    expect(nav).toContain('epub:type="toc"');
    expect(nav).toContain('<a href="text/chapter-1.xhtml">Kapitel 1. Brevet</a>');
    expect(nav).toContain("Kapitel 2. Fyren &amp; havet");
  });

  it("writes the scenes as XHTML with escaped text, emphasis, scene breaks and styles", async () => {
    const { zip } = await build();

    const chapter = await read(zip, "OEBPS/text/chapter-1.xhtml");

    expect(chapter).toContain('<html xmlns="http://www.w3.org/1999/xhtml"');
    expect(chapter).toContain("<em>bordet</em> &lt;&amp; så&gt;.");
    expect(chapter).toContain('<hr class="scene-break"');
    expect(chapter).toContain('<div class="brev">');
    expect(chapter).toContain("Hon sa ”nej”.");
    expect(chapter).toContain('Se <a href="https://skrivro.se">Skrivro</a> och H<sub>2</sub>O.');
  });

  it("has a cover and a copyright page with the author", async () => {
    const { zip } = await build();

    const [cover, copyright] = [
      await read(zip, "OEBPS/cover.svg"),
      await read(zip, "OEBPS/text/copyright.xhtml"),
    ];

    expect(cover).toContain("Vintervägen");
    expect(copyright).toContain("© 2026 Elin Berg");
  });
});

describe("buildEpub with a cover picture", () => {
  it("uses the writer's picture instead of the typographic cover", async () => {
    const files = createMemoryFileSystem(FILES);
    const outline = bookOutline(tree);
    const ids = outline.flatMap((item) => (item.kind === "scene" ? [item.id] : []));
    const scenes = await readBookScenes(files, "/bok", ids, {});
    const picture = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

    const bytes = await buildEpub({
      book: BOOK,
      outline,
      scenes,
      typography: "svensk",
      language: "sv-SE",
      extras: {},
      identifier: "urn:uuid:3f1c2a64-0d5e-4b7a-9a1e-6c2b8d4e5f70",
      modified: new Date("2026-10-03T12:00:00Z"),
      parts: { hasTitlePage: false, hasCopyrightPage: false, hasContents: false },
      cover: { type: "jpeg", bytes: picture },
    });

    const zip = await JSZip.loadAsync(bytes);
    const opf = await read(zip, "OEBPS/content.opf");
    expect(opf).toContain('href="cover.jpg" media-type="image/jpeg" properties="cover-image"');
    expect(zip.file("OEBPS/cover.svg")).toBeNull();
    expect(await zip.file("OEBPS/cover.jpg")?.async("uint8array")).toEqual(picture);
    expect(await read(zip, "OEBPS/text/cover.xhtml")).toContain('src="../cover.jpg"');
  });
});

describe("buildEpub with a designed chapter heading", () => {
  it("prints the subtitle, epigraph and the template's picture, and carries the pictures in the book", async () => {
    const outline = bookOutline(tree).map((item) =>
      item.kind === "chapter" && item.number === 1
        ? { ...item, subtitle: "Elin", epigraph: "Isen bär.", epigraphBy: "Ordspråk" }
        : item,
    );
    const ornament = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 11, 8, 0, 1, 0, 1, 1, 0, 0]);
    const area = { id: "a", picture: "rosett.jpg", x: 0.3, y: 0.1, width: 0.4, height: 0.1 };
    const openings = [{ ...DEFAULT_DESIGN.openings[0], areas: [{ ...area, fit: "hela" }] }];
    const design = { ...DEFAULT_DESIGN, chapterLabel: "siffra", openings } as BookDesign;

    const { zip } = await build(
      "sv-SE",
      {},
      {
        outline,
        design: { ...design, titleCase: "versaler" },
        images: new Map([["rosett.jpg", ornament]]),
      },
    );

    const chapter = await read(zip, "OEBPS/text/chapter-1.xhtml");
    expect(chapter).toContain(
      '<div class="opening-picture"><img src="../bilder/rosett.jpg" alt="" />',
    );
    expect(chapter).toContain('<span class="label">1</span>');
    expect(chapter).toContain('<span class="subtitle">Elin</span>');
    expect(chapter).toContain('<blockquote class="epigraph"><p>Isen bär.</p>');
    const opf = await read(zip, "OEBPS/content.opf");
    expect(opf).toContain('href="bilder/rosett.jpg" media-type="image/jpeg"');
    expect(await read(zip, "OEBPS/style.css")).toContain("text-transform: uppercase");
  });
});
