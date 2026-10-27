import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { createAutosave } from "@llkit/storage/autosave.js";
import { readAll, readIfThere } from "@llkit/storage/fileSystem.js";
import { recordFailure } from "@llkit/errorLog.js";
import { STICKY_ID } from "../../project/sorts.js";
import { createLapp } from "../createLapp.js";
import {
  readStickyNote,
  stickyNoteFileText,
  stickyNoteOnDisk,
  type StickyNote,
} from "../../project/stickyNotes.js";
import { moveToTrash, putBack, sceneIdsIn } from "../../project/tree.js";
import { scenePath } from "../../storage/sceneId.js";
import type { AppState } from "../App.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import { useSavedOnLeaving } from "../useSavedOnLeaving.js";

const SAVE_DELAY = 600;

type Autosave = ReturnType<typeof createAutosave>;
type Saves = { forNote: (id: string) => Autosave; flushAll: () => Promise<boolean> };

// A lapp is a note file, written a moment after each change: one file and one autosave each.
function useAutosaves(dir: string): Saves {
  const saves = useRef(new Map<string, Autosave>());
  const forNote = useCallback(
    (id: string) => {
      const known = saves.current.get(id);
      if (known) return known;
      const autosave = createAutosave({
        saveDelayMs: SAVE_DELAY,
        onStatus: () => undefined,
        write: (text) =>
          writeLapp(dir, id, text).catch((error: unknown) => {
            recordFailure("Lappar")(error);
            throw error;
          }),
      });
      saves.current.set(id, autosave);
      return autosave;
    },
    [dir],
  );
  const flushAll = useCallback(async () => {
    const results = await Promise.all([...saves.current.values()].map((save) => save.flush()));
    return results.every(Boolean);
  }, []);
  return useMemo(() => ({ forNote, flushAll }), [forNote, flushAll]);
}

// Written over what the file holds, so what the note got besides the lapp's own fields stays.
async function writeLapp(dir: string, id: string, text: string) {
  const path = scenePath(dir, id);
  const onDisk = await readIfThere(platform.fileSystem, path);
  await writeAtomic(platform.fileSystem, path, stickyNoteOnDisk(onDisk, text));
}

async function readLappar(dir: string, ids: string[], saves: Saves) {
  const texts = await readAll(
    platform.fileSystem,
    ids.map((id) => scenePath(dir, id)),
  );
  return ids.flatMap((id, index) => {
    const text = texts[index];
    if (typeof text !== "string") return [];
    saves.forNote(id).loaded(text);
    return [readStickyNote(id, text)];
  });
}

// A lapp already here keeps what the writer did to it, so a read never takes a change back; the
// one that was open in the text was written from there, so it is taken as it is on disk.
const merged = (now: StickyNote[] | null, read: StickyNote[], reread: string | null) =>
  read.map((note) =>
    note.id === reread ? note : (now?.find((each) => each.id === note.id) ?? note),
  );

function useLoaded(project: Project, saves: Saves, openId: string | null) {
  const [notes, setNotes] = useState<StickyNote[] | null>(null);
  const { dir, tree } = project;
  const key = sceneIdsIn(tree, STICKY_ID).join(",");
  const wasOpen = useRef<string | null>(null);
  useEffect(() => {
    let isCurrent = true;
    const reread = wasOpen.current;
    wasOpen.current = openId;
    void readLappar(dir, key === "" ? [] : key.split(","), saves).then((read) => {
      if (isCurrent) setNotes((now) => merged(now, read, reread));
    });
    return () => void (isCurrent = false);
  }, [dir, key, saves, openId]);
  return [notes, setNotes] as const;
}

type Place = { left: number; top: number };

interface Lappar {
  app: Pick<AppState, "updateTree">;
  project: Project;
  saves: Saves;
  shown: React.RefObject<StickyNote[]>;
  replace: (next: StickyNote[]) => void;
}

async function addLapp(lappar: Lappar, place: Place, color?: StickyNote["color"]) {
  const { project, app } = lappar;
  const book = { fileSystem: platform.fileSystem, ...project, updateTree: app.updateTree };
  const note = await createLapp(book, place, color);
  lappar.saves.forNote(note.id).loaded(stickyNoteFileText(note));
  lappar.replace([...lappar.shown.current, note]);
}

function changeLapp(lappar: Lappar, id: string, part: Partial<StickyNote>) {
  const note = lappar.shown.current.find((each) => each.id === id);
  if (!note) return;
  const next = { ...note, ...part };
  lappar.replace(lappar.shown.current.map((each) => (each.id === id ? next : each)));
  lappar.saves.forNote(id).changed(stickyNoteFileText(next));
}

// A thrown lapp goes to Papperskorg, so it can be had back there as well as by Ångra.
function removeLapp(lappar: Lappar, id: string) {
  lappar.replace(lappar.shown.current.filter((each) => each.id !== id));
  const toTrash = () => lappar.app.updateTree((tree) => moveToTrash(tree, id));
  void lappar.saves.forNote(id).flush().then(toTrash);
}

function restoreLapp(lappar: Lappar, note: StickyNote) {
  lappar.replace([...lappar.shown.current, note]);
  void lappar.app.updateTree((tree) => putBack(tree, note.id));
}

/** The book's lappar, which are notes in the sort Lappar. `openId` is the note open in the text:
 * it is written from there, so it is not shown here as well. */
export function useStickyNotes(project: Project, app: Pick<AppState, "updateTree" | "scene">) {
  const openId = app.scene?.id ?? null;
  const saves = useAutosaves(project.dir);
  const [notes, setNotes] = useLoaded(project, saves, openId);
  const shown = useRef<StickyNote[]>([]);
  shown.current = notes ?? [];
  useSavedOnLeaving(saves.flushAll);
  useEffect(() => () => void saves.flushAll(), [saves]);
  const replace = (next: StickyNote[]) => {
    shown.current = next;
    setNotes(next);
  };
  const lappar = { app, project, saves, shown, replace };
  return {
    notes,
    openId,
    change: (id: string, part: Partial<StickyNote>) => changeLapp(lappar, id, part),
    add: (place: Place, color?: StickyNote["color"]) => void addLapp(lappar, place, color),
    remove: (id: string) => removeLapp(lappar, id),
    restore: (note: StickyNote) => restoreLapp(lappar, note),
  };
}

export type StickyNotesState = ReturnType<typeof useStickyNotes>;
