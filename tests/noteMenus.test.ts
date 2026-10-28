import { describe, expect, it } from "vitest";
import { noteItems } from "../src/app/tree/noteMenus";
import { rowMenu } from "../src/app/tree/treeMenus";
import type { TreeMenuActions } from "../src/app/tree/treeMenus";

const noop = () => undefined;
const actions = {
  linkOf: () => true,
  setLink: noop,
  moveToSeries: null,
  otherSorts: () => [],
  moveInto: noop,
  saveAsTemplate: noop,
  makeScene: noop,
  chapters: () => [{ id: "k1", name: "Kapitel 1" }],
  isFile: () => false,
  newLapp: noop,
} as unknown as TreeMenuActions;

const labelsOf = (menu: TreeMenuActions) =>
  (noteItems({ id: "n", kind: "scene" }, menu) ?? []).map((item) => item.label);

describe("the menu of a note", () => {
  it("offers Gör till scen and Spara som mall for a note with text", () => {
    expect(labelsOf(actions)).toEqual(
      expect.arrayContaining(["Gör till scen i", "Spara som mall"]),
    );
  });

  it("offers neither for a note that holds a file, which has no text to make a scene or a template of", () => {
    const labels = labelsOf({ ...actions, isFile: () => true });

    expect(labels).not.toContain("Gör till scen i");
    expect(labels).not.toContain("Spara som mall");
  });
});

describe("the menu of the sort Lappar", () => {
  const menuOf = (id: string) =>
    rowMenu({ id, kind: "sort" }, false, { ...actions, linkOf: () => null }).map(
      (item) => item.label,
    );

  it("has Lägg till fil for an ordinary sort but not for Lappar, which hold what is written on them", () => {
    expect(menuOf("platser")).toContain("Lägg till fil…");
    expect(menuOf("lappar")).not.toContain("Lägg till fil…");
  });

  it("starts a lapp, not a note with a name, from the sort Lappar", () => {
    expect(menuOf("lappar")).toContain("Ny lapp");
    expect(menuOf("lappar")).not.toContain("Ny anteckning");
    expect(menuOf("platser")).toContain("Ny anteckning");
  });
});

describe("the menu of a scene in the manuscript", () => {
  const moved: string[] = [];
  const sceneActions = {
    ...actions,
    linkOf: () => null,
    statusOf: () => null,
    statusName: () => "",
    canMerge: () => false,
    editLabels: null,
    labelItems: null,
    showDrafts: null,
    otherSorts: () => [
      { id: "platser", name: "Platser" },
      { id: "lappar", name: "Lappar" },
    ],
    moveInto: (_node: unknown, sortId: string) => void moved.push(sortId),
  } as unknown as TreeMenuActions;

  it("makes it a note in a sort, the way back from Gör till scen, but not a lapp", () => {
    const item = rowMenu({ id: "s", kind: "scene" }, false, sceneActions).find(
      (each) => each.label === "Gör till anteckning i",
    );

    expect(item?.submenu?.map((each) => each.label)).toEqual(["Platser"]);
    item?.submenu?.[0]?.onSelect?.();
    expect(moved).toEqual(["platser"]);
  });
});
