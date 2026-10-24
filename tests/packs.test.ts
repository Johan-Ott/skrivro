import { afterEach, describe, expect, it } from "vitest";
import { setUiLanguage } from "../src/i18n/i18n";
import { createProject } from "../src/project/newProject";
import { packOf, packs } from "../src/project/packs";
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

  it("start a romantasy book with the pack's guides and character templates", async () => {
    const files = createMemoryFileSystem({});

    const created = await createProject(files, "/Skrivro", details);

    const { tree } = await readProjectFile(files, created.dir, []);
    expect(childrenOf(tree, (node) => node.title === "Guide")).toHaveLength(4);
    expect(childrenOf(tree, (node) => node.title === "Världen")).toHaveLength(2);
    expect(childrenOf(tree, (node) => node.id === CHARACTERS_ID)).toHaveLength(3);
  });

  it("start a book of the basics with no pack notes", async () => {
    const files = createMemoryFileSystem({});

    const created = await createProject(files, "/Skrivro", { ...details, structure: "tre-akter" });

    const { tree } = await readProjectFile(files, created.dir, []);
    expect(tree.some((node) => node.title === "Guide")).toBe(false);
    expect(childrenOf(tree, (node) => node.id === CHARACTERS_ID)).toHaveLength(0);
  });
});
