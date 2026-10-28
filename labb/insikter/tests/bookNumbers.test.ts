import { describe, expect, it } from "vitest";
import { wordsByLabel, wordsByStatus } from "../src/project/bookNumbers";
import type { TreeNode } from "../src/project/tree";

const tree: TreeNode[] = [
  {
    id: "kap",
    kind: "chapter",
    labels: ["vinter"],
    children: [
      { id: "ett", kind: "scene", labels: ["elin"] },
      { id: "tva", kind: "scene" },
    ],
  },
];
const summaries = {
  ett: { title: "Ett", words: 100, status: "utkast" },
  tva: { title: "Två", words: 50, status: "klar" },
} as never;

describe("book numbers", () => {
  it("adds the words of each step", () => {
    expect(wordsByStatus(tree, summaries)).toEqual({
      idé: 0,
      utkast: 100,
      redigering: 0,
      klar: 50,
    });
  });

  it("counts a chapter's label for every scene in it", () => {
    const labels = [
      { id: "vinter", name: "Vinter", color: "#2f86c9" },
      { id: "elin", name: "Elin", color: "#d4483b" },
    ];

    expect(wordsByLabel(tree, summaries, labels).map((row) => row.words)).toEqual([150, 100]);
  });
});
