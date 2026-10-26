import { describe, expect, it } from "vitest";
import {
  parseTemplate,
  readOwnTemplates,
  saveOwnTemplate,
  templateFromBook,
} from "../src/project/ownTemplates";
import { composeTemplate, structures, suggestedStructure } from "../src/project/templates";
import { withSpecialFolders, type TreeNode } from "../src/project/tree";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";

const mystery = () => structures().find((structure) => structure.id === "deckare");

describe("structures and pieces", () => {
  it("add the pieces' notes, labels and closing chapter to the structure", () => {
    const structure = mystery();
    if (!structure) throw new Error("no mystery structure");

    const book = composeTemplate(structure, ["deckare", "romans", "magi", "urban", "serie"]);

    expect(book.sorts).toEqual(["Ledtrådar", "Relationen", "Världen", "Trådar", "Serien"]);
    expect(book.labels.map(([name]) => name)).toEqual(
      expect.arrayContaining(["Skriv om", "Ledtråd", "Gnista", "Magi"]),
    );
    expect(book.parts.at(-1)?.chapters).toEqual([
      ["Kroken", "Ett nytt hot eller en hemlighet som leder till nästa bok."],
    ]);
  });

  it("take their structure from the genre, whatever is blended in", () => {
    expect(suggestedStructure("roman", "deckare", ["skrack", "romans"])).toBe("deckare");
    expect(suggestedStructure("roman", "skrack", ["deckare"])).toBe("skrack");
    expect(suggestedStructure("roman", "romans", ["magi"])).toBe("romantasy");
    expect(suggestedStructure("roman", "magi", ["romans"])).toBe("romantasy");
    expect(suggestedStructure("roman", "deckare", ["romans", "magi"])).toBe("deckare");
    expect(suggestedStructure("roman", "romans", ["feelgood"])).toBe("romans");
    expect(suggestedStructure("roman", "scifi", [])).toBe("scifi");
    expect(suggestedStructure("roman", "urban", [])).toBe("tre-akter");
    expect(suggestedStructure("roman", "", [])).toBe("tre-akter");
    expect(suggestedStructure("noveller", "deckare", [])).toBe("novell");
    expect(suggestedStructure("fackbok", "", ["memoar"])).toBe("memoar");
    expect(suggestedStructure("annat", "", [])).toBe("tom");
  });

  it("keep Skrivro's standard labels to themselves when no piece is added", () => {
    const structure = mystery();
    if (!structure) throw new Error("no mystery structure");

    expect(composeTemplate(structure, []).labels).toEqual([]);
  });
});

describe("own templates", () => {
  const tree: TreeNode[] = withSpecialFolders([
    {
      id: "del",
      kind: "part",
      title: "Brottet",
      children: [
        { id: "k1", kind: "chapter", title: "Kroppen", summary: "Den hittas.", children: [] },
      ],
    },
    { id: "k2", kind: "chapter", title: "Efteråt", children: [] },
    { id: "sort", kind: "sort", title: "Misstänkta", children: [] },
  ]);

  it("take a book's shape, and are kept and read back from the Skrivro folder", async () => {
    const files = createMemoryFileSystem({});
    const template = templateFromBook("Min deckare", { tree, fields: { totalGoal: 70_000 } });

    await saveOwnTemplate(files, "/Skrivro", template);
    const [read] = await readOwnTemplates(files, "/Skrivro");

    expect(read).toMatchObject({
      id: "egen:Min deckare.json",
      name: "Min deckare",
      totalGoal: 70_000,
      sorts: ["Misstänkta"],
      parts: [
        { title: "Brottet", chapters: [["Kroppen", "Den hittas."]] },
        { title: "", chapters: [["Efteråt", ""]] },
      ],
    });
  });

  it("are not read from a file that is not a template", () => {
    expect(parseTemplate('{"name": 3}', "egen:x")).toBeNull();
    expect(parseTemplate("inte json", "egen:x")).toBeNull();
  });
});
