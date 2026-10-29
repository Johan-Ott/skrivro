import { describe, expect, it } from "vitest";
import { readProjectFile, UnreadableProject, writeProjectFile } from "../src/project/projectFile";
import {
  CHARACTERS_ID,
  NOTES_ID,
  SECRETS_ID,
  PLACES_ID,
  THINGS_ID,
  TRASH_ID,
} from "../src/project/tree";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";

const PROJECT_PATH = "/bok/project.json";

describe("readProjectFile", () => {
  it("reads the tree and keeps every other field", async () => {
    const stored = { title: "Vintervägen", goal: 90000, tree: [{ id: "s1", kind: "scene" }] };
    const files = createMemoryFileSystem({ [PROJECT_PATH]: JSON.stringify(stored) });

    const project = await readProjectFile(files, "/bok", ["s1"]);

    expect(project.tree.map((node) => node.id)).toEqual(["s1"]);
    expect(project.fields).toEqual({ title: "Vintervägen", goal: 90000 });
    expect(project.repairCopy).toBeNull();
    expect(project.isNewerFormat).toBe(false);
  });

  it("knows a project saved by a newer Skrivro, so it can be opened read-only", async () => {
    const stored = { formatVersion: 2, tree: [{ id: "s1", kind: "scene" }] };
    const files = createMemoryFileSystem({ [PROJECT_PATH]: JSON.stringify(stored) });

    const project = await readProjectFile(files, "/bok", ["s1"]);

    expect(project.isNewerFormat).toBe(true);
  });

  it("fails, instead of starting over, when project.json is there but cannot be read", async () => {
    const files = createMemoryFileSystem({ [PROJECT_PATH]: '{"title":"Vintervägen"}' });
    files.readText = () => Promise.reject(new Error("os error 32"));

    await expect(readProjectFile(files, "/bok", ["s1"])).rejects.toThrow("os error 32");
  });

  it("starts a tree from the scene files when the folder has no project.json", async () => {
    const files = createMemoryFileSystem({});

    const project = await readProjectFile(files, "/bok", ["s2", "s1"]);

    expect(project.tree.map((node) => node.id)).toEqual([
      "s1",
      "s2",
      CHARACTERS_ID,
      PLACES_ID,
      THINGS_ID,
      NOTES_ID,
      SECRETS_ID,
      TRASH_ID,
    ]);
  });

  it("keeps a copy of a broken project.json and rebuilds the tree", async () => {
    const files = createMemoryFileSystem({ [PROJECT_PATH]: '{ "tree": [ trasig' });

    const project = await readProjectFile(files, "/bok", ["s1"]);

    expect(project.tree.map((node) => node.id)).toEqual([
      "s1",
      CHARACTERS_ID,
      PLACES_ID,
      THINGS_ID,
      NOTES_ID,
      SECRETS_ID,
      TRASH_ID,
    ]);
    expect(project.repairCopy).toMatch(/^project\.json\.trasig-/);
    expect(await files.readText(`/bok/${project.repairCopy ?? ""}`)).toBe('{ "tree": [ trasig');
    expect(JSON.parse(await files.readText(PROJECT_PATH)).tree).toHaveLength(7);
  });

  it("repairs an invalid node by keeping every valid node and every field", async () => {
    const stored = {
      title: "Vintervägen",
      tree: [
        { id: "k1", kind: "chapter", title: "Brevet", children: [{ id: "s1", kind: "scene" }] },
        { id: 5, kind: "part", children: [{ id: "s2", kind: "scene" }] },
      ],
    };
    const files = createMemoryFileSystem({ [PROJECT_PATH]: JSON.stringify(stored) });

    const project = await readProjectFile(files, "/bok", ["s1", "s2"]);

    expect(project.repairCopy).not.toBeNull();
    expect(project.fields).toEqual({ title: "Vintervägen" });
    expect(project.tree).toEqual([
      { id: "k1", kind: "chapter", title: "Brevet", children: [{ id: "s1", kind: "scene" }] },
      { id: "s2", kind: "scene" },
    ]);
    expect(JSON.parse(await files.readText(PROJECT_PATH)).title).toBe("Vintervägen");
  });

  it("never rewrites a newer Skrivro's project.json, even with nodes it does not know", async () => {
    const text = JSON.stringify({ formatVersion: 2, tree: [{ id: "x", kind: "tidslinje" }] });
    const files = createMemoryFileSystem({ [PROJECT_PATH]: text });

    const project = await readProjectFile(files, "/bok", []);

    expect(project.isNewerFormat).toBe(true);
    expect(await files.readText(PROJECT_PATH)).toBe(text);
  });

  it("leaves a half-written file alone when it may not repair", async () => {
    const files = createMemoryFileSystem({ [PROJECT_PATH]: '{ "tree": [ halv' });

    await expect(readProjectFile(files, "/bok", ["s1"], false)).rejects.toThrow(UnreadableProject);
    expect(await files.readText(PROJECT_PATH)).toBe('{ "tree": [ halv');
  });
});

describe("writeProjectFile", () => {
  it("writes the tree next to the other fields, readable by people", async () => {
    const files = createMemoryFileSystem({});

    await writeProjectFile(files, "/bok", { title: "Vintervägen" }, [{ id: "s1", kind: "scene" }]);

    const text = await files.readText(PROJECT_PATH);
    expect(JSON.parse(text)).toEqual({
      title: "Vintervägen",
      formatVersion: 1,
      tree: [{ id: "s1", kind: "scene" }],
    });
    expect(text).toContain('\n  "tree"');
  });
});
