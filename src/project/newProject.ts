import { DEMO_PROJECT_DIR, DEMO_PROJECT_FILES } from "../demo/demoProject.js";
import type { ImportedNode } from "../import/markdownImport.js";
import { newSceneText, withSceneStatus } from "../manuscript/sceneFile.js";
import { createFileNote, saveResearchFile } from "./researchFiles.js";
import { joinPath, readIfThere, type FileSystem } from "@llkit/storage/fileSystem.js";
import { newSceneId, scenePath } from "../storage/sceneId.js";
import { BOOK_SUFFIX, parentOf, withoutBookSuffix } from "./libraryFolders.js";
import { writeProjectFile } from "./projectFile.js";
import type { Narration } from "../manuscript/narration.js";
import { manuscriptSceneIds, NOTES_ID, withSpecialFolders, type TreeNode } from "./tree.js";
import { CHARACTERS_ID } from "./sorts.js";
import { joinSorts, packNotesTree, packsField, packsFor } from "./packs.js";
import { readOwnTemplates, OWN_PREFIX } from "./ownTemplates.js";
import { composeTemplate, structures, templateBook, type BookTemplate } from "./templates.js";
import { t } from "../i18n/i18n.js";
import { writeStepsNote, writeWelcome } from "./welcome.js";

export interface ProjectDetails {
  title: string;
  type: string;
  /** The structure it starts from, built in or the writer's own; see templates.ts. */
  structure: string;
  /** The genre that decided the structure, or "" for none. */
  genre?: string;
  /** The pieces blended in, such as Romans in a Deckare. */
  pieces: string[];
  /** False for a writer who writes their way forward: one chapter, the steps kept as a note. */
  isPlanned?: boolean;
  /** Words for the whole book, when the writer changed the structure's own. */
  totalGoal?: number | null;
  dailyGoal: number;
  /** YYYY-MM-DD, or "" when the writer has no deadline. */
  deadline: string;
  /** How the book is told, which Granska then watches for; null until chosen. */
  narration: Narration | null;
  /** Such as "en-GB"; a book without one is Swedish. */
  language?: string;
}

// Characters Windows, macOS or a cloud service refuses in a folder name.
const UNSAFE_IN_NAMES = /[\\/:*?"<>|]/g;

export function projectFolderName(title: string): string {
  const name = title.replace(UNSAFE_IN_NAMES, "").replace(/\s+/g, " ").trim();
  return `${name || t("Namnlöst projekt")}${BOOK_SUFFIX}`;
}

/** "Isen.skrivro", "Isen 2.skrivro", and so on. */
const MAKING = ".skapas";

export async function freeProjectDir(fileSystem: FileSystem, libraryDir: string, title: string) {
  const taken = new Set(await fileSystem.list(libraryDir));
  const base = withoutBookSuffix(projectFolderName(title));
  let candidate = `${base}${BOOK_SUFFIX}`;
  const isTaken = (name: string) => taken.has(name) || taken.has(`${name}${MAKING}`);
  for (let number = 2; isTaken(candidate); number++) candidate = `${base} ${number}${BOOK_SUFFIX}`;
  return joinPath(libraryDir, candidate);
}

// The book being written: its folder, and the scene files on their way to it.
interface Making {
  fileSystem: FileSystem;
  dir: string;
  writes: Promise<void>[];
}

// A research file becomes a note of its own, saved in turn since it takes a free name; a text is
// a scene file, written alongside the others, as a phone is slow at one file after another.
async function writeScene(
  { fileSystem, dir, writes }: Making,
  node: Extract<ImportedNode, { kind: "scene" }>,
  id: string,
) {
  if (node.file) {
    const name = await saveResearchFile(fileSystem, dir, node.file.name, node.file.bytes);
    return createFileNote(fileSystem, dir, name);
  }
  const text = newSceneText(id, node.title);
  const file = node.body ? withSceneStatus(text, "utkast") + node.body : text;
  writes.push(fileSystem.writeText(scenePath(dir, id), file));
  return id;
}

async function writeNodes(making: Making, book: ImportedNode[]) {
  const tree: TreeNode[] = [];
  for (const node of book) {
    const id = (node.kind === "sort" ? node.id : undefined) ?? newSceneId();
    const summary = node.kind !== "sort" && node.summary ? { summary: node.summary } : {};
    if (node.kind !== "scene") {
      const children = await writeNodes(making, node.children);
      tree.push({ id, kind: node.kind, title: node.title, ...summary, children });
      continue;
    }
    tree.push({ id: await writeScene(making, node, id), kind: "scene", ...summary });
  }
  return tree;
}

async function writeBook(fileSystem: FileSystem, dir: string, book: ImportedNode[]) {
  const making = { fileSystem, dir, writes: [] };
  const tree = await writeNodes(making, book);
  await Promise.all(making.writes);
  return tree;
}

// The writer's own templates are read from the Skrivro folder; the built-in ones from Skrivro.
async function templateFor(fileSystem: FileSystem, libraryDir: string, details: ProjectDetails) {
  const own = details.structure.startsWith(OWN_PREFIX)
    ? await readOwnTemplates(fileSystem, libraryDir)
    : [];
  const all = [...structures(), ...own];
  const structure = all.find((each) => each.id === details.structure) ?? (all[0] as BookTemplate);
  const pieces = [details.genre ?? "", ...details.pieces].filter(Boolean);
  return composeTemplate(structure, pieces);
}

// The template's goal, labels and note sorts; Skrivro's standard labels when it adds none.
function templateParts(template: BookTemplate) {
  const labels = template.labels.map(([name = "", color = ""]) => ({
    id: newSceneId(),
    name,
    color,
  }));
  const sorts: TreeNode[] = template.sorts.map((title) => ({
    id: newSceneId(),
    kind: "sort",
    title,
    children: [],
  }));
  const fields = {
    ...(template.totalGoal ? { totalGoal: template.totalGoal } : {}),
    ...(labels.length ? { labels } : {}),
  };
  return { fields, sorts };
}

const bookFields = (details: ProjectDetails) => ({
  title: details.title.trim() || t("Namnlöst projekt"),
  type: details.type,
  ...(details.genre ? { genre: details.genre } : {}),
  dailyGoal: details.dailyGoal,
  ...(details.deadline ? { deadline: details.deadline } : {}),
  ...(details.narration ? { narration: details.narration } : {}),
  ...(details.language && details.language !== "sv-SE" ? { language: details.language } : {}),
  ...packsField([details.structure, details.genre ?? "", ...details.pieces]),
});

// A writer who finds the story while writing starts on one chapter, whatever the structure.
const firstChapterOf = (template: BookTemplate): BookTemplate =>
  template.parts.length
    ? { ...template, parts: [{ title: "", chapters: [[t("Kapitel 1")]] }] }
    : template;

// The welcome, and the structure's steps for one who writes without them, lead the notes.
// Notes first in a sort: the welcome in Övrigt, a pack's character templates in Personer.
const withNotesFirst = (tree: TreeNode[], sortId: string, notes: TreeNode[]) =>
  tree.map((node) =>
    node.id === sortId ? { ...node, children: [...notes, ...(node.children ?? [])] } : node,
  );

const asNotes = (ids: string[]): TreeNode[] => ids.map((id) => ({ id, kind: "scene" }));

// The notes a new book starts with: the welcome, the structure's steps when the chapters are
// not made, and the notes of the packs its structure, genre and pieces come from.
async function startingNotes(
  making: { fileSystem: FileSystem; dir: string },
  steps: BookTemplate | null,
  chosen: string[],
) {
  const { fileSystem, dir } = making;
  const welcome = await writeWelcome(fileSystem, dir);
  const stepsNote = steps ? [await writeStepsNote(fileSystem, dir, steps)] : [];
  const pack = await packNotesTree(fileSystem, dir, packsFor(chosen));
  const place = (tree: TreeNode[]) =>
    withNotesFirst(
      withNotesFirst(tree, NOTES_ID, asNotes([welcome, ...stepsNote])),
      CHARACTERS_ID,
      pack.characters,
    );
  return { welcome, sorts: pack.own, place };
}

/** An imported book, or the template's, with the welcome note under Övrigt. */
export async function createProject(
  fileSystem: FileSystem,
  libraryDir: string,
  details: ProjectDetails,
  imported?: ImportedNode[],
) {
  const template = await templateFor(fileSystem, libraryDir, details);
  const finalDir = await freeProjectDir(fileSystem, libraryDir, details.title);
  // Made under another name and given its own when whole: a book left halfway, as when the app
  // is closed, never stands on the shelf or goes to Drive.
  const dir = `${finalDir}${MAKING}`;
  await fileSystem.makeDir(joinPath(dir, "scenes"));
  const isPlanned = details.isPlanned !== false || imported !== undefined;
  const book =
    imported ?? templateBook(isPlanned ? template : firstChapterOf(template), t("Scen 1"));
  const tree = await writeBook(fileSystem, dir, book);
  const fromTemplate = templateParts(template);
  const chosen = [details.structure, details.genre ?? "", ...details.pieces];
  const notes = await startingNotes({ fileSystem, dir }, isPlanned ? null : template, chosen);
  const all = withSpecialFolders([...tree, ...joinSorts([...fromTemplate.sorts, ...notes.sorts])]);
  const goal = details.totalGoal ? { totalGoal: details.totalGoal } : {};
  const fields = {
    ...bookFields(details),
    ...fromTemplate.fields,
    ...goal,
    welcome: notes.welcome,
  };
  await writeProjectFile(fileSystem, dir, fields, notes.place(all));
  await fileSystem.rename(dir, finalDir);
  return { dir: finalDir, sceneId: manuscriptSceneIds(tree)[0] ?? notes.welcome };
}

// The example is copied once: asked for again, the copy already on the shelf opens. Its files go
// into a new folder, so they are written all at once rather than one by one, which a phone is slow at.
export async function copyExampleProject(fileSystem: FileSystem, libraryDir: string) {
  const existing = joinPath(libraryDir, `Vintervägen${BOOK_SUFFIX}`);
  if ((await readIfThere(fileSystem, joinPath(existing, "project.json"))) !== null) return existing;
  const dir = await freeProjectDir(fileSystem, libraryDir, "Vintervägen");
  const files = Object.entries(DEMO_PROJECT_FILES).map(
    ([examplePath, text]) => [dir + examplePath.slice(DEMO_PROJECT_DIR.length), text] as const,
  );
  for (const folder of new Set(files.map(([path]) => parentOf(path))))
    await fileSystem.makeDir(folder);
  await Promise.all(files.map(([path, text]) => fileSystem.writeText(path, text)));
  return dir;
}
