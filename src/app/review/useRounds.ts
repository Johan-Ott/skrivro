import { useEffect, useState } from "react";
import { recordFailure } from "@llkit/errorLog.js";
import { readRounds, writeRounds, type Round } from "../../project/rounds.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";

/** A round's letter as shown, with the round's number counted from 1. */
export type ShownRound = { round: Round; number: number };

// The project's rounds as on disk, read again on `reload`, and saved as soon as they change.
function useStoredRounds(dir: string | null) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [reads, setReads] = useState(0);
  useEffect(() => {
    let isLive = true;
    const read = dir ? readRounds(platform.fileSystem, dir) : Promise.resolve([]);
    void read.then((found) => isLive && setRounds(found)).catch(recordFailure("Omgångar"));
    return () => void (isLive = false);
  }, [dir, reads]);
  const save = (next: Round[]) => {
    setRounds(next);
    if (dir) void writeRounds(platform.fileSystem, dir, next).catch(recordFailure("Omgångar"));
  };
  return { rounds, save, reload: () => setReads((count) => count + 1) };
}

// The round opened under Omgångar, or else the latest while it is unread.
function shownOf(rounds: Round[], opened: number | null): ShownRound | null {
  const latest = rounds.at(-1);
  const index = opened ?? (latest && !latest.isRead ? rounds.length - 1 : null);
  const round = index === null ? undefined : rounds[index];
  return round && index !== null ? { round, number: index + 1 } : null;
}

/** The rounds with the editor, and the one whose letter is shown: the one opened under
 *  Omgångar, or else the latest until Börja genomgången is pressed. */
export function useRounds(project: Project | null) {
  const dir = project?.dir ?? null;
  const { rounds, save, reload } = useStoredRounds(dir);
  const [opened, setOpened] = useState<number | null>(null);
  useEffect(() => setOpened(null), [dir]);
  const latest = rounds.at(-1);
  const change = (fields: Partial<Round>) =>
    latest && save([...rounds.slice(0, -1), { ...latest, ...fields }]);
  return {
    rounds,
    shown: shownOf(rounds, opened),
    open: setOpened,
    finish: () => (setOpened(null), change({ isRead: true })),
    saveAnswer: (answer: string) => change({ answer }),
    reload: () => (setOpened(null), reload()),
  };
}
