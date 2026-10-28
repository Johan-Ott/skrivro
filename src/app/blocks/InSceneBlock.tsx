import { useEffect, useMemo, useState } from "react";
import { useSettledDoc } from "../../editor/editorStore.js";
import { PAUSE_MS } from "../../editor/repetitionMarks.js";
import { plainText } from "../../manuscript/compare.js";
import { countMentions } from "../../project/cards.js";
import { filesAddedIn } from "../../project/researchFiles.js";
import { readSceneBodies } from "../../project/sceneSummaries.js";
import type { AppState } from "../App.js";
import { platform } from "../platform.js";
import { t } from "../../i18n/i18n.js";

// I scenen: who and what the scene names, counted as it is typed, and the files added from it,
// each with the first line of its note. A click shows the note beside the text.

const firstLine = (body: string) =>
  (
    plainText(body, "\n")
      .trim()
      .match(/^[^.!?\n]*/)?.[0] ?? ""
  ).trim();

function useFirstLines(refs: { dir: string; id: string }[]) {
  const [lines, setLines] = useState<Record<string, string>>({});
  const key = refs.map((ref) => ref.id).join(",");
  useEffect(() => {
    let isCurrent = true;
    void readSceneBodies(platform.fileSystem, refs).then((bodies) => {
      const read = Object.entries(bodies).map(([id, body]) => [id, firstLine(body)]);
      if (isCurrent) setLines(Object.fromEntries(read));
    });
    return () => void (isCurrent = false);
  }, [key]);
  return lines;
}

// The linked notes named in the open scene's text, but not the scene itself if it is a note, and
// then the files added from the scene, as no one names "brev.pdf" in the text.
export function useNamedHere(app: AppState) {
  const sceneId = app.scene?.id ?? null;
  // Who is named follows the text at each pause, not at each key.
  const text = useSettledDoc(app.editor, PAUSE_MS)?.textContent ?? "";
  const { cards, allNotes } = app.notes;
  const tree = app.project?.tree;
  return useMemo(() => {
    if (!sceneId) return [];
    const found = countMentions(cards, { [sceneId]: text });
    const named = cards.filter(
      (card) => card.id !== sceneId && (found.get(card.id)?.count ?? 0) > 0,
    );
    const added = filesAddedIn(tree ?? [], sceneId);
    const files = allNotes.filter(
      (note) => added.includes(note.id) && !named.some((card) => card.id === note.id),
    );
    return [...named, ...files];
  }, [cards, allNotes, tree, sceneId, text]);
}

export function InSceneBlock({ app }: { app: AppState }) {
  const named = useNamedHere(app);
  const lines = useFirstLines(named);
  if (named.length === 0)
    return <p className="setting-hint">{t("Ingen från anteckningarna nämns här än.")}</p>;
  const beside = (dir: string, sceneId: string) =>
    app.writingMode.setBeside({ kind: "text", dir, sceneId });
  return (
    <ul className="in-scene">
      {named.map((card) => (
        <li key={card.id}>
          <button className="in-scene-note" onClick={() => beside(card.dir, card.id)}>
            <span className="in-scene-name">{card.name}</span>
            <span className="in-scene-sort">{card.sortLabel}</span>
            {lines[card.id] && <span className="in-scene-line">{lines[card.id]}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
