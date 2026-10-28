import { describe, expect, it } from "vitest";
import { foldedSectionsIn, keepFoldedSections, sectionOf } from "../src/app/tree/foldedSections";
import { sortsOf, withSpecialFolders } from "../src/project/tree";

const memory = () => {
  const kept = new Map<string, string>();
  return {
    getItem: (key: string) => kept.get(key) ?? null,
    setItem: (key: string, value: string) => void kept.set(key, value),
  };
};

describe("the sections folded in the sidebar", () => {
  it("are the notes the first time a book opens, and the manuscript open", () => {
    expect(foldedSectionsIn(memory(), "/bok")).toEqual({ book: false, notes: true });
  });

  it("are kept per book on this device", () => {
    const storage = memory();
    keepFoldedSections(storage, "/bok", { book: true, notes: false });

    expect(foldedSectionsIn(storage, "/bok")).toEqual({ book: true, notes: false });
    expect(foldedSectionsIn(storage, "/annan")).toEqual({ book: false, notes: true });
  });

  it("start as the first time when what is kept cannot be read", () => {
    const storage = memory();
    storage.setItem("skrivro.folded./bok", "{ trasig");

    expect(foldedSectionsIn(storage, "/bok")).toEqual({ book: false, notes: true });
  });

  it("take only yes or no from what is kept", () => {
    const storage = memory();
    storage.setItem("skrivro.folded./bok", '{ "book": true, "notes": "nej" }');

    expect(foldedSectionsIn(storage, "/bok")).toEqual({ book: true, notes: true });
  });
});

describe("the section a node is in", () => {
  const tree = withSpecialFolders([
    { id: "kap1", kind: "chapter", children: [{ id: "scen1", kind: "scene" }] },
  ]);
  const sortId = sortsOf(tree)[0]?.id;
  const withNote = tree.map((node) =>
    node.id === sortId ? { ...node, children: [{ id: "not1", kind: "scene" as const }] } : node,
  );

  it("is the notes for a note in a sort, and the manuscript for a scene", () => {
    expect(sectionOf(withNote, "not1")).toBe("notes");
    expect(sectionOf(withNote, "scen1")).toBe("book");
    expect(sectionOf(withNote, "kap1")).toBe("book");
  });
});
