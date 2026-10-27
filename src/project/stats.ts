import { splitSceneFile } from "../manuscript/sceneFile.js";
import { countMarkdownWords } from "../manuscript/wordCount.js";
import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { setAside } from "../storage/setAside.js";
import { joinPath, readIfThere, type FileSystem } from "@llkit/storage/fileSystem.js";

/** Words written per day, as { "2026-10-02": 812 }. */
export type Stats = Record<string, number>;

/** A day in milliseconds. */
export const DAY = 24 * 60 * 60 * 1000;

export function dayKey(time: number): string {
  const date = new Date(time);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Day keys are stepped in UTC, so a summer time change never skips or repeats a day.
const dayBefore = (key: string) =>
  new Date(Date.parse(`${key}T00:00:00Z`) - DAY).toISOString().slice(0, 10);

const bodyWords = (sceneText: string) => countMarkdownWords(splitSceneFile(sceneText).body);

/** Only what a save added, so moving or trashing scenes never counts as writing. */
export const wordsAdded = (before: string, after: string) => bodyWords(after) - bodyWords(before);

export const addWritten = (stats: Stats, day: string, words: number): Stats => ({
  ...stats,
  [day]: Math.max(0, (stats[day] ?? 0) + words),
});

/** Today only breaks the streak once it is over. */
export function streak(stats: Stats, today: string): number {
  let day = (stats[today] ?? 0) > 0 ? today : dayBefore(today);
  let days = 0;
  while ((stats[day] ?? 0) > 0) {
    days++;
    day = dayBefore(day);
  }
  return days;
}

// One file per device, so two devices never write the same file. stats.json is the older shared one.
const sharedPath = (dir: string) => joinPath(dir, "stats.json");
const devicePath = (dir: string, device: string) => joinPath(dir, `stats/${device}.json`);

const isStatsObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function statsOf(text: string): Stats {
  const parsed: unknown = JSON.parse(text);
  if (!isStatsObject(parsed)) throw new Error("Statistikfilen har ett oväntat innehåll.");
  const entries = Object.entries(parsed).filter(([, words]) => typeof words === "number");
  return Object.fromEntries(entries) as Stats;
}

// For showing: a file that cannot be read counts as nothing yet.
async function readStatsFile(fileSystem: FileSystem, path: string): Promise<Stats> {
  try {
    const text = await readIfThere(fileSystem, path);
    return text === null ? {} : statsOf(text);
  } catch {
    return {};
  }
}

const addUp = (all: Stats[]): Stats =>
  all.reduce<Stats>((sum, stats) => {
    for (const [day, words] of Object.entries(stats)) sum[day] = (sum[day] ?? 0) + words;
    return sum;
  }, {});

export async function readStats(fileSystem: FileSystem, dir: string): Promise<Stats> {
  const names = await fileSystem.list(joinPath(dir, "stats")).catch(() => []);
  const paths = names
    .filter((name) => name.endsWith(".json"))
    .map((name) => joinPath(dir, `stats/${name}`));
  return addUp(
    await Promise.all([sharedPath(dir), ...paths].map((path) => readStatsFile(fileSystem, path))),
  );
}

/** For adding to: none yet when the file is missing, but an error when it is there and cannot be
 * read, since the days it holds would be written over with nothing. */
export async function readDeviceStats(fileSystem: FileSystem, dir: string, device: string) {
  const text = await readIfThere(fileSystem, devicePath(dir, device));
  return text === null ? {} : statsOf(text);
}

export async function writeDeviceStats(
  fileSystem: FileSystem,
  dir: string,
  device: string,
  stats: Stats,
) {
  await fileSystem.makeDir(joinPath(dir, "stats"));
  await writeAtomic(
    fileSystem,
    devicePath(dir, device),
    `${JSON.stringify(stats, null, 2)}
`,
  );
}

export function dailyGoalOf(fields: Record<string, unknown>): number | null {
  const goal = fields["dailyGoal"];
  return typeof goal === "number" && goal > 0 ? goal : null;
}

/** The device's own stats for adding to. A file that is there but cannot be read is put aside in
 * trash/, not counted as empty and written over, and counting goes on from nothing. */
export async function readDeviceStatsOrSetAside(
  fileSystem: FileSystem,
  dir: string,
  device: string,
) {
  // A read that fails is not a broken file: it throws on, and nothing is put aside.
  const text = await readIfThere(fileSystem, devicePath(dir, device));
  if (text === null) return {};
  try {
    return statsOf(text);
  } catch {
    await setAside(fileSystem, dir, devicePath(dir, device), `${device}.json`);
    return {};
  }
}
