import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import { describe, expect, it } from "vitest";
import { addToCuts, cutBlock, selectionMarkdown } from "../src/app/cuts";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { findNode, type TreeNode } from "../src/project/tree";

const tree: TreeNode[] = [
  { id: "anteckningar", kind: "sort", children: [{ id: "elin", kind: "scene" }] },
];
const summaries = { elin: { title: "Elin", words: 0, status: "idé" as const } };

describe("cutBlock", () => {
  it("puts the date and the place on a line before the text", () => {
    expect(cutBlock("2026-10-27", "1. Isen · Brevet", "Brevet låg kvar.")).toBe(
      "*2026-10-27 · 1. Isen · Brevet*\n\nBrevet låg kvar.\n\n",
    );
  });
});

describe("addToCuts", () => {
  it("makes the note Strukna under Övrigt the first time and writes the text in it", async () => {
    const files = createMemoryFileSystem({});

    const newTree = await addToCuts(
      files,
      { dir: "/bok", tree, summaries },
      "*datum*\n\nText.\n\n",
    );

    const id = findNode(newTree ?? [], "anteckningar")?.node.children?.[1]?.id ?? "";
    expect(await files.readText(`/bok/scenes/${id}.md`)).toContain("title: Strukna");
    expect(await files.readText(`/bok/scenes/${id}.md`)).toContain("*datum*\n\nText.");
  });

  it("puts a new cut above the older ones in the note it already has", async () => {
    const files = createMemoryFileSystem({});
    const first = await addToCuts(files, { dir: "/bok", tree, summaries }, "Äldre.\n\n");
    const cuts = findNode(first ?? [], "anteckningar")?.node.children?.[1]?.id ?? "";
    const known = { ...summaries, [cuts]: { title: "Strukna", words: 1, status: "idé" as const } };

    const second = await addToCuts(
      files,
      { dir: "/bok", tree: first ?? tree, summaries: known },
      "Nyare.\n\n",
    );

    expect(second).toBeNull();
    const text = await files.readText(`/bok/scenes/${cuts}.md`);
    expect(text.indexOf("Nyare.")).toBeLessThan(text.indexOf("Äldre."));
  });
});

describe("selectionMarkdown", () => {
  it("keeps italics in the cut text", () => {
    const doc = parseMarkdown("Hon sa *aldrig* mer.");

    expect(selectionMarkdown(doc, 1, doc.content.size - 1)).toBe("Hon sa *aldrig* mer.");
  });
});
