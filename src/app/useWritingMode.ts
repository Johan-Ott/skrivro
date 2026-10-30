import { useBeside } from "./beside/BesidePane.js";
import { useCallback, useState } from "react";
import { useSettingsDialog } from "./settings/SettingsDialog.js";
import { useGoKeys, useShortcut } from "@llkit/keys.js";
import { useCommandKey } from "./shortcuts.js";
import { useWritingSettings } from "./useWritingSettings.js";
import { usePhone } from "./phone/usePhone.js";
import { useShown } from "./blocks/column.js";
import { showPanel } from "./blocks/layout.js";
import { t } from "../i18n/i18n.js";

/** Skriv: the open text, in the step Skriv or Redigera. Innehåll: the book. Läs: a chapter or the
 * whole book. Publicera: the export. Synk: what the sync brought, side by side. */
export type View = "skriv" | "innehall" | "las" | "publicera" | "synk";

/** The three steps at the top, in the order a book is made. Skriv and Redigera show the same text;
 * Redigera adds the red markings, the comments and Granska. */
export type Step = "skriv" | "redigera" | "publicera";

/** Where Gå till goes: a view, or Redigera. */
export const VIEWS: [View | Step, string, string][] = [
  ["skriv", t("Skriv"), "G S"],
  ["redigera", t("Redigera"), "G R"],
  ["innehall", t("Innehåll"), "G I"],
  ["publicera", t("Publicera"), "G P"],
];

function useSearchMode() {
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [searchSeed, setSearchSeed] = useState("");
  const openSearchWith = useCallback((text: string) => {
    setSearchSeed(text);
    setSearchOpen(true);
  }, []);
  return { isSearchOpen, setSearchOpen, searchSeed, openSearchWith };
}

// On the computer Granska is open while it is in sight, docked or loose; opening it unfolds it.
// On a phone it is a screen of its own. The count is null when the open text has no review.
function useReviewState() {
  const isPhone = usePhone();
  const [isPhoneOpen, setPhoneOpen] = useState(false);
  const isBeside = useShown("granska");
  const isReviewOpen = isPhone ? isPhoneOpen : isBeside;
  const setReviewOpen = useCallback(
    (isOpen: boolean) => {
      if (isPhone) setPhoneOpen(isOpen);
      else if (isOpen) showPanel("granska");
    },
    [isPhone],
  );
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const review = { isOpen: isReviewOpen, count: reviewCount };
  return { review, isReviewOpen, setReviewOpen, setReviewCount };
}

function useReading(setView: (view: View) => void) {
  const [readChapterId, setReadChapterId] = useState<string | null>(null);
  const read = useCallback(
    (chapterId: string | null) => {
      setReadChapterId(chapterId);
      setView("las");
    },
    [setView],
  );
  return { readChapterId, read };
}

// The view and the step. The text keeps its step while the writer looks at the book or reads, and
// comes back in it. In Redigera what waits stands in the margin, and Granska in the right column.
function useSteps() {
  const [view, setView] = useState<View>("skriv");
  const [textStep, setTextStep] = useState<"skriv" | "redigera">("skriv");
  const isPhone = usePhone();
  const goTo = useCallback((to: View | Step) => {
    if (to === "skriv" || to === "redigera") setTextStep(to);
    setView(to === "redigera" ? "skriv" : to);
  }, []);
  useGoKeys((letter) => {
    const match = VIEWS.find(([, , keys]) => keys.toLowerCase().endsWith(letter));
    if (match) goTo(match[0]);
    return match !== undefined;
  });
  const step: Step = view === "publicera" ? "publicera" : textStep;
  // A phone has no Redigera yet, so its text shows everything, as before.
  return { view, setView, step, goTo, showsFindings: textStep === "redigera" || isPhone };
}

// Under this width the sidebar floats over the card.
const NARROW = 960;

// In a narrow window the sidebar starts hidden.
function useSidebar() {
  const [isSidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= NARROW);
  const toggleSidebar = useCallback(() => setSidebarOpen((current) => !current), []);
  useCommandKey("sidebar", toggleSidebar);
  useShortcut("\\", toggleSidebar);
  return { isSidebarOpen, setSidebarOpen, toggleSidebar };
}

export function useWritingMode() {
  const { settings, update } = useWritingSettings();
  const [isFocusMode, setFocusMode] = useState(false);
  const onToggleFocus = useCallback(() => setFocusMode((current) => !current), []);
  const settingsDialog = useSettingsDialog();
  const reviewState = useReviewState();
  const steps = useSteps();
  return {
    settingsDialog,
    settings,
    onChangeSettings: update,
    isFocusMode,
    onToggleFocus,
    ...steps,
    ...useReading(steps.setView),
    ...reviewState,
    ...useSearchMode(),
    ...useSidebar(),
    ...useBeside(),
  };
}
