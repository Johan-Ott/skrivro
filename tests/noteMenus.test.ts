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

describe("the menu of a sort", () => {
  const menuOf = (id: string) =>
    rowMenu({ id, kind: "sort" }, false, { ...actions, linkOf: () => null }).map(
      (item) => item.label,
    );

  it("starts a note or adds a file", () => {
    expect(menuOf("platser")).toEqual(expect.arrayContaining(["Ny anteckning", "Lägg till fil…"]));
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
    otherSorts: () => [{ id: "platser", name: "Platser" }],
    moveInto: (_node: unknown, sortId: string) => void moved.push(sortId),
  } as unknown as TreeMenuActions;

  it("makes it a note in a sort, the way back from Gör till scen", () => {
    const item = rowMenu({ id: "s", kind: "scene" }, false, sceneActions).find(
      (each) => each.label === "Gör till anteckning i",
    );

    expect(item?.submenu?.map((each) => each.label)).toEqual(["Platser"]);
    item?.submenu?.[0]?.onSelect?.();
    expect(moved).toEqual(["platser"]);
  });
});
