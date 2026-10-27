import { splitSceneFile, readField, withField } from "../manuscript/sceneFile.js";
import { newSceneId } from "../storage/sceneId.js";

// Lappar: notes in the sort Lappar, shown as post-its over the text on a computer, written in or
// drawn on. A lapp is an ordinary note file; its colour, place and lines stand in the front matter.

export const NOTE_COLORS = ["gul", "rosa", "mint", "himmel", "lavendel"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

/** A line drawn with the pen, as points in the note's own pixels. */
export type Stroke = [number, number][];

export interface StickyNote {
  id: string;
  color: NoteColor;
  text: string;
  strokes: Stroke[];
  left: number;
  top: number;
  width: number;
  height: number;
}

const DEFAULT_PLACE = { left: 24, top: 24, width: 200, height: 180 };

export function newStickyNote(place: { left: number; top: number }, color: NoteColor = "gul") {
  const note: StickyNote = {
    id: newSceneId(),
    color,
    text: "",
    strokes: [],
    ...DEFAULT_PLACE,
    ...place,
  };
  return note;
}

/** The note as its file: colour, place and lines first, then what was written. */
export function stickyNoteFileText(note: StickyNote) {
  const place = [note.left, note.top, note.width, note.height].join(", ");
  const strokes = note.strokes.length > 0 ? [`strokes: ${JSON.stringify(note.strokes)}`] : [];
  const lines = [`id: ${note.id}`, `color: ${note.color}`, `place: ${place}`, ...strokes];
  return `---\n${lines.join("\n")}\n---\n${note.text}`;
}

const isColor = (value: string | null): value is NoteColor =>
  (NOTE_COLORS as readonly (string | null)[]).includes(value);

function placeOf(frontMatter: string) {
  const parts = (readField(frontMatter, "place") ?? "").split(",").map(Number);
  const [left = NaN, top = NaN, width = NaN, height = NaN] = parts;
  const isPlace = parts.length === 4 && parts.every(Number.isFinite);
  return isPlace ? { left, top, width, height } : DEFAULT_PLACE;
}

function strokesOf(frontMatter: string): Stroke[] {
  try {
    const parsed: unknown = JSON.parse(readField(frontMatter, "strokes") ?? "[]");
    return Array.isArray(parsed) ? (parsed as Stroke[]) : [];
  } catch {
    return [];
  }
}

/** A note file read as a lapp; what is missing in it is yellow, in the first place, and undrawn. */
export function readStickyNote(id: string, fileText: string): StickyNote {
  const { frontMatter, body } = splitSceneFile(fileText);
  const color = readField(frontMatter, "color");
  return {
    id,
    color: isColor(color) ? color : "gul",
    text: body,
    strokes: strokesOf(frontMatter),
    ...placeOf(frontMatter),
  };
}

const withoutField = (frontMatter: string, key: string) =>
  frontMatter.replace(new RegExp(`^${key}:.*\r?\n`, "m"), "");

/** The lapp's own fields written into the file as it already is: whatever the note got besides
 * colour, place and lines, such as a title, a status or a link choice, stays as it was. */
export function stickyNoteOnDisk(onDisk: string | null, wanted: string) {
  const own = splitSceneFile(wanted);
  const kept = onDisk === null ? "" : splitSceneFile(onDisk).frontMatter;
  if (kept === "") return wanted;
  const strokes = readField(own.frontMatter, "strokes");
  const withOwn = ["color", "place"].reduce(
    (front, key) => withField(front, key, readField(own.frontMatter, key) ?? ""),
    kept,
  );
  const front =
    strokes === null ? withoutField(withOwn, "strokes") : withField(withOwn, "strokes", strokes);
  return front + own.body;
}
