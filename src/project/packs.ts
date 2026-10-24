import type { FileSystem } from "@llkit/storage/fileSystem.js";
import { isSwedish } from "../i18n/i18n.js";
import { newSceneId } from "../storage/sceneId.js";
import { CHARACTERS_ID } from "./sorts.js";
import type { BookTemplate, TemplatePiece } from "./templates.js";
import type { TreeNode } from "./tree.js";
import { writeNote } from "./welcome.js";

// The basics are free; a genre is a pack, bought once, in a folder of its own in src/packs:
// pack.json, its structures and pieces as JSON, and its guides and templates as Markdown.

export interface PackNote {
  /** Personer by its id, or a sort of the pack's own by its name. */
  sort: string;
  title: string;
  body: string;
}

export interface Pack {
  id: string;
  version: string;
  name: string;
  hint: string;
  structures: BookTemplate[];
  pieces: TemplatePiece[];
  notes: PackNote[];
}

type Words = { sv: string; en: string };
type Manifest = { id: string; version: string; name: Words; hint: Words };

const MANIFESTS = import.meta.glob<Manifest>("../packs/*/pack.json", {
  eager: true,
  import: "default",
});
const LISTS = import.meta.glob<unknown[]>("../packs/*/*.*.json", {
  eager: true,
  import: "default",
});
const NOTES = import.meta.glob<string>("../packs/*/notes/*/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

// "---\nsort: Guide\n---\n# Title\n\nThe text."
function noteOf(text: string): PackNote {
  const [, sort = "", rest = ""] =
    /^---\nsort: (.*)\n---\n([\s\S]*)$/.exec(text.replace(/\r\n/g, "\n")) ?? [];
  const [heading = "", ...body] = rest.split("\n");
  return { sort: sort.trim(), title: heading.replace(/^#\s*/, ""), body: body.join("\n").trim() };
}

function packAt(path: string, manifest: Manifest, language: "sv" | "en"): Pack {
  const folder = path.slice(0, path.lastIndexOf("/"));
  const list = <T>(kind: string) => (LISTS[`${folder}/${kind}.${language}.json`] ?? []) as T[];
  const notes = Object.entries(NOTES)
    .filter(([note]) => note.startsWith(`${folder}/notes/${language}/`))
    .sort(([one], [other]) => one.localeCompare(other))
    .map(([, text]) => noteOf(text));
  return {
    id: manifest.id,
    version: manifest.version,
    name: manifest.name[language],
    hint: manifest.hint[language],
    structures: list<BookTemplate>("structures"),
    pieces: list<TemplatePiece>("pieces"),
    notes,
  };
}

const loaded = new Map<string, Pack[]>();

/** Every pack, in the interface's language: Swedish, or else English. */
export function packs(): Pack[] {
  const language = isSwedish() ? "sv" : "en";
  const known = loaded.get(language);
  if (known) return known;
  const all = Object.entries(MANIFESTS).map(([path, manifest]) => packAt(path, manifest, language));
  loaded.set(language, all);
  return all;
}

/** The pack a structure or piece comes in, or null for the free basics. */
export const packOf = (templateId: string) =>
  packs().find((pack) =>
    [...pack.structures, ...pack.pieces].some((template) => template.id === templateId),
  ) ?? null;

// Every pack is the writer's during the beta; from 1.0 the store fills in what was bought.
const IS_BETA = true;
const bought = new Set<string>();

export const isPackOwned = (packId: string) => IS_BETA || bought.has(packId);

/** The owned packs a new book's structure, genre and pieces come from, each once. */
export function packsFor(templateIds: string[]) {
  const found = templateIds.map(packOf).filter((pack): pack is Pack => pack !== null);
  return [...new Map(found.map((pack) => [pack.id, pack])).values()].filter((pack) =>
    isPackOwned(pack.id),
  );
}

/** Writes the packs' notes, and puts each in Personer or in a sort of its own. */
export async function packNotesTree(fileSystem: FileSystem, dir: string, from: Pack[]) {
  const sorts = new Map<string, TreeNode[]>();
  for (const note of from.flatMap((pack) => pack.notes)) {
    const id = await writeNote(fileSystem, dir, note.title, note.body);
    sorts.set(note.sort, [...(sorts.get(note.sort) ?? []), { id, kind: "scene" }]);
  }
  const characters = sorts.get(CHARACTERS_ID) ?? [];
  sorts.delete(CHARACTERS_ID);
  const own: TreeNode[] = [...sorts].map(([title, children]) => ({
    id: newSceneId(),
    kind: "sort",
    title,
    children,
  }));
  return { own, characters };
}
