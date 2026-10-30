import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { joinPath, readIfThere, type FileSystem } from "@llkit/storage/fileSystem.js";
import { REVISIONS_DIR } from "./revisions.js";

/** What came back in one scene. */
export type SceneBack = { changes: number; comments: number };

/** One round with the editor: the Word file out, and back with changes, comments and a letter. */
export interface Round {
  /** When the file was made, read from the file itself; 0 when it does not say. */
  sentAt: number;
  backAt: number;
  /** "" when neither the file nor its comments name anyone but the writer. */
  editor: string;
  /** The editor's letter from the file's first page, as Markdown; "" when there was none. */
  letter: string;
  back: Record<string, SceneBack>;
  /** The writer's answer, the first page of the next file. */
  answer: string;
  /** Börja genomgången was pressed; until then the letter opens the book in Redigera. */
  isRead: boolean;
}

const roundsPath = (dir: string) => joinPath(joinPath(dir, REVISIONS_DIR), "omgangar.json");

export async function readRounds(fileSystem: FileSystem, dir: string): Promise<Round[]> {
  const text = await readIfThere(fileSystem, roundsPath(dir));
  try {
    const parsed: unknown = JSON.parse(text ?? "[]");
    return Array.isArray(parsed) ? (parsed as Round[]) : [];
  } catch {
    return [];
  }
}

export async function writeRounds(fileSystem: FileSystem, dir: string, rounds: Round[]) {
  await fileSystem.makeDir(joinPath(dir, REVISIONS_DIR));
  await writeAtomic(fileSystem, roundsPath(dir), `${JSON.stringify(rounds, null, 2)}\n`);
}

/** The same file read again is the same round, its answer kept; another file is the next round. */
export function withRound(rounds: Round[], round: Round): Round[] {
  const last = rounds.at(-1);
  if (!last || round.sentAt === 0 || last.sentAt !== round.sentAt) return [...rounds, round];
  return [...rounds.slice(0, -1), { ...round, answer: last.answer }];
}

/** The answer to the latest round, as the paragraphs the next file's first page starts with. */
export async function latestAnswer(fileSystem: FileSystem, dir: string): Promise<string[]> {
  const answer = (await readRounds(fileSystem, dir)).at(-1)?.answer ?? "";
  return answer
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
