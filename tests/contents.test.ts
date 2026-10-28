import { describe, expect, it } from "vitest";
import {
  contentsGroups,
  contentsRows,
  inTimeOrder,
  leastFinished,
  movedInTime,
  sceneRows,
  withNodeText,
  withSceneMoved,
} from "../src/project/contents";
import { CHARACTERS_ID, findNode, withSpecialFolders, type TreeNode } from "../src/project/tree";
import { withNodeFields } from "../src/project/nodeFields";

const scene = (id: string): TreeNode => ({ id, kind: "scene" });
const tree: TreeNode[] = withSpecialFolders([
  {
    id: "del1",
    kind: "part",
    title: "Hemkomsten",
    children: [
      {
        id: "kap1",
        kind: "chapter",
        title: "Ankomsten",
        summary: "Elin kommer tillbaka.",
        when: "Dag 1",
        children: [scene("farjan"), scene("huset")],
      },
      { id: "kap2", kind: "chapter", title: "Isen", children: [scene("viken")] },
    ],
  },
  scene("lös"),
  { id: CHARACTERS_ID, kind: "sort", children: [scene("arvid")] },
]);
const summary = (title: string, words: number, status: "idé" | "utkast" | "klar") => ({
  title,
  words,
  status,
});
const summaries = {
  farjan: summary("Färjan", 100, "klar"),
  huset: summary("Huset", 50, "utkast"),
  viken: summary("Viken", 30, "klar"),
  lös: summary("Epilog", 10, "idé"),
  arvid: summary("Arvid", 999, "idé"),
};

describe("contentsRows", () => {
  it("lists the chapters and loose scenes in reading order, without notes", () => {
    const rows = contentsRows(tree, summaries);

    expect(rows.map((row) => [row.number, row.title, row.words, row.status])).toEqual([
      [1, "Ankomsten", 150, "utkast"],
      [2, "Isen", 30, "klar"],
      [null, "Epilog", 10, "idé"],
    ]);
    expect(rows[0]).toMatchObject({ summary: "Elin kommer tillbaka.", when: "Dag 1" });
  });

  it("calls a chapter only as finished as its least finished scene", () => {
    const status = leastFinished(["klar", "redigering", "klar"]);

    expect(status).toBe("redigering");
  });
});

describe("time order", () => {
  it("sorts by the dragged order and lets new rows follow in reading order", () => {
    const rows = contentsRows(tree, summaries);

    const ordered = inTimeOrder(rows, ["kap2"]);

    expect(ordered.map((row) => row.id)).toEqual(["kap2", "kap1", "lös"]);
  });

  it("sorts by När until anything is dragged, days by number and rows without När last", () => {
    const rows = contentsRows(tree, summaries).map((row, index) => ({
      ...row,
      when: ["Dag 10", "", "dag 2"][index] ?? "",
    }));

    const ordered = inTimeOrder(rows, []);

    expect(ordered.map((row) => row.when)).toEqual(["dag 2", "Dag 10", ""]);
  });

  it("moves a dropped row to its new place among the shown rows", () => {
    const rows = contentsRows(tree, summaries);

    const order = movedInTime(rows, "lös", 0);

    expect(order).toEqual(["lös", "kap1", "kap2"]);
  });
});

describe("withNodeText", () => {
  it("writes the summary or time of one node and leaves the rest", () => {
    const changed = withNodeText(tree, "kap2", "when", "Vintern 1987");

    expect(findNode(changed, "kap2")?.node.when).toBe("Vintern 1987");
    expect(findNode(changed, "kap1")?.node.when).toBe("Dag 1");
  });
});

describe("withNodeFields", () => {
  it("sets a chapter's heading and drops what was emptied", () => {
    const withHeading = withNodeFields(tree, "kap1", { subtitle: "Elin", epigraph: "Isen bär." });

    const changed = withNodeFields(withHeading, "kap1", { epigraph: undefined });

    expect(findNode(changed, "kap1")?.node.subtitle).toBe("Elin");
    expect(JSON.stringify(findNode(changed, "kap1")?.node)).not.toContain("epigraph");
  });
});

describe("scene rows", () => {
  it("lists a chapter's scenes, each with its own title, words and status", () => {
    const rows = sceneRows(tree, summaries, "kap1");

    expect(rows.map((row) => [row.title, row.words, row.status])).toEqual([
      ["Färjan", 100, "klar"],
      ["Huset", 50, "utkast"],
    ]);
  });

  it("moves a scene into another chapter, before a scene or last", () => {
    const before = withSceneMoved(tree, "huset", "kap2", "viken");
    const last = withSceneMoved(tree, "farjan", "kap2", null);

    expect(findNode(before, "kap2")?.node.children?.map((node) => node.id)).toEqual([
      "huset",
      "viken",
    ]);
    expect(findNode(last, "kap2")?.node.children?.map((node) => node.id)).toEqual([
      "viken",
      "farjan",
    ]);
  });
});

describe("contentsGroups", () => {
  it("groups the chapters by part, and keeps what lies outside a part on its own", () => {
    const groups = contentsGroups(tree, summaries);

    expect(
      groups.map((group) => [group.part?.title ?? null, group.rows.map((row) => row.id)]),
    ).toEqual([
      ["Hemkomsten", ["kap1", "kap2"]],
      [null, ["lös"]],
    ]);
  });
});

describe("a field set by its key, as the sync and the goal do", () => {
  it("is set as any other field, and removed again when it is undefined", () => {
    const tree: TreeNode[] = [{ id: "kap1", kind: "chapter", children: [] }];

    const withGoal = withNodeFields(tree, "kap1", { ["goal"]: 3000 });
    const without = withNodeFields(withGoal, "kap1", { ["goal"]: undefined });

    expect(findNode(withGoal, "kap1")?.node.goal).toBe(3000);
    expect(findNode(without, "kap1")?.node).not.toHaveProperty("goal");
  });
});
