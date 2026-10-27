import { describe, expect, it } from "vitest";
import { addMenu, rowMenu, type TreeMenuActions } from "../src/app/tree/treeMenus";
import { DEFAULT_STEPS } from "../src/project/statusSteps";
import { CHARACTERS_ID, TRASH_ID, type TreeNode } from "../src/project/tree";

const noop = () => undefined;
const actions: TreeMenuActions = {
  open: noop,
  add: noop,
  rename: noop,
  trash: noop,
  restore: noop,
  openBeside: noop,
  setStatus: noop,
  statusOf: () => "utkast",
  statusName: (status) => DEFAULT_STEPS[status].name,
  showSnapshots: () => undefined,
  linkOf: () => null,
  setLink: noop,
  newNote: noop,
  addFile: noop,
  moveToSeries: null,
  canMerge: () => false,
  mergeWithNext: noop,
  labelItems: null,
  editLabels: null,
  showDrafts: null,
  focus: noop,
  otherSorts: () => [],
  moveInto: noop,
  saveAsTemplate: null,
  makeScene: null,
  chapters: () => [],
  wasNote: () => false,
  isFile: () => false,
  newLapp: null,
};
const labels = (items: ReturnType<typeof rowMenu>) =>
  items.map((item) => (item.separatorBefore ? `| ${item.label}` : item.label));

const node = (kind: TreeNode["kind"], id = "x"): TreeNode => ({ id, kind });

describe("tree menus", () => {
  it("offers the same four new items from the add button and empty space", () => {
    expect(addMenu(actions).map((item) => item.label)).toEqual([
      "Ny scen",
      "Nytt kapitel",
      "Ny del",
      "Ny mapp",
    ]);
  });

  it("gives a scene a complete menu", () => {
    expect(labels(rowMenu(node("scene"), false, actions))).toEqual([
      "Öppna",
      "Öppna bredvid",
      "Versioner…",
      "| Ny scen efter",
      "Nytt kapitel efter",
      "| Status",
      "| Byt namn",
      "Flytta till papperskorg",
    ]);
  });

  it("checks the status the scene has", () => {
    const items = rowMenu(node("scene"), false, actions);
    const steps = items.find((item) => item.label === "Status")?.submenu ?? [];

    expect(steps.filter((item) => item.isChecked).map((item) => item.label)).toEqual(["Utkast"]);
  });

  it("adds new things inside a chapter, a part and a folder", () => {
    expect(labels(rowMenu(node("chapter"), false, actions)).slice(0, 2)).toEqual([
      "Ny scen i kapitlet",
      "Nytt kapitel efter",
    ]);
    expect(labels(rowMenu(node("part"), false, actions)).slice(0, 2)).toEqual([
      "Ny scen i delen",
      "Nytt kapitel i delen",
    ]);
    expect(labels(rowMenu(node("folder"), false, actions)).slice(0, 2)).toEqual([
      "Ny scen i mappen",
      "Ny mapp i mappen",
    ]);
  });

  it("lets a fixed sort be renamed and trashed, as the writer's own sorts are", () => {
    expect(labels(rowMenu(node("sort", CHARACTERS_ID), false, actions))).toEqual([
      "Ny anteckning",
      "Lägg till fil…",
      "| Byt namn",
      "Flytta till papperskorg",
    ]);
  });

  it("lets the writer's own sort be renamed and trashed", () => {
    expect(labels(rowMenu(node("sort", "fordon"), false, actions))).toEqual([
      "Ny anteckning",
      "Lägg till fil…",
      "| Byt namn",
      "Flytta till papperskorg",
    ]);
  });

  it("moves a note to another sort from Flytta till", () => {
    const moved: string[] = [];
    const withSorts: TreeMenuActions = {
      ...actions,
      linkOf: () => true,
      otherSorts: () => [{ id: "platser", name: "Platser" }],
      moveInto: (_node, parentId) => moved.push(parentId),
    };
    const move = rowMenu(node("scene", "arvid"), false, withSorts).find(
      (item) => item.label === "Flytta till",
    );
    move?.submenu?.[0]?.onSelect?.();

    expect(moved).toEqual(["platser"]);
  });

  it("opens Ny anteckning for the sort when a note is added to it", () => {
    const asked: string[] = [];
    const withDialog: TreeMenuActions = { ...actions, newNote: (sortId) => asked.push(sortId) };

    rowMenu(node("sort", "fordon"), false, withDialog)[0]?.onSelect?.();

    expect(asked).toEqual(["fordon"]);
  });

  it("offers a note the choice to link its name instead of a status", () => {
    const changes: boolean[] = [];
    const forNote: TreeMenuActions = {
      ...actions,
      linkOf: () => true,
      setLink: (_node, isLinked) => changes.push(isLinked),
    };

    const items = rowMenu(node("scene", "arvid"), false, forNote);
    items.find((item) => item.label === "Koppla namnet i texten")?.onSelect?.();

    expect(labels(items)).not.toContain("| Status");
    expect(items.find((item) => item.label === "Koppla namnet i texten")?.isChecked).toBe(true);
    expect(changes).toEqual([false]);
  });

  it("offers to move a book's note into the series when the book is in one", () => {
    const moved: string[] = [];
    const inSeries: TreeMenuActions = {
      ...actions,
      linkOf: () => true,
      moveToSeries: (note) => moved.push(note.id),
    };

    rowMenu(node("scene", "arvid"), false, inSeries)
      .find((item) => item.label === "Flytta till serien")
      ?.onSelect?.();

    expect(moved).toEqual(["arvid"]);
  });

  it("offers to merge the open scene with the next one when there is one", () => {
    const merged: string[] = [];
    const withNext: TreeMenuActions = {
      ...actions,
      canMerge: (scene) => scene.id === "s1",
      mergeWithNext: () => merged.push("s1"),
    };

    rowMenu(node("scene", "s1"), false, withNext)
      .find((item) => item.label === "Slå ihop med nästa scen")
      ?.onSelect?.();

    expect(merged).toEqual(["s1"]);
    expect(labels(rowMenu(node("scene", "s2"), false, withNext))).not.toContain(
      "Slå ihop med nästa scen",
    );
  });

  it("offers nothing on Papperskorg itself and only a way back for things in it", () => {
    expect(rowMenu(node("folder", TRASH_ID), false, actions)).toEqual([]);
    expect(labels(rowMenu(node("scene"), true, actions))).toEqual(["Lägg tillbaka i manuset"]);
  });

  it("calls a thing from a sort in Papperskorg Lägg tillbaka, and a scene's way back i manuset", () => {
    const fromSort: TreeMenuActions = { ...actions, wasNote: () => true };

    expect(labels(rowMenu(node("scene"), true, fromSort))).toEqual(["Lägg tillbaka"]);
  });

  it("lets a note become a scene last in the book or in a chapter, but not in a series", () => {
    const made: string[] = [];
    const inBook: TreeMenuActions = {
      ...actions,
      linkOf: () => true,
      chapters: () => [{ id: "k1", name: "1. Brevet" }],
      makeScene: (note, chapterId) => made.push(`${note.id}:${chapterId}`),
    };

    const submenu = rowMenu(node("scene", "elin"), false, inBook).find(
      (item) => item.label === "Gör till scen i",
    )?.submenu;
    submenu?.forEach((item) => item.onSelect?.());

    expect(submenu?.map((item) => item.label)).toEqual(["Sist i manuset", "1. Brevet"]);
    expect(made).toEqual(["elin:null", "elin:k1"]);
    expect(labels(rowMenu(node("scene"), false, { ...inBook, makeScene: null }))).not.toContain(
      "Gör till scen i",
    );
  });

  it("shows the keyboard shortcuts", () => {
    const items = rowMenu(node("scene"), false, actions);

    expect(items.find((item) => item.label === "Byt namn")?.shortcut).toBe("F2");
    expect(items.find((item) => item.label === "Flytta till papperskorg")?.shortcut).toBe("Delete");
  });
});
