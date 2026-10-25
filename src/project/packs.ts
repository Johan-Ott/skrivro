import type { FileSystem } from "@llkit/storage/fileSystem.js";
import { isSwedish } from "../i18n/i18n.js";
import { newSceneId } from "../storage/sceneId.js";
import type { BookTemplate, TemplatePiece } from "./templates.js";
import type { TreeNode } from "./tree.js";
import { asManuscript, blocksOf, writeNote } from "./welcome.js";

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
  /** The genre cover its card wears, as a book on the shelf does: "deckare" for cover-deckare. */
  look: string;
  name: string;
  hint: string;
  /** Packs this one holds the best of, left out of a book that has it: romance and fantasy for
   * romantasy. */
  covers: string[];
  structures: BookTemplate[];
  pieces: TemplatePiece[];
  notes: PackNote[];
}

type Words = { sv: string; en: string };
type Manifest = {
  id: string;
  version: string;
  look: string;
  name: Words;
  hint: Words;
  covers?: string[];
};

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
export function noteOf(text: string): PackNote {
  const normal = text.replace(/\r\n/g, "\n");
  const [, sort = "", rest = ""] = /^---\nsort: (.*)\n---\n([\s\S]*)$/.exec(normal) ?? [];
  const [heading = "", ...body] = rest.trimStart().split("\n");
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
    look: manifest.look,
    name: manifest.name[language],
    hint: manifest.hint[language],
    covers: manifest.covers ?? [],
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
  const covered = new Set(found.flatMap((pack) => pack.covers));
  return [...new Map(found.map((pack) => [pack.id, pack])).values()].filter(
    (pack) => isPackOwned(pack.id) && !covered.has(pack.id),
  );
}

/** The packs a new book starts with, kept in project.json so they are never added twice. */
export function packsField(templateIds: string[]) {
  const ids = packsFor(templateIds).map((pack) => pack.id);
  return ids.length ? { packs: ids } : {};
}

const listIn = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** Whether a book has the pack: as noted in it, or, in a book from before packs were noted, by
 * all the labels of one of its pieces. */
export function isPackInBook(fields: Record<string, unknown>, pack: Pack) {
  if (Array.isArray(fields["packs"])) return fields["packs"].includes(pack.id);
  const labels = new Set(
    listIn(fields["labels"]).map((label) => (label as { name?: string }).name),
  );
  return pack.pieces.some(
    (piece) => piece.labels.length > 0 && piece.labels.every(([name]) => labels.has(name)),
  );
}

export const withPackNoted = (fields: Record<string, unknown>, packId: string) => ({
  ...fields,
  packs: [...new Set([...listIn(fields["packs"]), packId])],
});

/** Writes the packs' guides into a Guide sort; their templates wait in Ny anteckning. */
export async function packGuides(fileSystem: FileSystem, dir: string, from: Pack[]) {
  const children: TreeNode[] = [];
  for (const note of from.flatMap(guidesOf)) {
    const id = await writeNote(fileSystem, dir, note.title, asManuscript(note.body));
    children.push({ id, kind: "scene" });
  }
  const sort: TreeNode = { id: newSceneId(), kind: "sort", title: GUIDE, children };
  return children.length ? [sort] : [];
}

/** Sorts of the same name made one, as a piece's Ledtrådar and a pack's notes for it. Personer
 * and the other fixed sorts keep no name in the book, so they are known by their id. */
export function joinSorts(sorts: TreeNode[]): TreeNode[] {
  const joined = new Map<string, TreeNode>();
  for (const sort of sorts) {
    const key = sort.title ? `name:${sort.title}` : `id:${sort.id}`;
    const same = joined.get(key);
    if (same) same.children = [...(same.children ?? []), ...(sort.children ?? [])];
    else joined.set(key, { ...sort, children: [...(sort.children ?? [])] });
  }
  return [...joined.values()];
}

const GUIDE = "Guide";

/** A pack's notes as guides, and as templates for characters and the world. */
export const guidesOf = (pack: Pack) => pack.notes.filter((note) => note.sort === GUIDE);
export const templatesOf = (pack: Pack) => pack.notes.filter((note) => note.sort !== GUIDE);

export interface NoteTemplate {
  name: string;
  body: string;
}

// "Utredaren (mall)" is offered as Utredaren, without the line on renaming it.
const asTemplate = (note: PackNote): NoteTemplate => ({
  name: note.title.replace(/\s*\((mall|template)\)$/i, ""),
  body: asManuscript(
    blocksOf(note.body)
      .filter((block) => !/^(Byt namn på anteckningen|Rename the note)/.test(block))
      .join("\n\n"),
  ),
});

/** The templates the book's packs give a new note in a sort: Personer by its id, others by name. */
export const noteTemplates = (fields: Record<string, unknown>, sort: string) =>
  packs()
    .filter((pack) => isPackInBook(fields, pack))
    .flatMap(templatesOf)
    .filter((note) => note.sort === sort)
    .map(asTemplate);
