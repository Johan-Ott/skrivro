import {
  sceneStatus,
  noteLink,
  readField,
  sceneTitle,
  splitSceneFile,
  type SceneStatus,
} from "../manuscript/sceneFile.js";
import { countMarkdownWords } from "../manuscript/wordCount.js";
import { type FileSystem } from "@llkit/storage/fileSystem.js";
import { scenePath } from "../storage/sceneId.js";
import { t, uiLanguage } from "../i18n/i18n.js";

export interface SceneSummary {
  title: string;
  words: number;
  status: SceneStatus;
  /** Other names of a note, from `aliases: Smeknamn, Titel` in its front matter. */
  aliases?: string[];
  /** Without one the note follows its sort. */
  link?: boolean;
  /** A research file's name in the book's filer/ folder. */
  file?: string;
}

const namesIn = (list: string | null) =>
  (list ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");

function summarize(text: string, isNote: boolean): SceneSummary {
  const { frontMatter, body } = splitSceneFile(text);
  const title = sceneTitle(frontMatter) ?? t("Namnlös scen");
  const link = noteLink(frontMatter);
  const aliases = namesIn(readField(frontMatter, "aliases"));
  const file = readField(frontMatter, "file");
  return {
    title,
    words: countMarkdownWords(body, isNote),
    status: sceneStatus(frontMatter),
    ...(aliases.length === 0 ? {} : { aliases }),
    ...(link === null ? {} : { link }),
    ...(file === null ? {} : { file }),
  };
}

// Kept between starts, per device and language, by file with the text's length and a checksum:
// a scene is counted again only when it changed, so a book opened before opens at once.
type Kept = { sum: string; summary: SceneSummary };
const MOST_KEPT = 5000;
const storedKey = () => `skrivro.summaries.1.${uiLanguage()}`;
let kept: Map<string, Kept> | null = null;
let isChanged = false;

function keptSummaries() {
  if (kept) return kept;
  try {
    const stored = JSON.parse(localStorage.getItem(storedKey()) ?? "{}") as Record<string, Kept>;
    kept = new Map(Object.entries(stored));
  } catch {
    kept = new Map();
  }
  return kept;
}

function saveKept() {
  if (!kept || !isChanged) return;
  isChanged = false;
  const newest = [...kept].slice(-MOST_KEPT);
  try {
    localStorage.setItem(storedKey(), JSON.stringify(Object.fromEntries(newest)));
  } catch {
    // Without storage the next start counts the book again, as before.
  }
}

// FNV-1a over the text, with its length.
function checksum(text: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  }
  return `${text.length}:${(hash >>> 0).toString(36)}`;
}

function cachedSummary(path: string, text: string, isNote: boolean): SceneSummary {
  const all = keptSummaries();
  const sum = `${isNote ? "n" : "s"}${checksum(text)}`;
  const found = all.get(path);
  if (found?.sum === sum) return found.summary;
  const summary = summarize(text, isNote);
  all.delete(path);
  all.set(path, { sum, summary });
  isChanged = true;
  return summary;
}

/** What is known already: the summaries read last time, and which files changed since. */
export interface KnownSummaries {
  summaries: Record<string, SceneSummary>;
  changed: Set<string>;
}

// A save changes one scene; reading all of them again would be a file call per scene each time.
export async function readSceneSummaries(
  fileSystem: FileSystem,
  dir: string,
  sceneIds: string[],
  options: { known?: KnownSummaries | undefined; noteIds?: ReadonlySet<string> } = {},
) {
  const { known, noteIds } = options;
  const entries = await Promise.all(
    sceneIds.map(async (id) => {
      const path = scenePath(dir, id);
      const kept = known && !known.changed.has(path) ? known.summaries[id] : undefined;
      const text = kept ? "" : await fileSystem.readText(path);
      return [id, kept ?? cachedSummary(path, text, noteIds?.has(id) ?? false)] as const;
    }),
  );
  saveKept();
  return Object.fromEntries(entries);
}

/** Each scene's or note's text after its front matter, by id; a file that is gone is left out. */
export async function readSceneBodies(fileSystem: FileSystem, refs: { dir: string; id: string }[]) {
  const bodies: Record<string, string> = {};
  await Promise.all(
    refs.map(async ({ dir, id }) => {
      const file = await fileSystem.readText(scenePath(dir, id)).catch(() => null);
      if (file !== null) bodies[id] = splitSceneFile(file).body;
    }),
  );
  return bodies;
}
