import { countWords } from "../countWords.js";
import type { ContentsRow } from "./contents.js";

// Each chapter's pace: how long it is, how much of it is spoken, and how long its sentences run.

export interface ChapterTempo {
  id: string;
  number: number;
  title: string;
  words: number;
  /** The share of the words in lines spoken, from 0 to 1. */
  dialogue: number;
  /** Words per sentence. */
  sentence: number;
  /** Longer than most, with less talk and longer sentences: a chapter that may drag. */
  isSlow: boolean;
}

const SPOKEN = /^\s*[\u2013\u2014\-”"“]/;

// Talk and sentence length are shares of the text as given, so they are counted on that text.
function paceOf(text: string) {
  const words = countWords(text);
  const spoken = text
    .split("\n")
    .filter((line) => SPOKEN.test(line))
    .reduce((sum, line) => sum + countWords(line), 0);
  const sentences = Math.max(1, (text.match(/[.!?…]+(?=\s|$)/g) ?? []).length);
  return { dialogue: words ? spoken / words : 0, sentence: words / sentences };
}

const median = (values: number[]) => {
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

const SLOW_LENGTH = 1.3;

/** The book's chapters with their pace; a chapter is slow next to the book's own middle. */
export function chapterTempo(rows: ContentsRow[], texts: Record<string, string>): ChapterTempo[] {
  const chapters = rows.flatMap((row) => {
    if (row.number === null) return [];
    const pace = paceOf(row.sceneIds.map((id) => texts[id] ?? "").join("\n"));
    return [{ id: row.id, number: row.number, title: row.title, words: row.words, ...pace }];
  });
  const middle = {
    words: median(chapters.map((chapter) => chapter.words)),
    dialogue: median(chapters.map((chapter) => chapter.dialogue)),
    sentence: median(chapters.map((chapter) => chapter.sentence)),
  };
  return chapters.map((chapter) => ({
    ...chapter,
    isSlow:
      chapters.length >= 3 &&
      chapter.words > middle.words * SLOW_LENGTH &&
      chapter.dialogue < middle.dialogue &&
      chapter.sentence > middle.sentence,
  }));
}
