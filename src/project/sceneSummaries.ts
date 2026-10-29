import {
  sceneStatus,
  noteLink,
  readField,
  sceneTitle,
  splitSceneFile,
  type SceneStatus,
} from "../manuscript/sceneFile.js";
import { countMarkdownWords } from "../manuscript/wordCount.js";
import { joinPath, readAll, type FileSystem } from "@llkit/storage/fileSystem.js";
import { scenePath } from "../storage/sceneId.js";
import { aliasesOf } from "./aliases.js";
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

const MOST_TITLE = 40;

// A note without a title is named by its first line.
const firstLine = (body: string) =>
  body
    .split("\n")
    .find((line) => line.trim() !== "")
    ?.trim()
    .slice(0, MOST_TITLE);

function summarize(text: string, isNote: boolean): SceneSummary {
  const { frontMatter, body } = splitSceneFile(text);
  const named = sceneTitle(frontMatter) ?? (isNote ? firstLine(body) : undefined);
  const title = named ?? (isNote ? t("Tom anteckning") : t("Namnlös scen"));
  const link = noteLink(frontMatter);
  const aliases = aliasesOf(frontMatter);
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

// Kept between starts, per device and language, by file with the text's length and a checksum,
// and the file's time: a scene whose time is the same is not even read again.
type Kept = { sum: string; summary: SceneSummary; time?: number };
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

const kind = (isNote: boolean) => (isNote ? "n" : "s");

function cachedSummary(path: string, text: string, isNote: boolean, time?: number) {
  const all = keptSummaries();
  const sum = `${kind(isNote)}${checksum(text)}`;
  const found = all.get(path);
  const summary = found?.sum === sum ? found.summary : summarize(text, isNote);
  if (found?.sum !== sum || found.time !== time) {
    all.delete(path);
    all.set(path, { sum, summary, ...(time === undefined ? {} : { time }) });
    isChanged = true;
  }
  return summary;
}

function unchangedSummary(path: string, isNote: boolean, time: number | undefined) {
  const found = time === undefined ? undefined : keptSummaries().get(path);
  return found?.time === time && found?.sum.startsWith(kind(isNote)) ? found.summary : undefined;
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
  const times = fileSystem.listTimes ? await fileSystem.listTimes(joinPath(dir, "scenes")) : {};
  const found = (id: string) => {
    const path = scenePath(dir, id);
    const kept = known && !known.changed.has(path) ? known.summaries[id] : undefined;
    return kept ?? unchangedSummary(path, noteIds?.has(id) ?? false, times[`${id}.md`]);
  };
  // What changed is read in one call, not one call per scene.
  const toRead = sceneIds.filter((id) => !found(id));
  const texts = await readAll(
    fileSystem,
    toRead.map((id) => scenePath(dir, id)),
  );
  const read = new Map(toRead.map((id, index) => [id, texts[index]]));
  const summaryOf = (id: string) => {
    const text = read.get(id);
    if (text === undefined) return found(id) as SceneSummary;
    if (text === null) throw new Error(`Scenen saknas: ${scenePath(dir, id)}`);
    return cachedSummary(scenePath(dir, id), text, noteIds?.has(id) ?? false, times[`${id}.md`]);
  };
  const entries = sceneIds.map((id) => [id, summaryOf(id)] as const);
  saveKept();
  return Object.fromEntries(entries);
}

/** Each scene's or note's text after its front matter, by id; a file that is gone is left out. */
export async function readSceneBodies(fileSystem: FileSystem, refs: { dir: string; id: string }[]) {
  const files = await readAll(
    fileSystem,
    refs.map(({ dir, id }) => scenePath(dir, id)),
  );
  const bodies: Record<string, string> = {};
  refs.forEach(({ id }, index) => {
    const file = files[index];
    if (typeof file === "string") bodies[id] = splitSceneFile(file).body;
  });
  return bodies;
}
