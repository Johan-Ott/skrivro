import { describe, expect, it } from "vitest";
import { libraryCandidates } from "../src/project/libraryFolders";
import { createProject, copyExampleProject, projectFolderName } from "../src/project/newProject";
import { splitManuscript } from "../src/import/markdownImport";
import { readProjectFile } from "../src/project/projectFile";
import { manuscriptSceneIds } from "../src/project/tree";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import { openProjectFolder } from "../src/storage/projectFolder";

describe("projectFolderName", () => {
  it("turns a title into a folder name that works on every system", () => {
    expect(projectFolderName("Vintervägen")).toBe("Vintervägen.skrivro");
    expect(projectFolderName('Del 1: "Isen"?')).toBe("Del 1 Isen.skrivro");
    expect(projectFolderName("   ")).toBe("Namnlöst projekt.skrivro");
  });
});

describe("createProject", () => {
  const details = {
    title: "Vintervägen",
    type: "roman",
    structure: "tom",
    pieces: [],
    dailyGoal: 1000,
    deadline: "",
    narration: null,
  };

  it("is made under another name and stands on the shelf only when whole", async () => {
    const files = createMemoryFileSystem({
      "/Skrivro/Vintervägen.skrivro.skapas/scenes/OLD.md": "",
    });

    const created = await createProject(files, "/Skrivro", { ...details, structure: "tre-akter" });

    expect(created.dir).toBe("/Skrivro/Vintervägen 2.skrivro");
    expect(await files.list("/Skrivro")).not.toContain("Vintervägen 2.skrivro.skapas");
    const project = await readProjectFile(files, created.dir, []);
    const sceneIds = manuscriptSceneIds(project.tree);
    expect(sceneIds.length).toBeGreaterThan(1);
    expect((await openProjectFolder(files, created.dir)).scenes).toEqual(
      expect.arrayContaining(sceneIds),
    );
  });

  it("keeps how the book is told, for Granska to watch", async () => {
    const files = createMemoryFileSystem({});
    const narration = { voice: "tredje", tense: "dåtid", deep: true } as const;

    const created = await createProject(files, "/Skrivro", { ...details, narration });

    expect((await readProjectFile(files, created.dir, [])).fields["narration"]).toEqual(narration);
  });

  it("makes an empty book with only a welcome note, which it opens on", async () => {
    const files = createMemoryFileSystem({});

    const created = await createProject(files, "/Skrivro", details);

    const project = await readProjectFile(files, created.dir, []);
    expect(created.dir).toBe("/Skrivro/Vintervägen.skrivro");
    expect(project.fields).toMatchObject({ title: "Vintervägen", type: "roman", dailyGoal: 1000 });
    expect(manuscriptSceneIds(project.tree)).toEqual([]);
    expect(project.fields["welcome"]).toBe(created.sceneId);
    const notes = project.tree.find((node) => node.id === "anteckningar");
    expect(notes?.children?.map((node) => node.id)).toEqual([created.sceneId]);
    expect((await openProjectFolder(files, created.dir)).scenes).toEqual([created.sceneId]);
  });

  it("writes imported notes into their sorts, and a synopsis as the scene's Vad händer?", async () => {
    const files = createMemoryFileSystem({});
    const imported = [
      {
        kind: "chapter" as const,
        title: "Brevet",
        children: [
          {
            kind: "scene" as const,
            title: "Köket",
            body: "Brevet.\n",
            summary: "Elin hittar brevet.",
          },
        ],
      },
      {
        kind: "sort" as const,
        title: "Characters",
        id: "karaktarer",
        children: [{ kind: "scene" as const, title: "Elin", body: "Dottern.\n" }],
      },
    ];

    const created = await createProject(files, "/Skrivro", details, imported);

    const { tree } = await readProjectFile(files, created.dir, []);
    const people = tree.find((node) => node.id === "karaktarer");
    expect(people?.children).toHaveLength(1);
    expect(tree.find((node) => node.kind === "chapter")?.children?.[0]?.summary).toBe(
      "Elin hittar brevet.",
    );
    expect(tree.filter((node) => node.id === "karaktarer")).toHaveLength(1);
  });

  it("writes an imported picture or PDF into filer/, as a note pointing to it", async () => {
    const files = createMemoryFileSystem({});
    const file = { name: "Karta.jpg", bytes: new TextEncoder().encode("bild") };
    const research = { kind: "scene" as const, title: "Karta", body: "", file };
    const imported = [{ kind: "sort" as const, title: "Research", children: [research] }];

    const created = await createProject(files, "/Skrivro", details, imported);

    expect(await files.readText(`${created.dir}/filer/Karta.jpg`)).toBe("bild");
    const { tree } = await readProjectFile(files, created.dir, []);
    const [note] = tree.find((node) => node.title === "Research")?.children ?? [];
    expect(await files.readText(`${created.dir}/scenes/${note?.id ?? ""}.md`)).toContain(
      'file: "Karta.jpg"',
    );
  });

  it("starts from a template: its parts and steps, notes, labels and goal", async () => {
    const files = createMemoryFileSystem({});

    const created = await createProject(files, "/Skrivro", {
      ...details,
      structure: "deckare",
      pieces: ["deckare", "serie"],
    });

    const project = await readProjectFile(files, created.dir, []);
    const [part] = project.tree;
    expect(part).toMatchObject({ kind: "part", title: "Brottet" });
    expect(part?.children?.[0]).toMatchObject({
      kind: "chapter",
      title: "Brottet",
      summary:
        "Brottet upptäcks här, eller senast efter en tiondel av boken, så att frågan vem och varför är ställd direkt.",
    });
    expect(manuscriptSceneIds(project.tree)).toHaveLength(16);
    const sorts = project.tree.filter((node) => node.kind === "sort").map((node) => node.title);
    expect(sorts.slice(-3)).toEqual(["Ledtrådar", "Trådar", "Guide"]);
    expect(project.fields).toMatchObject({ totalGoal: 85_000 });
    expect((project.fields["labels"] as { name: string }[]).map((label) => label.name)).toContain(
      "Falskt spår",
    );
  });

  it("gives one who writes their way forward one chapter, the steps as a note, and their goal", async () => {
    const files = createMemoryFileSystem({});

    const created = await createProject(files, "/Skrivro", {
      ...details,
      structure: "deckare",
      genre: "deckare",
      pieces: ["skrack"],
      isPlanned: false,
      totalGoal: 95_000,
    });

    const project = await readProjectFile(files, created.dir, []);
    expect(manuscriptSceneIds(project.tree)).toHaveLength(1);
    const sorts = project.tree.filter((node) => node.kind === "sort").map((node) => node.title);
    expect(sorts.slice(-3)).toEqual(["Ledtrådar", "Det som skrämmer", "Guide"]);
    expect(project.fields).toMatchObject({ totalGoal: 95_000 });
    const notes = project.tree.find((node) => node.id === "anteckningar")?.children ?? [];
    const steps = await files.readText(`${created.dir}/scenes/${notes[1]?.id ?? ""}.md`);
    expect(steps).toContain("::: punktlista\nBrottet: ");
    expect(steps).toContain("\n\nDet falska spåret: En sann detalj pekar fel");
  });

  it("never writes into an existing project with the same name", async () => {
    const files = createMemoryFileSystem({ "/Skrivro/Vintervägen.skrivro/project.json": "{}" });

    const created = await createProject(files, "/Skrivro", details);

    expect(created.dir).toBe("/Skrivro/Vintervägen 2.skrivro");
    expect(await files.readText("/Skrivro/Vintervägen.skrivro/project.json")).toBe("{}");
  });

  it("writes an imported book as scene files under its parts and chapters", async () => {
    const files = createMemoryFileSystem({});
    const book = splitManuscript("# Brevet\n\nBrevet låg där.\n\n***\n\nIsen bar.\n");

    const created = await createProject(files, "/Skrivro", details, book);

    const project = await readProjectFile(files, created.dir, []);
    const sceneIds = manuscriptSceneIds(project.tree);
    expect(project.tree[0]).toMatchObject({ kind: "chapter", title: "Brevet" });
    expect(sceneIds).toHaveLength(2);
    expect(created.sceneId).toBe(sceneIds[0]);
    const second = await files.readText(`${created.dir}/scenes/${sceneIds[1]}.md`);
    expect(second).toContain("title: Isen bar\nstatus: utkast\n---\nIsen bar.\n");
  });

  it("copies the example project into the library", async () => {
    const files = createMemoryFileSystem({});

    const dir = await copyExampleProject(files, "/Skrivro");

    expect(dir).toBe("/Skrivro/Vintervägen.skrivro");
    expect((await openProjectFolder(files, dir)).scenes.length).toBeGreaterThan(0);
  });
});

describe("libraryCandidates", () => {
  it("offers the cloud folders a Windows computer may have, and Documents for this computer only", () => {
    const candidates = libraryCandidates({
      home: "C:/Users/Elin",
      documents: "C:/Users/Elin/Documents",
    });

    expect(candidates.map((candidate) => [candidate.label, candidate.path])).toEqual([
      ["iCloud Drive", "C:/Users/Elin/iCloudDrive/Skrivro"],
      ["iCloud Drive", "C:/Users/Elin/Library/Mobile Documents/com~apple~CloudDocs/Skrivro"],
      ["Dropbox", "C:/Users/Elin/Dropbox/Skrivro"],
      ["OneDrive", "C:/Users/Elin/OneDrive/Skrivro"],
      ["Bara den här enheten", "C:/Users/Elin/Documents/Skrivro"],
    ]);
  });
});
