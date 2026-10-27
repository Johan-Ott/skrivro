import { useCallback, useEffect, useRef, useState } from "react";
import { isTimeToSyncOnReturn } from "./syncOnReturn.js";
import { joinPath } from "@llkit/storage/fileSystem.js";
import { syncProject } from "../sync/driveSync.js";
import { STATE_FILE } from "../sync/syncState.js";
import { backupNow } from "./useAutoBackup.js";
import type { WriteGuard } from "../sync/localSide.js";
import { DriveError, googleDrive } from "../sync/googleDrive.js";
import type { AppPreferences } from "./appPreferences.js";
import { errorLog } from "@llkit/errorLog.js";
import { signIn, signOut } from "./googleAccount.js";
import { platform } from "./platform.js";
import type { PreferenceChange } from "./useStartup.js";
import { t } from "../i18n/i18n.js";

export type DriveStatus =
  | { kind: "off" }
  | { kind: "signingIn" }
  | { kind: "syncing" }
  | { kind: "done"; doneAt: number }
  | { kind: "failed"; message: string };

// A book syncs a moment after it opens and then every five minutes.
const EVERY = 5 * 60_000;
const AFTER_OPENING = 5_000;

const failure = (error: unknown): DriveStatus => ({
  kind: "failed",
  message:
    error instanceof DriveError && error.status === 401
      ? t("Logga in på Google igen")
      : String(error instanceof Error ? error.message : error),
});

// The first sync of a book that is already here may merge it with Drive's, so it is copied first.
async function backupBeforeFirstSync(dir: string) {
  const fileSystem = platform.fileSystem;
  if ((await fileSystem.modifiedAt(joinPath(dir, STATE_FILE))) !== null) return;
  if ((await fileSystem.modifiedAt(joinPath(dir, "project.json"))) === null) return;
  await backupNow([dir], t("Före första synken"));
}

async function syncFolders(dirs: string[], guard: WriteGuard) {
  const signIn = platform.googleSignIn;
  if (!signIn) return false;
  const drive = googleDrive(signIn.accessToken, signIn.fetch);
  let hasChanged = false;
  for (const dir of dirs) {
    await backupBeforeFirstSync(dir);
    const result = await syncProject(platform.fileSystem, drive, dir, { now: Date.now(), guard });
    hasChanged ||= result.downloaded.length + result.trashed.length > 0;
  }
  return hasChanged;
}

// One object, so turning the sync off when it already is changes nothing and renders nothing.
const OFF: DriveStatus = { kind: "off" };

/** What the sync needs from the open book: reading it again, and writing over its open scene. */
export interface SyncedBook {
  refresh: () => Promise<void>;
  guard: WriteGuard;
}

function useSyncRun(dirs: string[], { refresh, guard }: SyncedBook) {
  const [status, setStatus] = useState<DriveStatus>(OFF);
  const isRunning = useRef(false);
  const lastRunAt = useRef<number | null>(null);
  // "|" cannot appear in a path, so the folders make one stable key for the callback.
  const dirsKey = dirs.join("|");
  const syncNow = useCallback(async () => {
    if (!dirsKey || isRunning.current) return;
    isRunning.current = true;
    lastRunAt.current = Date.now();
    setStatus({ kind: "syncing" });
    try {
      const hasChanged = await syncFolders(dirsKey.split("|"), guard);
      setStatus({ kind: "done", doneAt: Date.now() });
      if (hasChanged) await refresh();
    } catch (error) {
      errorLog.record(`Synk: ${String(error)}`);
      setStatus(failure(error));
    } finally {
      isRunning.current = false;
    }
  }, [dirsKey, refresh, guard]);
  return { status, setStatus, syncNow, lastRunAt };
}

function useDriveConnection(
  updatePreferences: (change: PreferenceChange) => void,
  setStatus: (status: DriveStatus) => void,
) {
  const connect = async () => {
    setStatus({ kind: "signingIn" });
    await signIn(updatePreferences).catch((error: unknown) => setStatus(failure(error)));
  };
  const disconnect = () => signOut(updatePreferences);
  return { connect, disconnect };
}

// The sync runs soon after the book opens, every few minutes, and when the app comes back to the
// foreground, so the other device's text is here before more is written over it.
function useSyncSchedule(isOn: boolean, run: ReturnType<typeof useSyncRun>) {
  const { syncNow, setStatus, lastRunAt } = run;
  useEffect(() => {
    if (!isOn) return setStatus(OFF);
    // The book shows first; walking all its files at the same moment would hold it up.
    const first = setTimeout(() => void syncNow(), AFTER_OPENING);
    const timer = setInterval(() => void syncNow(), EVERY);
    const onReturn = () => {
      const isOnline = navigator.onLine !== false;
      if (!document.hidden && isOnline && isTimeToSyncOnReturn(lastRunAt.current, Date.now())) {
        void syncNow();
      }
    };
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [isOn, syncNow, setStatus, lastRunAt]);
}

export function useDriveSync(
  dirs: string[],
  preferences: AppPreferences,
  updatePreferences: (change: PreferenceChange) => void,
  book: SyncedBook,
) {
  const isAvailable = platform.googleSignIn !== undefined;
  const isOn = preferences.isDriveSyncOn && isAvailable;
  const run = useSyncRun(dirs, book);
  const { status, setStatus, syncNow } = run;
  useSyncSchedule(isOn, run);
  return {
    isAvailable,
    isOn,
    status,
    syncNow,
    ...useDriveConnection(updatePreferences, setStatus),
  };
}

export type DriveSync = ReturnType<typeof useDriveSync>;
