import { readSceneBodies } from "../../project/sceneSummaries.js";
import type { Node } from "prosemirror-model";
import { useEffect, useMemo, useState } from "react";
import { sceneRepetitions } from "../../editor/repetitionMarks.js";
import { plainText } from "../../manuscript/compare.js";
import { withoutPlaceholders } from "../../manuscript/placeholders.js";
import { nameSuspects } from "../../manuscript/review.js";
import { narrationNotes, narrationOf } from "../../manuscript/narration.js";
import { proseNotes, type ProseNote } from "../../manuscript/prose.js";
import { splitCompounds } from "../../manuscript/compounds.js";
import { bookLanguage } from "../../project/bookLanguage.js";
import { cardsNamedIn, everyName, type Card } from "../../project/cards.js";
import { CHARACTERS_ID, findNode } from "../../project/tree.js";
import { chapterOf } from "../../project/treeLabels.js";
import { platform } from "../platform.js";
import type { OpenScene } from "../sceneSession.js";
import type { Project } from "../useProject.js";

interface ReviewInput {
  project: Project;
  scene: OpenScene;
  doc: Node;
  cards: Card[];
  repeatWindow: number;
}

const ignoredNames = (project: Project) =>
  Array.isArray(project.fields["ignoredNames"])
    ? project.fields["ignoredNames"].filter((name): name is string => typeof name === "string")
    : [];

// Read when the chapter changes, not on each save.
function useChapterTexts(project: Project, sceneId: string) {
  const chapter = chapterOf(project.tree, sceneId);
  const ids = (chapter ? (findNode(project.tree, chapter.id)?.node.children ?? []) : [])
    .filter((child) => child.kind === "scene" && child.id !== sceneId)
    .map((child) => child.id);
  const key = ids.join(",");
  const [texts, setTexts] = useState<string[]>([]);
  useEffect(() => {
    let isCurrent = true;
    const wanted = key ? key.split(",") : [];
    const refs = wanted.map((id) => ({ dir: project.dir, id }));
    void readSceneBodies(platform.fileSystem, refs).then(
      (bodies) =>
        isCurrent && setTexts(wanted.map((id) => withoutPlaceholders(plainText(bodies[id] ?? "")))),
    );
    return () => void (isCurrent = false);
  }, [project.dir, key]);
  return texts;
}

// The people whose eyes the chapter is not seen through; none when no one is named under Vems ögon.
function othersThan(project: Project, sceneId: string, cards: Card[]) {
  const chapter = chapterOf(project.tree, sceneId);
  const pov = (chapter ? findNode(project.tree, chapter.id)?.node.pov : "") ?? "";
  if (!pov.trim()) return [];
  const people = cards.filter((card) => card.sortId === CHARACTERS_ID);
  return people.map((card) => card.name).filter((name) => !pov.includes(name));
}

// Asked of Skrivro's own dictionary at each pause, so only where the platform has one.
function useSplitCompounds(text: string, language: string) {
  const [notes, setNotes] = useState<ProseNote[]>([]);
  useEffect(() => {
    const spelling = platform.spelling;
    if (!spelling) return setNotes([]);
    let isCurrent = true;
    void splitCompounds(text, language, (words) => spelling.misspelled(language, words)).then(
      (found) => isCurrent && setNotes(found),
    );
    return () => void (isCurrent = false);
  }, [text, language]);
  return notes;
}

/** `doc` is the text at the writer's last pause, so Granska does not count on every key. */
export function useReview({ project, scene, doc, cards, repeatWindow }: ReviewInput) {
  const chapterTexts = useChapterTexts(project, scene.id);
  const sceneText = withoutPlaceholders(doc.textBetween(0, doc.content.size, "\n"));
  const inChapter = useMemo(() => {
    const text = [sceneText, ...chapterTexts].join("\n");
    return cardsNamedIn(cards, text).filter((card) => card.id !== scene.id);
  }, [cards, sceneText, chapterTexts, scene.id]);
  const suspects = useMemo(
    () => nameSuspects({ [scene.id]: sceneText }, everyName(cards), ignoredNames(project)),
    [cards, sceneText, scene.id, project],
  );
  const repeats = useMemo(() => sceneRepetitions(doc, repeatWindow), [doc, repeatWindow]);
  const language = bookLanguage(project.fields);
  const prose = useMemo(() => {
    const narration = narrationOf(project.fields);
    const others = othersThan(project, scene.id, cards);
    return [
      ...proseNotes(sceneText, language),
      ...narrationNotes(sceneText, language, narration, others),
    ];
  }, [sceneText, language, project, scene.id, cards]);
  return {
    inChapter,
    suspects,
    repeats,
    prose: [...prose, ...useSplitCompounds(sceneText, language)],
    ignored: ignoredNames(project),
  };
}
