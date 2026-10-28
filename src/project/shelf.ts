import { DAY } from "./stats.js";
import { projectGoals } from "./progress.js";
import { ownStepName } from "./statusSteps.js";
import { SCENE_STATUSES, type SceneStatus } from "../manuscript/sceneFile.js";
import { joinPath, timesIn, type FileSystem } from "@llkit/storage/fileSystem.js";
import { openProjectFolder } from "../storage/projectFolder.js";
import { readSceneSummaries, type SceneSummary } from "./sceneSummaries.js";
import { seriesTitle } from "./series.js";
import { isBookFolder, withoutBookSuffix } from "./libraryFolders.js";
import { manuscriptSceneIds, type TreeNode } from "./tree.js";
import { t } from "../i18n/i18n.js";

export interface ShelfBook {
  dir: string;
  title: string;
  kind: string;
  words: number;
  status: string;
  /** Toward the goal while drafting; afterwards the share of the words in finished scenes. */
  progress: number;
  /** The length the book is aimed at, in words, or null. */
  goal: number | null;
  /** YYYY-MM-DD, or null. */
  deadline: string | null;
  /** The genre it was made in, such as "deckare", which gives its cover; null when none. */
  genre?: string | null;
  /** The cover's colours chosen on the shelf, such as "skog"; null follows the genre. */
  coverLook?: string | null;
  updatedAt: number | null;
  /** The folder is gone: moved, renamed or on a disk that is not connected. */
  isMissing: boolean;
  /** The series the book belongs to, by name, or null. */
  series: string | null;
  /** The book's place in its series, or null when it has none. */
  seriesNumber: number | null;
  /** The step that holds the most words, which the cover on the shelf shows; null when missing. */
  stage: SceneStatus | null;
}

const STATUS_LABELS: Record<SceneStatus, string> = {
  idé: t("Idé"),
  utkast: t("Första utkast"),
  redigering: t("Redigering"),
  klar: t("Klar"),
};
export const KIND_LABELS: Record<string, string> = {
  roman: t("Roman"),
  noveller: t("Noveller"),
  fackbok: t("Fackbok"),
  annat: t("Annat"),
};

/** The step that holds the most words; on a tie the earlier one. */
export function bookStage(scenes: Pick<SceneSummary, "words" | "status">[]): SceneStatus {
  const wordsIn = (status: SceneStatus) =>
    scenes.filter((scene) => scene.status === status).reduce((sum, scene) => sum + scene.words, 0);
  return SCENE_STATUSES.reduce((best, status) => (wordsIn(status) > wordsIn(best) ? status : best));
}

/** The stage by the book's own name for it, when the writer has named the steps. */
export function bookStatus(
  scenes: Pick<SceneSummary, "words" | "status">[],
  fields: Record<string, unknown> = {},
): string {
  const stage = bookStage(scenes);
  return ownStepName(fields, stage) ?? STATUS_LABELS[stage];
}

export function bookProgress(scenes: Pick<SceneSummary, "words" | "status">[]): number {
  const total = scenes.reduce((sum, scene) => sum + scene.words, 0);
  const finished = scenes
    .filter((scene) => scene.status === "klar")
    .reduce((sum, scene) => sum + scene.words, 0);
  return total === 0 ? 0 : Math.round((100 * finished) / total);
}

export const isDraftStage = (stage: SceneStatus | null) => stage === "idé" || stage === "utkast";

/** While the book is being written, its words count toward its goal; afterwards, it is revised. */
const startOfDay = (time: number) => new Date(time).setHours(0, 0, 0, 0);

export function whenUpdated(time: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(time)) / DAY);
  if (days <= 0) return t("Skrivet idag");
  if (days === 1) return t("Igår");
  if (days < 7) return t("För {days} dagar sedan", { days });
  if (days < 30) return t("För {weeks} veckor sedan", { weeks: Math.floor(days / 7) });
  return new Date(time).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const folderTitle = (dir: string) => withoutBookSuffix(dir.split("/").pop() ?? dir);

const NO_FIELDS = {
  title: undefined,
  type: undefined,
  tree: [] as TreeNode[],
  series: null,
  seriesNumber: null,
  totalGoal: null,
  deadline: null,
  genre: null,
  coverLook: null,
};

// A broken project.json is repaired when the project opens, not here.
async function readProjectFields(fileSystem: FileSystem, dir: string) {
  try {
    const parsed = JSON.parse(await fileSystem.readText(joinPath(dir, "project.json"))) as Record<
      string,
      unknown
    >;
    const tree = Array.isArray(parsed["tree"]) ? (parsed["tree"] as TreeNode[]) : [];
    const series = typeof parsed["series"] === "string" ? seriesTitle(parsed["series"]) : null;
    const number = parsed["seriesNumber"];
    const seriesNumber = typeof number === "number" ? number : null;
    const { totalGoal, deadline } = projectGoals(parsed);
    const genre = typeof parsed["genre"] === "string" ? parsed["genre"] : null;
    const coverLook = typeof parsed["coverLook"] === "string" ? parsed["coverLook"] : null;
    return {
      genre,
      coverLook,
      title: parsed["title"],
      type: parsed["type"],
      tree,
      series,
      seriesNumber,
      totalGoal,
      deadline,
    };
  } catch {
    return NO_FIELDS;
  }
}

// A project without a usable tree counts every scene file.
async function bookSceneIds(fileSystem: FileSystem, dir: string, tree: TreeNode[]) {
  const onDisk = (await openProjectFolder(fileSystem, dir)).scenes;
  const inManuscript = manuscriptSceneIds(tree).filter((id) => onDisk.includes(id));
  return inManuscript.length > 0 ? inManuscript : onDisk;
}

// Two calls a book, not one per scene.
async function lastChange(fileSystem: FileSystem, dir: string, sceneIds: string[]) {
  const [scenes, top] = await Promise.all([
    timesIn(fileSystem, joinPath(dir, "scenes")),
    timesIn(fileSystem, dir),
  ]);
  const times = [...sceneIds.map((id) => scenes[`${id}.md`]), top["project.json"]];
  const known = times.filter((time): time is number => time !== undefined);
  return known.length > 0 ? Math.max(...known) : null;
}

const missingBook = (dir: string): ShelfBook => ({
  dir,
  title: folderTitle(dir),
  kind: "",
  words: 0,
  status: "",
  progress: 0,
  goal: null,
  deadline: null,
  updatedAt: null,
  isMissing: true,
  series: null,
  seriesNumber: null,
  stage: null,
});

/** One book as the shelf shows it, read from its folder. */
export async function readBook(fileSystem: FileSystem, dir: string): Promise<ShelfBook> {
  if ((await fileSystem.list(dir)).length === 0) return missingBook(dir);
  const fields = await readProjectFields(fileSystem, dir);
  const sceneIds = await bookSceneIds(fileSystem, dir, fields.tree);
  const scenes = Object.values(await readSceneSummaries(fileSystem, dir, sceneIds));
  const words = scenes.reduce((sum, scene) => sum + scene.words, 0);
  const stage = bookStage(scenes);
  const goal = fields.totalGoal;
  const isAimed = goal !== null && isDraftStage(stage);
  return {
    dir,
    title: typeof fields.title === "string" ? fields.title : folderTitle(dir),
    kind: (typeof fields.type === "string" && KIND_LABELS[fields.type]) || t("Projekt"),
    words,
    status: bookStatus(scenes, fields),
    progress: isAimed ? Math.min(100, Math.round((100 * words) / goal)) : bookProgress(scenes),
    goal,
    deadline: fields.deadline,
    genre: fields.genre,
    coverLook: fields.coverLook,
    updatedAt: await lastChange(fileSystem, dir, sceneIds),
    isMissing: false,
    series: fields.series,
    seriesNumber: fields.seriesNumber,
    stage,
  };
}

/** Missing ones last. */
export async function readShelf(
  fileSystem: FileSystem,
  libraryDir: string | null,
  knownDirs: string[],
) {
  const inLibrary = libraryDir
    ? (await fileSystem.list(libraryDir))
        .filter(isBookFolder)
        .map((name) => joinPath(libraryDir, name))
    : [];
  const dirs = [...new Set([...inLibrary, ...knownDirs])];
  const books = await Promise.all(dirs.map((dir) => readBook(fileSystem, dir)));
  return [...books.filter((book) => !book.isMissing), ...books.filter((book) => book.isMissing)];
}
