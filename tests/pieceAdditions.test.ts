import { describe, expect, it } from "vitest";
import { labelsOf } from "../src/project/labels";
import {
  additionsOf,
  pieceIdsFrom,
  withAdditions,
  withoutChaptersIn,
} from "../src/project/pieceAdditions";
import { sortsOf, type TreeNode } from "../src/project/tree";

const chapter: TreeNode = { id: "kap1", kind: "chapter", title: "Kroppen", children: [] };
const book = () => ({ fields: {} as Record<string, unknown>, tree: [chapter] });

describe("withAdditions", () => {
  it("adds a piece's sorts and labels to a book once, and keeps what it has", () => {
    const once = withAdditions(book(), additionsOf(["deckare"], null), []);
    const twice = withAdditions(once, additionsOf(["deckare", "romans"], null), []);

    const sorts = sortsOf(twice.tree).map((sort) => sort.title);
    expect(sorts.filter((title) => title === "Ledtrådar")).toHaveLength(1);
    expect(sorts).toContain("Relationen");
    expect(labelsOf(twice.fields).map((label) => label.name)).toContain("Misstänkt");
    expect(twice.tree[0]).toEqual(chapter);
  });

  it("adds a piece's closing chapter with the scene made for it", () => {
    const additions = additionsOf(["serie"], null);

    const added = withAdditions(book(), additions, ["scen1"]);

    const closing = added.tree.find((node) => node.title === additions.chapters[0]?.[0]);
    expect(closing?.children).toEqual([{ id: "scen1", kind: "scene" }]);
  });

  it("leaves out a closing chapter the book already has, when a piece is added again", () => {
    const additions = additionsOf(["serie"], null);
    const added = withAdditions(book(), additions, ["scen1"]);

    expect(withoutChaptersIn(added.tree, additions).chapters).toEqual([]);
    expect(withoutChaptersIn(book().tree, additions).chapters).toEqual(additions.chapters);
  });
});

describe("pieceIdsFrom", () => {
  it("reads pieces given apart or with commas", () => {
    expect(pieceIdsFrom(["deckare,romans", "skrack"])).toEqual(["deckare", "romans", "skrack"]);
  });

  it("names the pieces there are when one is unknown", () => {
    expect(() => pieceIdsFrom(["vampyr"])).toThrow(/deckare/);
  });
});

describe("the pieces", () => {
  it("add no sort for what Personer, Platser and När already hold", () => {
    const sorts = additionsOf(["deckare", "thriller", "skrack", "urban", "feelgood"], null).sorts;

    for (const overlapping of ["Misstänkta", "Tidslinje", "Platsen", "Staden", "Orten"])
      expect(sorts).not.toContain(overlapping);
  });
});
