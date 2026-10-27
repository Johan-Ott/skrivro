import { describe, expect, it } from "vitest";
import { isKept, notesLeftOut } from "../src/app/searchFilter";
import type { Project } from "../src/app/useProject";

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

describe("the notes left out of a search", () => {
  const book = {
    tree: [
      { id: "S1", kind: "scene" },
      { id: "anteckningar", kind: "sort", children: [{ id: "N1", kind: "scene" }] },
      { id: "lappar", kind: "sort", children: [{ id: "L1", kind: "scene" }] },
    ],
    scenes: ["S1", "N1", "L1"],
  } as unknown as Project;

  it("hold the lappar too, so Med anteckningar finds what is written on them", () => {
    expect(notesLeftOut(book, [])).toEqual(["N1", "L1"]);
  });

  it("are none once the notes are in the search", () => {
    expect(notesLeftOut(book, ["anteckningar"])).toEqual([]);
  });
});
