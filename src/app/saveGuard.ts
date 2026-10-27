import { createCloseGuard } from "./closeGuard.js";
import { platform } from "./platform.js";

/** The one guard of everything that is written a moment after it is changed. */
export const saveGuard = createCloseGuard((isSafeToClose) => platform.guardClose(isSafeToClose));

/** Everything waiting to be written is written now, as before another text is opened. */
export const flushAllSaves = () => saveGuard.flushAll();

// The Android app calls this from onPause (MainActivity.kt), when the page may not get to say it
// was hidden before the system ends the app.
if (typeof window !== "undefined") {
  (window as { skrivroSavePending?: () => void }).skrivroSavePending = () => void flushAllSaves();
}
