import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { joinPath, readIfThere, type FileSystem } from "@llkit/storage/fileSystem.js";
import { newSceneId } from "../storage/sceneId.js";

export interface Anchor {
  quote: string;
  prefix: string;
  suffix: string;
}

/** A reply has `replyTo` and no quote of its own. */
export interface Comment extends Anchor {
  id: string;
  body: string;
  author: string;
  /** Milliseconds since 1970. */
  createdAt: number;
  resolved: boolean;
  replyTo?: string;
  /** The writer's own note at the line, not a word to or from a reader. */
  isNote?: boolean;
}

const CONTEXT = 32;

export function anchorAt(text: string, from: number, to: number): Anchor {
  return {
    quote: text.slice(from, to),
    prefix: text.slice(Math.max(0, from - CONTEXT), from),
    suffix: text.slice(to, to + CONTEXT),
  };
}

export const newComment = (
  anchor: Anchor,
  body: string,
  author: string,
  isNote = false,
): Comment => ({
  id: newSceneId(),
  ...anchor,
  body,
  author,
  createdAt: Date.now(),
  resolved: false,
  ...(isNote ? { isNote } : {}),
});

export const newReply = (to: Comment, body: string, author: string): Comment => ({
  ...newComment({ quote: "", prefix: "", suffix: "" }, body, author),
  replyTo: to.id,
});

// How many characters of the remembered text still stand right before and after a match.
function contextScore(text: string, start: number, length: number, anchor: Anchor) {
  let score = 0;
  while (
    score < anchor.prefix.length &&
    text[start - 1 - score] === anchor.prefix[anchor.prefix.length - 1 - score]
  ) {
    score++;
  }
  for (
    let index = 0;
    index < anchor.suffix.length && text[start + length + index] === anchor.suffix[index];
    index++
  ) {
    score++;
  }
  return score;
}

/** Of several matches the one with the best-matching surroundings wins; null when the quote is gone. */
export function locate(text: string, anchor: Anchor): { from: number; to: number } | null {
  if (anchor.quote === "") return null;
  let best: { from: number; score: number } | null = null;
  for (
    let start = text.indexOf(anchor.quote);
    start !== -1;
    start = text.indexOf(anchor.quote, start + 1)
  ) {
    const score = contextScore(text, start, anchor.quote.length, anchor);
    if (!best || score > best.score) best = { from: start, score };
  }
  return best ? { from: best.from, to: best.from + anchor.quote.length } : null;
}

const commentsDir = (dir: string) => joinPath(dir, "comments");
const commentsPath = (dir: string, sceneId: string) =>
  joinPath(commentsDir(dir), `${sceneId}.json`);

function commentOf(value: unknown): Comment | null {
  if (typeof value !== "object" || value === null) return null;
  const item = value as Record<string, unknown>;
  const text = (key: string) => (typeof item[key] === "string" ? String(item[key]) : "");
  if (!text("id")) return null;
  const replyTo = text("replyTo");
  return {
    id: text("id"),
    quote: text("quote"),
    prefix: text("prefix"),
    suffix: text("suffix"),
    body: text("body"),
    author: text("author"),
    createdAt: typeof item["createdAt"] === "number" ? item["createdAt"] : 0,
    resolved: item["resolved"] === true,
    ...(replyTo ? { replyTo } : {}),
    ...(item["isNote"] === true ? { isNote: true } : {}),
  };
}

// Kept as a copy first, so a later save overwrites nothing.
async function keepBrokenCopy(fileSystem: FileSystem, path: string, brokenText: string) {
  const stamp = new Date().toISOString().slice(0, 16).replace(":", "-");
  await writeAtomic(fileSystem, `${path}.trasig-${stamp}`, brokenText);
}

export async function readComments(fileSystem: FileSystem, dir: string, sceneId: string) {
  const path = commentsPath(dir, sceneId);
  const fileText = await readIfThere(fileSystem, path);
  if (fileText === null) return [];
  try {
    const parsed: unknown = JSON.parse(fileText);
    if (!Array.isArray(parsed)) throw new Error("not a list");
    return parsed.map(commentOf).filter((comment): comment is Comment => comment !== null);
  } catch {
    await keepBrokenCopy(fileSystem, path, fileText);
    return [];
  }
}

export async function writeComments(
  fileSystem: FileSystem,
  dir: string,
  sceneId: string,
  comments: Comment[],
) {
  await fileSystem.makeDir(commentsDir(dir));
  await writeAtomic(
    fileSystem,
    commentsPath(dir, sceneId),
    `${JSON.stringify(comments, null, 2)}\n`,
  );
}
