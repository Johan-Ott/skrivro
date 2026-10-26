/** Levenshtein distance. */
export function editDistance(first: string, second: string): number {
  let previous = Array.from({ length: second.length + 1 }, (_unused, index) => index);
  for (let row = 1; row <= first.length; row++) {
    const current = [row];
    for (let col = 1; col <= second.length; col++) {
      const change = first[row - 1] === second[col - 1] ? 0 : 1;
      current[col] = Math.min(
        (previous[col] ?? 0) + 1,
        (current[col - 1] ?? 0) + 1,
        (previous[col - 1] ?? 0) + change,
      );
    }
    previous = current;
  }
  return previous[second.length] ?? 0;
}

export interface NameSuspect {
  word: string;
  suggestion: string;
  count: number;
  sceneIds: string[];
}

const CAPITALISED_WORD = /(?<![\p{L}\p{N}])\p{Lu}[\p{L}]{3,}(?![\p{L}\p{N}])/gu;

// One letter off for short names, two for longer: two for short ones would flag most capitals.
const allowedDistance = (name: string) => (name.length >= 6 ? 2 : 1);

function closestName(word: string, names: string[]): string | null {
  if (names.some((name) => word === name || word === `${name}s`)) return null;
  return (
    names.find((name) => {
      const distance = editDistance(word, name);
      return distance > 0 && distance <= allowedDistance(name);
    }) ?? null
  );
}

/** For example "Sjöbergh" for Sjöberg. The most common first. */
export function nameSuspects(
  sceneTexts: Record<string, string>,
  names: string[],
  ignored: string[],
): NameSuspect[] {
  const found = new Map<string, NameSuspect>();
  const written = new Set(names.flatMap((name) => name.split(/\s+/)));
  const isWritten = (word: string) =>
    written.has(word) || (word.endsWith("s") && written.has(word.slice(0, -1)));
  for (const [sceneId, text] of Object.entries(sceneTexts)) {
    for (const [word] of text.matchAll(CAPITALISED_WORD)) {
      if (ignored.includes(word) || isWritten(word)) continue;
      const suggestion = closestName(word, names);
      if (!suggestion) continue;
      const suspect = found.get(word) ?? { word, suggestion, count: 0, sceneIds: [] };
      suspect.count++;
      if (!suspect.sceneIds.includes(sceneId)) suspect.sceneIds.push(sceneId);
      found.set(word, suspect);
    }
  }
  return [...found.values()].sort((first, second) => second.count - first.count);
}

export interface PlacedWord {
  /** In lower case, so "Hade" and "hade" are the same word. */
  word: string;
  from: number;
  to: number;
  sentence: number;
  /** Capitalised inside a sentence, so a name; names repeat without being a fault. */
  isName: boolean;
}

const WORD = /[\p{L}\p{N}]+|[.!?]+|\n/gu;

/** A line break also ends a sentence. */
export function wordsWithSentences(text: string): PlacedWord[] {
  const words: PlacedWord[] = [];
  let sentence = 0;
  let isSentenceOpen = false;
  for (const match of text.matchAll(WORD)) {
    const token = match[0];
    if (/^[.!?\n]/.test(token)) {
      if (isSentenceOpen) sentence++;
      isSentenceOpen = false;
      continue;
    }
    const isName = isSentenceOpen && /^\p{Lu}/u.test(token);
    const word = token.toLocaleLowerCase("sv-SE");
    words.push({ word, from: match.index, to: match.index + token.length, sentence, isName });
    isSentenceOpen = true;
  }
  return words;
}

// Words so common that repeating them says nothing about the prose.
const COMMON = new Set(
  "och att det som en ett den de dem han hon jag du vi ni man sig sin sitt sina mig dig oss er hans hennes i på av för med till från om men så när är var har inte nu ut upp".split(
    " ",
  ),
);

export interface Repetition {
  word: string;
  ranges: { from: number; to: number }[];
  /** The most times it comes within one window of sentences, which is what Granska says. */
  most: number;
}

// How many of these places fall within `window` sentences of each other at most.
function mostWithin(places: PlacedWord[], window: number) {
  return Math.max(
    ...places.map(
      (place) =>
        places.filter(
          (other) => other.sentence >= place.sentence && other.sentence - place.sentence < window,
        ).length,
    ),
  );
}

export function repetitions(words: PlacedWord[], window: number): Repetition[] {
  // A name is a name also where it begins a sentence, so "Karin" is never a repetition.
  const names = new Set(words.filter((placed) => placed.isName).map((placed) => placed.word));
  const byWord = new Map<string, PlacedWord[]>();
  for (const placed of words) {
    if (names.has(placed.word) || placed.word.length < 3 || COMMON.has(placed.word)) continue;
    byWord.set(placed.word, [...(byWord.get(placed.word) ?? []), placed]);
  }
  const found: Repetition[] = [];
  for (const [word, places] of byWord) {
    const close = places.filter((place, index) =>
      places.some(
        (other, otherIndex) =>
          otherIndex !== index && Math.abs(other.sentence - place.sentence) < window,
      ),
    );
    if (close.length < 2) continue;
    const ranges = close.map(({ from, to }) => ({ from, to }));
    found.push({ word, ranges, most: mostWithin(close, window) });
  }
  return found.sort(
    (first, second) => (first.ranges[0]?.from ?? 0) - (second.ranges[0]?.from ?? 0),
  );
}
