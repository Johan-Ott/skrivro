import { useCallback, useEffect, useRef, useState } from "react";
import {
  addWritten,
  dailyGoalOf,
  dayKey,
  readDeviceStatsOrSetAside,
  readStats,
  streak,
  wordsAdded,
  writeDeviceStats,
  type Stats,
} from "../project/stats.js";
import { recordFailure } from "@llkit/errorLog.js";
import { platform } from "./platform.js";
import { snapshotOnSave } from "../project/snapshots.js";
import { placeOf, rememberPlace } from "./resume/lastPlace.js";
import { recordText } from "./journey/todayTexts.js";
import type { useSceneSession } from "./useSceneSession.js";
import type { Project } from "./useProject.js";

export interface Today {
  words: number;
  goal: number | null;
  streak: number;
}

function todayOf(stats: Stats, project: Project | null): Today {
  const today = dayKey(Date.now());
  return {
    words: stats[today] ?? 0,
    goal: project ? dailyGoalOf(project.fields) : null,
    streak: streak(stats, today),
  };
}

// Made once at random and kept in localStorage.
export function thisDevice() {
  const key = "skrivro.device";
  try {
    const known = localStorage.getItem(key);
    if (known) return known;
    const made = crypto.randomUUID().slice(0, 8);
    localStorage.setItem(key, made);
    return made;
  } catch {
    return "enhet";
  }
}

async function addToThisDevice(dir: string, added: number) {
  const { fileSystem } = platform;
  const device = thisDevice();
  const own = await readDeviceStatsOrSetAside(fileSystem, dir, device);
  await writeDeviceStats(fileSystem, dir, device, addWritten(own, dayKey(Date.now()), added));
  return readStats(fileSystem, dir);
}

function crossesGoal(stats: Stats, added: number, goal: number | null) {
  const after = stats[dayKey(Date.now())] ?? 0;
  return goal !== null && after - added < goal && after >= goal;
}

/** `onWritten` hears every save that added words, and whether it reached the daily goal. */
export function useWritingStats(
  project: Project | null,
  onWritten: (words: number, isGoalReached: boolean) => void,
) {
  const dir = project?.dir ?? null;
  const goal = project ? dailyGoalOf(project.fields) : null;
  const heard = useRef(onWritten);
  heard.current = onWritten;
  const [stats, setStats] = useState<Stats>({});
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    setStats({});
    if (dir) void readStats(platform.fileSystem, dir).then(setStats);
  }, [dir]);
  // A failed write only loses a count, never text, so it is not shown as a save error.
  const recordSave = useCallback(
    (sceneDir: string, before: string, after: string) => {
      const added = wordsAdded(before, after);
      if (added === 0) return;
      queue.current = queue.current
        .then(async () => {
          const stats = await addToThisDevice(sceneDir, added);
          if (sceneDir === dir) setStats(stats);
          heard.current(added, crossesGoal(stats, added, goal));
        })
        .catch(recordFailure("Ord per dag kunde inte sparas"));
    },
    [dir, goal],
  );
  return { stats, today: todayOf(stats, project), recordSave };
}

/** Each save is counted, remembered as where the writer is, and kept as an automatic version. */
export function listenToSaves(
  {
    savedRef,
    editor,
    session,
  }: Pick<ReturnType<typeof useSceneSession>, "savedRef" | "editor" | "session">,
  recordSave: (dir: string, before: string, after: string) => void,
  isAutoSnapshotOn: boolean,
) {
  savedRef.current = (scene, before, after) => {
    // Only the manuscript is counted: what is written in a note is not the book growing.
    if (!session.isNote(scene.dir, scene.id)) {
      recordSave(scene.dir, before, after);
      recordText(`${scene.dir}/${scene.id}`, after, wordsAdded(before, after));
    }
    const state = editor.viewRef.current?.state;
    if (state) rememberPlace(scene.dir, placeOf(scene.id, state));
    if (!isAutoSnapshotOn) return;
    // A missed automatic version loses no text, so it is not shown as an error.
    void snapshotOnSave(platform.fileSystem, scene, { before, after }, Date.now()).catch(
      () => undefined,
    );
  };
}
