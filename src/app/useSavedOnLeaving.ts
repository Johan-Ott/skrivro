import { useEffect } from "react";
import { saveGuard } from "./saveGuard.js";

// Closing asks to save first; a phone may close an app in the background without asking, so the
// text is saved as soon as it leaves the screen.
export function useSavedOnLeaving(flush: () => Promise<boolean>) {
  useEffect(() => saveGuard(flush), [flush]);
  useEffect(() => {
    const onLeave = () => void flush();
    const onHide = () => document.hidden && onLeave();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onLeave);
    };
  }, [flush]);
}
