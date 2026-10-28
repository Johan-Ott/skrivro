import { createStore } from "@llkit/store.js";
import { pictureUrlIn } from "./pictureFiles.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { manuscriptSceneIds } from "../project/tree.js";
import type { Project } from "./useProject.js";
import { useEditorView } from "../editor/useEditorView.js";
import type { SaveStatus } from "@llkit/storage/autosave.js";
import { errorLog } from "@llkit/errorLog.js";
import { platform } from "./platform.js";
import { useSavedOnLeaving } from "./useSavedOnLeaving.js";
import { placeIn, showResume, useRememberPlace } from "./resume/lastPlace.js";
import {
  closeScene,
  createSceneSession,
  openScene,
  sceneEdited,
  type DiskConflict,
  type OpenScene,
  type SceneSession,
  type SceneSessionHooks,
} from "./sceneSession.js";
import { flushOrKeep } from "./keepText.js";

const logged = (status: SaveStatus) => {
  if (status.kind === "failed") errorLog.record(`Scenen kunde inte sparas: ${status.reason}`);
  return status;
};

/** The logic lives in sceneSession.ts; this holds the React state. */
// The editor is writable, and shows the book's pictures, exactly while a scene is open.
function openedModes(
  modes: ReturnType<typeof useEditorView>["modes"],
  opened: OpenScene | null,
  session: SceneSession | null,
) {
  modes.current.isEditable = opened !== null;
  modes.current.isNote = () => opened !== null && (session?.isNote(opened.dir, opened.id) ?? false);
  modes.current.pictureUrl = opened ? (name) => pictureUrlIn(opened.dir, name) : async () => null;
}

export function useSceneSession() {
  const [scene, setScene] = useState<OpenScene | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const [conflict, setConflict] = useState<DiskConflict | null>(null);
  const sessionRef = useRef<SceneSession | null>(null);
  const savedRef = useRef<SceneSessionHooks["onSaved"]>(undefined);
  const editor = useEditorView((doc) => {
    if (sessionRef.current) sceneEdited(sessionRef.current, doc);
  });
  const { load, viewRef, modes } = editor;

  const session = useMemo(
    () =>
      createSceneSession(platform.fileSystem, {
        editor: { load, currentDoc: () => viewRef.current?.state.doc ?? null },
        // Set before the text loads, so the editor is writable exactly when a scene is open.
        onScene: (opened) => {
          openedModes(modes, opened, sessionRef.current);
          setScene(opened && { ...opened });
        },
        onConflict: setConflict,
        onSaveStatus: (status) => setSaveStatus(logged(status)),
        onSaved: (scene, before, after) => savedRef.current?.(scene, before, after),
      }),
    [load, viewRef, modes],
  );
  sessionRef.current = session;
  const keepWhenLeaving = useCallback(() => flushOrKeep(session), [session]);
  useSavedOnLeaving(keepWhenLeaving);

  useRememberPlace({ scene, editor });
  return { session, scene, saveStatus, conflict, editor, savedRef };
}

// A scene still in the cloud has no text here, so it cannot open.
export function openIfOnDisk(session: SceneSession, project: Project, id: string) {
  if (project.scenes.includes(id)) void openScene(session, project.dir, id);
}

// A note from the book's series belongs to this book too, so it stays open.
const isTextOf = (
  openDir: string | undefined,
  bookDir: string | undefined,
  seriesDir: string | null,
) => openDir !== undefined && (openDir === bookDir || openDir === seriesDir);

function startOf(project: Project) {
  const onDisk = manuscriptSceneIds(project.tree).filter((id) => project.scenes.includes(id));
  const remembered = placeIn(project.dir);
  // A note is a place too: the book opens on it if that is where the writer was.
  const place = remembered && project.scenes.includes(remembered.sceneId) ? remembered : null;
  return { firstScene: place?.sceneId ?? onDisk[0] ?? project.scenes[0], place };
}

/** True while a book just opened waits for its first text, which the writing area waits for too. */
export const arrivingText = createStore(false);

// A new project never keeps the previous project's scene; crash text is settled first. A book
// opens where the writer last wrote, with the opening picture, and otherwise at its start.
export function useOpenFirstScene(
  project: Project | null,
  session: SceneSession,
  focusEditor: () => void,
  seriesDir: string | null,
) {
  useEffect(() => {
    const isOwnText = isTextOf(session.scene?.dir, project?.dir, seriesDir);
    if (!project || isOwnText || project.recoverable.length > 0) return;
    const { firstScene, place } = startOf(project);
    if (!firstScene) return void closeScene(session);
    arrivingText.set(true);
    // Shown anyway after a while, so a scene slow to read never leaves the page blank.
    const shown = setTimeout(() => arrivingText.set(false), 3000);
    // Du slutade här needs a sentence to show; a place without one just opens there.
    void openScene(session, project.dir, firstScene)
      .then(() => (place?.before?.trim() ? showResume(place) : focusEditor()))
      .finally(() => (clearTimeout(shown), arrivingText.set(false)));
  }, [project, session, focusEditor, seriesDir]);
}
