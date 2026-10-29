import { readSceneBodies } from "../../project/sceneSummaries.js";
import { spaceAfterColon } from "../../manuscript/colonSpace.js";
import { useEffect, useMemo, useState } from "react";
import { plainText } from "../../manuscript/compare.js";
import { cardsOf, notesOf, countMentions, type Card } from "../../project/cards.js";
import { noteKind, type NoteKind } from "../../project/noteKinds.js";
import { findNode, manuscriptSceneIds } from "../../project/tree.js";
import { nodeLabel } from "../../project/treeLabels.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";

export interface ShownMention {
  id: string;
  box: DOMRect;
}

interface TextRef {
  dir: string;
  id: string;
}

async function readTexts(refs: TextRef[]) {
  const bodies = await readSceneBodies(platform.fileSystem, refs);
  return Object.fromEntries(
    Object.entries(bodies).map(([id, body]) => [id, plainText(body, "\n")]),
  );
}

// Read only while a note or name card shows, so an ordinary save does not read the whole book.
function useTexts(refs: TextRef[], version: unknown, isWanted: boolean) {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const key = refs.map((ref) => `${ref.dir}|${ref.id}`).join(",");
  useEffect(() => {
    if (!isWanted) return;
    let isCurrent = true;
    const wanted = key ? key.split(",").map((entry) => entry.split("|")) : [];
    void readTexts(wanted.map(([dir = "", id = ""]) => ({ dir, id }))).then(
      (read) => isCurrent && setTexts(read),
    );
    return () => void (isCurrent = false);
  }, [key, version, isWanted]);
  return texts;
}

export interface NoteCard extends Card {
  dir: string;
  sortLabel: string;
  /** A file or a guide, read in the home the note is in, the book's or the series'. */
  kind: NoteKind | null;
  file?: string;
}

export function noteCards(homes: Project[], pick: typeof notesOf): NoteCard[] {
  return homes.flatMap((home) =>
    pick(home.tree, home.summaries).map((card) => {
      const sort = findNode(home.tree, card.sortId)?.node;
      const sortLabel = sort ? nodeLabel(sort, home.tree, home.summaries) : "";
      const kind = noteKind(home.tree, home.summaries, card.id);
      const file = home.summaries[card.id]?.file;
      return { ...card, dir: home.dir, sortLabel, kind, ...(file ? { file } : {}) };
    }),
  );
}

// A prompt not yet answered, such as "Vill:" on a new person, says nothing of the note.
const firstSentence = (text: string) => {
  const line = text.split("\n").find((each) => each.trim() && !each.trim().endsWith(":")) ?? "";
  return spaceAfterColon((line.trim().match(/^[^.!?]*/)?.[0] ?? "").trim());
};

/** `homes` must keep its identity between renders (useMemo), or the texts are read every time. */
/** Mentions are counted for an open note, Innehåll's filter and Granska's people in the book. */
export function useNotes(homes: Project[], book: Project | null, areMentionsWanted: boolean) {
  const cards = useMemo(() => noteCards(homes, cardsOf), [homes]);
  const allNotes = useMemo(() => noteCards(homes, notesOf), [homes]);
  const [mention, setMention] = useState<ShownMention | null>(null);
  const isWanted = areMentionsWanted || mention !== null;
  const manuscriptRefs = useMemo(
    () => (book ? manuscriptSceneIds(book.tree).map((id) => ({ dir: book.dir, id })) : []),
    [book],
  );
  const manuscript = useTexts(manuscriptRefs, book, isWanted);
  const noteTexts = useTexts(cards, homes, isWanted);
  const mentions = useMemo(() => countMentions(cards, manuscript), [cards, manuscript]);
  return {
    cards,
    /** Every note, linked or not, for Ctrl+K. */
    allNotes,
    mentions,
    /** The book's scenes as text, keyed by scene id, read while mentions are wanted. */
    manuscript,
    descriptionOf: (id: string) => firstSentence(noteTexts[id] ?? ""),
    mention,
    showMention: (id: string, box: DOMRect) => setMention({ id, box }),
    hideMention: () => setMention(null),
  };
}

export type Notes = ReturnType<typeof useNotes>;
