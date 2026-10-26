import { useEffect, useMemo } from "react";
import { refreshMentions } from "../../editor/mentions.js";
import type { useEditorView } from "../../editor/useEditorView.js";
import { mentionPattern, namesOf } from "../../project/cards.js";
import type { Notes } from "./useNotes.js";
import { useBookWords } from "../useBookWords.js";
import type { Project } from "../useProject.js";

/** The text is underlined again as soon as the names change, so a new person is linked at once;
 * the names and the book's own words go to the completion. */
export function useMentionLinks(
  editor: ReturnType<typeof useEditorView>,
  notes: Notes,
  book: Project | null,
) {
  useBookWords(editor, book);
  const matchers = useMemo(
    () => notes.cards.map((card) => ({ id: card.id, pattern: mentionPattern(namesOf(card)) })),
    [notes.cards],
  );
  editor.modes.current.mentionMatchers = matchers;
  // Offered while typing too, the names and the first name alone: "Arvid Holm", "Arvid".
  const names = useMemo(
    () => [
      ...new Set(
        notes.cards.flatMap((card) => [...namesOf(card), card.name.split(/\s+/)[0] ?? ""]),
      ),
    ],
    [notes.cards],
  );
  editor.modes.current.completion = { ...editor.modes.current.completion, names };
  editor.modes.current.onMention = notes.showMention;
  const { run } = editor;
  useEffect(() => run(refreshMentions, false), [matchers, run]);
}
