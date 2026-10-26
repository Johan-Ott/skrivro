import { describe, expect, it } from "vitest";
import { contentsRows } from "../src/project/contents";
import { notesMatching, rowMatches } from "../src/project/contentsFilter";
import type { TreeNode } from "../src/project/tree";

const tree: TreeNode[] = [
  { id: "kap1", kind: "chapter", title: "Brevet", children: [{ id: "koket", kind: "scene" }] },
  {
    id: "kap2",
    kind: "chapter",
    title: "Smältningen",
    children: [{ id: "regnet", kind: "scene" }],
  },
];
const summaries = {
  koket: { title: "Köket", words: 10, status: "utkast" },
  regnet: { title: "Regnet", words: 10, status: "utkast" },
} as never;

describe("Innehåll's filter", () => {
  it("keeps the chapters where a person is named, and those only", () => {
    const sources = {
      tree,
      fields: {},
      cards: [{ id: "arvid", sortId: "karaktarer", name: "Arvid" }],
      mentions: new Map([["arvid", { count: 1, sceneIds: ["koket"], sentences: {} }]]),
    };
    const [brevet, smaltningen] = contentsRows(tree, summaries);

    expect(brevet && rowMatches(sources, brevet, "arv")).toBe(true);
    expect(smaltningen && rowMatches(sources, smaltningen, "arv")).toBe(false);
  });
});

describe("Innehåll's filter for notes", () => {
  const withNotes: TreeNode[] = [
    ...tree,
    {
      id: "karaktarer",
      kind: "sort",
      children: [
        { id: "elin", kind: "scene", labels: ["L1"] },
        { id: "arvid", kind: "scene" },
      ],
    },
  ];
  const sources = {
    tree: withNotes,
    fields: { labels: [{ id: "L1", name: "Huvudperson", color: "#c33" }] },
  };
  const noteSummaries = {
    elin: { title: "Elin", words: 3, status: "idé" },
    arvid: { title: "Arvid Holm", words: 3, status: "idé", aliases: ["Eken"] },
  } as never;

  it("finds a note by a label on it, by its name and by another name", () => {
    expect(notesMatching(sources, noteSummaries, "huvud")).toEqual([{ id: "elin", title: "Elin" }]);
    expect(notesMatching(sources, noteSummaries, "holm")).toEqual([
      { id: "arvid", title: "Arvid Holm" },
    ]);
    expect(notesMatching(sources, noteSummaries, "eke")).toEqual([
      { id: "arvid", title: "Arvid Holm" },
    ]);
  });

  it("finds nothing for an empty filter or a word no note has", () => {
    expect(notesMatching(sources, noteSummaries, "")).toEqual([]);
    expect(notesMatching(sources, noteSummaries, "zzz")).toEqual([]);
  });
});
