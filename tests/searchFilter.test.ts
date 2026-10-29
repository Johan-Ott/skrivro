import { describe, expect, it } from "vitest";
import { SearchQuery } from "prosemirror-search";
import { isKept, replaceIds, searchChips, searchIds } from "../src/app/searchFilter";
import { sceneHits } from "../src/app/searchHits";
import type { Project } from "../src/app/useProject";
import { searchableScene } from "../src/editor/manuscriptSearch";

const project = {
  tree: [
    { id: "S1", kind: "scene", labels: ["elin"] },
    { id: "S2", kind: "scene" },
  ],
  summaries: { ["S1"]: { status: "utkast" }, ["S2"]: { status: "klar" } },
} as unknown as Project;

describe("search chips", () => {
  it("keep every scene when none is chosen", () => {
    expect(isKept(project, "S2", [])).toBe(true);
  });

  it("keep a scene in either step chosen, and only with a chosen label too", () => {
    expect(isKept(project, "S2", ["status:utkast", "status:klar"])).toBe(true);
    expect(isKept(project, "S1", ["status:utkast", "label:elin"])).toBe(true);
    expect(isKept(project, "S2", ["status:klar", "label:elin"])).toBe(false);
  });
});

const book = {
  fields: {},
  tree: [
    {
      id: "K1",
      kind: "chapter",
      title: "Fyren",
      children: [
        { id: "S1", kind: "scene" },
        { id: "S2", kind: "scene" },
      ],
    },
    {
      id: "platser",
      kind: "sort",
      children: [{ id: "N1", kind: "scene", labels: ["elin"] }],
    },
    { id: "anteckningar", kind: "sort", children: [{ id: "L1", kind: "scene" }] },
  ],
  scenes: ["S1", "S2", "N1", "L1"],
  summaries: {
    ["S1"]: { title: "Natten", status: "utkast" },
    ["S2"]: { title: "Morgonen", status: "klar" },
    ["N1"]: { title: "Udden", status: "idé" },
    ["L1"]: { title: "Kikaren?", status: "idé" },
  },
} as unknown as Project;

describe("what a search goes through", () => {
  it("is the manuscript and then every note, with no chip for the notes", () => {
    expect(searchIds(book)).toEqual(["S1", "S2", "N1", "L1"]);
    expect(searchChips(book).map((chip) => chip.id)).not.toContain("anteckningar");
  });

  it("is only scenes in a step chosen, and what has a label chosen, notes too", () => {
    expect(searchIds(book, ["status:klar"])).toEqual(["S2"]);
    expect(searchIds(book, ["label:elin"])).toEqual(["N1"]);
  });

  it("leaves a scene still in the cloud out", () => {
    expect(searchIds({ ...book, scenes: ["S1", "L1"] })).toEqual(["S1", "L1"]);
  });

  it("is only the manuscript when replacing all, as before", () => {
    expect(replaceIds(book)).toEqual(["S1", "S2"]);
  });
});

describe("a hit in the list", () => {
  it("says where it is: the chapter and scene, or the note's sort", () => {
    const query = new SearchQuery({ search: "kikaren" });
    const state = searchableScene("---\nid: X\n---\nKikaren låg i lådan.\n", query);

    const places = sceneHits(book, ["S1", "N1"], () => state, query).map((hit) => hit.place);

    expect(places).toEqual(["1. Fyren · Natten", "Platser · Udden"]);
  });
});
