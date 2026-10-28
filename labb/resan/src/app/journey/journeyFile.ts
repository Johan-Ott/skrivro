import { mergedJourney, NO_JOURNEY, type Holiday, type Journey } from "../../project/journey.js";
import type { Stats } from "../../project/stats.js";
import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { joinPath, type FileSystem } from "@llkit/storage/fileSystem.js";
import { platform } from "../platform.js";

// One file per device in the Skrivro folder, so two computers never write over each other.
const folderOf = (library: string) => joinPath(library, "skrivresa");

/** The writer's chosen folder, or Skrivro in Documents; Penna there is where the books lived before. */
export async function libraryOf(libraryDir: string | null) {
  if (libraryDir) return libraryDir;
  const { documents } = await platform.knownFolders();
  const before = `${documents}/Penna`;
  return (await platform.fileSystem.modifiedAt(before)) === null ? `${documents}/Skrivro` : before;
}

function statsFrom(value: unknown): Stats {
  if (typeof value !== "object" || value === null) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    ),
  );
}

const isHoliday = (value: unknown): value is Holiday =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Holiday).from === "string" &&
  (typeof (value as Holiday).to === "string" || (value as Holiday).to === null);

function badgesFrom(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function journeyFrom(text: string): Journey {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const holidays = Array.isArray(parsed["holidays"]) ? parsed["holidays"] : [];
    return {
      words: statsFrom(parsed["words"]),
      ink: statsFrom(parsed["ink"]),
      holidays: holidays.filter(isHoliday),
      badges: badgesFrom(parsed["badges"]),
    };
  } catch {
    return NO_JOURNEY;
  }
}

/** This device's own journey, and the other devices' added up. */
export async function readJourneys(fileSystem: FileSystem, library: string, device: string) {
  const names: string[] = await fileSystem.list(folderOf(library)).catch(() => []);
  const read = (name: string) =>
    fileSystem
      .readText(joinPath(folderOf(library), name))
      .then(journeyFrom)
      .catch(() => NO_JOURNEY);
  const own = names.includes(`${device}.json`) ? await read(`${device}.json`) : NO_JOURNEY;
  const others = names.filter((name) => name.endsWith(".json") && name !== `${device}.json`);
  return { own, others: mergedJourney(await Promise.all(others.map(read))) };
}

export async function writeOwnJourney(
  fileSystem: FileSystem,
  library: string,
  device: string,
  journey: Journey,
) {
  await fileSystem.makeDir(folderOf(library));
  const path = joinPath(folderOf(library), `${device}.json`);
  await writeAtomic(fileSystem, path, `${JSON.stringify(journey, null, 2)}\n`);
}
