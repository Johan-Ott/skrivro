import { useState } from "react";
import { documentText } from "../../editor/documentText.js";
import type { useEditorView } from "../../editor/useEditorView.js";
import { recordFailure } from "@llkit/errorLog.js";
import { openScene, type OpenScene, type SceneSession } from "../sceneSession.js";
import type { Step } from "../useWritingMode.js";
import type { Project } from "../useProject.js";
import { useComments } from "./useComments.js";
import { useRevision } from "./useRevision.js";
import { useRounds } from "./useRounds.js";
import { useTypedSuggestions } from "./useTypedSuggestions.js";

type Parts = {
  project: Project | null;
  scene: OpenScene | null;
  session: SceneSession;
  editor: Editor;
  author: string;
  step: Step;
};

type Editor = ReturnType<typeof useEditorView>;

// Ends Förslagsläge: the suggestions are saved, and the scene shows its own text again.
async function stopSuggesting(session: SceneSession, editor: Editor) {
  if (!(await session.autosave.flush())) return false;
  session.isSuggesting = false;
  editor.modes.current.suggestedFrom = null;
  const scene = session.scene;
  return scene ? openScene(session, scene.dir, scene.id) : true;
}

// Förslagsläge: on, what is typed goes beside the scene; off, it shows as changes to accept.
function useSuggesting(session: SceneSession, editor: Editor, onDone: () => void) {
  const [isSuggesting, setSuggesting] = useState(false);
  const start = () => {
    const doc = editor.viewRef.current?.state.doc;
    editor.modes.current.suggestedFrom = doc ? documentText(doc).text : null;
    session.isSuggesting = true;
    setSuggesting(true);
  };
  const stop = async () => {
    if (!(await stopSuggesting(session, editor))) return;
    setSuggesting(false);
    onDone();
  };
  return { isSuggesting, start, stop: () => void stop().catch(recordFailure("Förslag")) };
}

/** What others say about the open scene: comments, and changes suggested or read back from Word;
 *  and the rounds with the editor the Word files came back in. */
export function useReviewParts(parts: Parts) {
  const revision = useRevision(parts);
  const suggesting = useSuggesting(parts.session, parts.editor, revision.reload);
  useTypedSuggestions(parts.editor, revision.typed, parts.step === "redigera");
  const rounds = useRounds(parts.project);
  return { comments: useComments(parts), revision, suggesting, rounds };
}
