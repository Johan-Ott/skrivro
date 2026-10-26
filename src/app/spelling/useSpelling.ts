import { useEffect, useMemo } from "react";
import { checkSpellingNow, type SpellingSwitch } from "../../editor/spellingMarks.js";
import type { useEditorView } from "../../editor/useEditorView.js";
import { bookLanguage } from "../../project/bookLanguage.js";
import { everyName } from "../../project/cards.js";
import type { Notes } from "../notes/useNotes.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";

/** The words the writer added to the book's own list in project.json. */
function ownWords(fields: Record<string, unknown>): string[] {
  const stored = fields["words"];
  return Array.isArray(stored)
    ? stored.filter((word): word is string => typeof word === "string")
    : [];
}

// A name in the notes is spelled right, also with a genitive s: "Elins".
function knownWords(names: string[], own: string[]) {
  const known = new Set([...names.flatMap((name) => name.split(/\s+/)), ...own]);
  return (word: string) => known.has(word) || (word.endsWith("s") && known.has(word.slice(0, -1)));
}

/** Skrivro's own spelling check in the book's language, where the platform has one. */
export function useSpelling(
  editor: ReturnType<typeof useEditorView>,
  project: Project | null,
  notes: Notes,
  options: { isOn: boolean; updateFields: (fields: Record<string, unknown>) => void },
) {
  const { isOn, updateFields } = options;
  const spelling = platform.spelling;
  const language = project ? bookLanguage(project.fields) : null;
  // As text, so a new notes object with the same names asks nothing again.
  const names = everyName(notes.cards).join("\n");
  const own = project ? ownWords(project.fields).join("\n") : "";
  const isKnown = useMemo(() => knownWords(names.split("\n"), own.split("\n")), [names, own]);
  const addWord = (word: string) =>
    project && updateFields({ words: [...new Set([...ownWords(project.fields), word])] });
  const current: SpellingSwitch | null =
    spelling && isOn && language ? { language, ...spelling, isKnown, addWord } : null;
  editor.modes.current.spelling = current;
  const { viewRef } = editor;
  useEffect(() => {
    if (viewRef.current) checkSpellingNow(viewRef.current);
  }, [language, isOn, isKnown, viewRef]);
  // Where the browser checks the spelling, the page's language is the only hint it takes.
  useEffect(() => {
    if (language) document.documentElement.lang = language;
  }, [language]);
}
