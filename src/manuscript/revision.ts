import { diffWords } from "./wordDiff.js";

// Accepting a change edits the writer's text; rejecting it edits the editor's version back.
// Either way the two agree there, so the change is gone.

export interface RevisionChange {
  /** Where the change lies in the writer's text, as offsets in it. */
  from: number;
  to: number;
  removed: string;
  added: string;
  /** Where the same change lies in the editor's version. */
  revisedFrom: number;
  revisedTo: number;
}

const changeAt = (mine: number, theirs: number): RevisionChange => ({
  from: mine,
  to: mine,
  removed: "",
  added: "",
  revisedFrom: theirs,
  revisedTo: theirs,
});

// A word changed only by letters put in or taken out is just those letters: "katt" to "katten"
// adds "en". A word changed in the middle stays a word replaced.
function narrowed(change: RevisionChange): RevisionChange {
  const { removed, added } = change;
  if (!removed || !added) return change;
  const [short, long] = removed.length < added.length ? [removed, added] : [added, removed];
  let start = 0;
  while (start < short.length && short[start] === long[start]) start++;
  const end = short.length - start;
  if (!long.endsWith(short.slice(start))) return change;
  return {
    from: change.from + start,
    to: change.to - end,
    removed: removed.slice(start, removed.length - end),
    added: added.slice(start, added.length - end),
    revisedFrom: change.revisedFrom + start,
    revisedTo: change.revisedTo - end,
  };
}

/** The differences, first to last. */
export function revisionChanges(current: string, revised: string): RevisionChange[] {
  const changes: RevisionChange[] = [];
  let open: RevisionChange | null = null;
  const place = { mine: 0, theirs: 0 };
  for (const part of diffWords(current, revised, true)) {
    const length = part.text.length;
    if (part.kind === "same") {
      open = null;
      place.mine += length;
      place.theirs += length;
      continue;
    }
    if (!open) {
      open = changeAt(place.mine, place.theirs);
      changes.push(open);
    }
    if (part.kind === "removed") {
      open.removed += part.text;
      place.mine += length;
      open.to = place.mine;
    } else {
      open.added += part.text;
      place.theirs += length;
      open.revisedTo = place.theirs;
    }
  }
  return changes.map(narrowed);
}

/** The editor's version with this change taken back, so it matches the writer's text there. */
export const withoutChange = (revised: string, change: RevisionChange) =>
  revised.slice(0, change.revisedFrom) + change.removed + revised.slice(change.revisedTo);

/** The same change after other edits: matched by what it removes and adds, nearest first. */
export function sameChange(changes: RevisionChange[], wanted: RevisionChange) {
  const matching = changes.filter(
    (change) => change.removed === wanted.removed && change.added === wanted.added,
  );
  const distance = (change: RevisionChange) => Math.abs(change.from - wanted.from);
  return matching.sort((first, second) => distance(first) - distance(second))[0] ?? null;
}

/** Where a place in the writer's text lies in the editor's version. At the start of a change it
 * is before it; anywhere else in it, after the words it adds, where the caret shows. */
export function revisedPlace(changes: RevisionChange[], place: number) {
  let shift = 0;
  for (const change of changes) {
    if (place < change.from) break;
    if (place === change.from && change.from < change.to) return change.revisedFrom;
    if (place <= change.to) return change.revisedTo;
    shift = change.revisedTo - change.to;
  }
  return place + shift;
}

/** The other way: where a place in the editor's version shows in the writer's text. */
export function writerPlace(changes: RevisionChange[], place: number) {
  let shift = 0;
  for (const change of changes) {
    if (place < change.revisedFrom) break;
    if (place === change.revisedFrom) return change.from;
    if (place <= change.revisedTo) return change.to;
    shift = change.revisedTo - change.to;
  }
  return place - shift;
}
