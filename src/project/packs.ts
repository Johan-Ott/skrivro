import type { FileSystem } from "@llkit/storage/fileSystem.js";
import { isSwedish } from "../i18n/i18n.js";
import { newSceneId } from "../storage/sceneId.js";
import english from "./packs.en.json";
import swedish from "./packs.sv.json";
import { CHARACTERS_ID } from "./sorts.js";
import type { TreeNode } from "./tree.js";
import { writeNote } from "./welcome.js";

// The basics for any book are free; a genre comes as a pack, bought once: its structures and
// pieces, and notes the new book starts with, as guides and templates for characters and world.

export interface PackNote {
  /** Personer by its id, or a sort of the pack's own by its name. */
  sort: string;
  title: string;
  body: string;
}

export interface Pack {
  id: string;
  name: string;
  hint: string;
  notes: PackNote[];
}

// The structures and pieces in each pack, by their ids in templates.sv.json.
const MEMBERS: Record<string, string[]> = {
  romantasy: ["romantasy"],
  fantasy: ["magi", "urban"],
  deckare: ["deckare"],
  thriller: ["thriller"],
  romance: ["romans", "feelgood"],
  skrack: ["skrack"],
  scifi: ["scifi"],
  historisk: ["historisk"],
  ungdom: ["ungdom", "barnbok"],
  memoar: ["memoar", "fackbok"],
};

export const packs = (): Pack[] => (isSwedish() ? swedish : english).packs;

/** The pack a structure or piece comes in, or null for the free basics. */
export const packOf = (templateId: string) =>
  packs().find((pack) => MEMBERS[pack.id]?.includes(templateId)) ?? null;

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
