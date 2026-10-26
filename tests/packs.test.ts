import { afterEach, describe, expect, it } from "vitest";
import { setUiLanguage } from "../src/i18n/i18n";
import { createProject } from "../src/project/newProject";
import {
  isPackInBook,
  joinSorts,
  noteOf,
  noteTemplates,
  packOf,
  packs,
  standardNoteBody,
} from "../src/project/packs";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { countDocumentWords } from "../src/manuscript/wordCount";
import { readProjectFile } from "../src/project/projectFile";
import { CHARACTERS_ID } from "../src/project/sorts";
import { structures, templatePieces } from "../src/project/templates";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import type { TreeNode } from "../src/project/tree";

afterEach(() => setUiLanguage("sv"));

const details = {
  title: "Glömda Minnen",
  type: "roman",
  structure: "romantasy",
  pieces: [],
  dailyGoal: 500,
  deadline: "",
  narration: null,
};

const childrenOf = (tree: TreeNode[], match: (node: TreeNode) => boolean) =>
  tree.find(match)?.children ?? [];

describe("genre packs", () => {
  it("keep the basics free and the genres in packs", () => {
    expect(packOf("tre-akter")).toBeNull();
    expect(packOf("hjaltens-resa")).toBeNull();
    expect(packOf("romantasy")?.id).toBe("romantasy");
    expect(packOf("deckare")?.id).toBe("deckare");
  });

  it("hold only structures and pieces that exist, in Swedish and English alike", () => {
    const known = new Set([...structures(), ...templatePieces()].map((each) => each.id));
    const swedish = packs();
    setUiLanguage("en");
    const english = packs();

    const shape = (all: typeof swedish) =>
      all.map((pack) => [
        pack.id,
        pack.notes.length,
        [...pack.structures, ...pack.pieces].map((template) => template.id),
      ]);
    expect(shape(english)).toEqual(shape(swedish));
    const withTemplates = swedish.filter((pack) =>
      [...known].some((id) => packOf(id)?.id === pack.id),
    );
    expect(withTemplates.map((pack) => pack.id)).toEqual(swedish.map((pack) => pack.id));
  });

  it("start a romantasy book with its own pack only, its labels, guides and character templates", async () => {
    const files = createMemoryFileSystem({});

    const created = await createProject(files, "/Skrivro", {
      ...details,
      genre: "romans",
      pieces: ["magi"],
    });

    const { tree, fields } = await readProjectFile(files, created.dir, []);
    expect(fields["packs"]).toEqual(["romantasy"]);
    expect(JSON.stringify(fields["labels"])).toContain("Svek");
    expect(childrenOf(tree, (node) => node.title === "Guide")).toHaveLength(6);
    expect(tree.some((node) => node.title === "Världen")).toBe(true);
    expect(noteTemplates(fields, "Världen")).toHaveLength(2);
    expect(noteTemplates(fields, CHARACTERS_ID).map((each) => each.name)).toContain(
      "Huvudpersonen",
    );
  });

  it("offer a crime pack's templates for Ledtrådar and Personer, and write its guides as lists", async () => {
    const files = createMemoryFileSystem({});

    const created = await createProject(files, "/Skrivro", {
      ...details,
      structure: "deckare",
      genre: "deckare",
    });

    const { tree, fields } = await readProjectFile(files, created.dir, []);
    expect(tree.filter((node) => node.title === "Ledtrådar")).toHaveLength(1);
    expect(noteTemplates(fields, "Ledtrådar")).toHaveLength(2);
    const detective = noteTemplates(fields, CHARACTERS_ID).find(
      (each) => each.name === "Utredaren",
    );
    expect(detective?.name).toBe("Utredaren");
    expect(detective?.body).not.toContain("Byt namn");
    const [promises] = childrenOf(tree, (node) => node.title === "Guide");
    const guide = await files.readText(`${created.dir}/scenes/${promises?.id ?? ""}.md`);
    expect(guide).toContain("::: punktlista");
    expect(guide).not.toMatch(/^- /m);
  });

  it("note the packs a book starts with, so they are never added again", async () => {
    const files = createMemoryFileSystem({});

    const created = await createProject(files, "/Skrivro", { ...details, structure: "deckare" });

    const { fields } = await readProjectFile(files, created.dir, []);
    const [crime, horror] = ["deckare", "skrack"].map((id) =>
      packs().find((pack) => pack.id === id),
    );
    expect(fields["packs"]).toEqual(["deckare"]);
    expect(crime && isPackInBook(fields, crime)).toBe(true);
    expect(horror && isPackInBook(fields, horror)).toBe(false);
  });

  it("know a pack in a book from before it was noted, by its labels", () => {
    const horror = packs().find((pack) => pack.id === "skrack");
    if (!horror) throw new Error("no horror pack");
    const labels = horror.pieces[0]?.labels.map(([name, color]) => ({ name, color })) ?? [];

    expect(isPackInBook({ labels }, horror)).toBe(true);
    expect(isPackInBook({ labels: labels.slice(1) }, horror)).toBe(false);
  });

  it("start a book of the basics with no pack notes", async () => {
    const files = createMemoryFileSystem({});

    const created = await createProject(files, "/Skrivro", { ...details, structure: "tre-akter" });

    const { tree } = await readProjectFile(files, created.dir, []);
    expect(tree.some((node) => node.title === "Guide")).toBe(false);
    expect(childrenOf(tree, (node) => node.id === CHARACTERS_ID)).toHaveLength(0);
  });
});

describe("joinSorts", () => {
  it("joins sorts of the same name, and keeps fixed sorts without a name apart", () => {
    const joined = joinSorts([
      { id: "karaktarer", kind: "sort", children: [{ id: "A", kind: "scene" }] },
      { id: "saker", kind: "sort", children: [{ id: "B", kind: "scene" }] },
      { id: "x1", kind: "sort", title: "Ledtrådar", children: [] },
      { id: "x2", kind: "sort", title: "Ledtrådar", children: [{ id: "C", kind: "scene" }] },
    ]);

    expect(joined.map((sort) => [sort.id, sort.children?.length])).toEqual([
      ["karaktarer", 1],
      ["saker", 1],
      ["x1", 1],
    ]);
  });
});

it("gives every pack note a title", () => {
  const untitled = packs().flatMap((pack) => pack.notes.filter((note) => !note.title));
  expect(untitled).toEqual([]);
});

describe("the free basics", () => {
  it("give a book without packs a standard person that counts no words until it is answered", () => {
    const body = standardNoteBody({}, CHARACTERS_ID);

    expect(body).toContain("<!--");
    expect(countDocumentWords(parseMarkdown(body, { isNote: true }))).toBe(0);
  });

  it("have as many templates in English as in Swedish", () => {
    const fixed = [CHARACTERS_ID, "platser", "saker", "anteckningar", "hemligheter"];
    const counts = (named: string[]) =>
      [...fixed, ...named].map((sort) => noteTemplates({}, sort).length);
    const swedish = counts(["Teman", "Motiv", "Källor", "Serien"]);
    setUiLanguage("en");

    expect(counts(["Themes", "Motifs", "Sources", "Series"])).toEqual(swedish);
    expect(swedish.every((count) => count > 0)).toBe(true);
  });

  it("are not a pack to buy", () => {
    expect(packs().map((pack) => pack.id)).not.toContain("grund");
  });
});

describe("noteOf", () => {
  it("reads the standard line and keeps the sort when the front matter has more lines", () => {
    const note = noteOf(
      "---\nsort: platser\nstandard: true\nextra: x\n---\n# Plats (mall)\n\nText",
    );

    expect(note).toMatchObject({ sort: "platser", isStandard: true, title: "Plats (mall)" });
  });

  it("reads a note with only a sort as not standard", () => {
    expect(noteOf("---\nsort: Guide\n---\n# Titel\n\nText").isStandard).toBe(false);
  });
});
