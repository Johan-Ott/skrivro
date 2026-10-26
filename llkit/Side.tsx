import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { t } from "./i18n.js";
import { useShortcut } from "./keys.js";
import { createStore } from "./store.js";

// The side panel, the same in every view of an app: on the window's grey, left of what the view
// shows. The app puts one SideFrame round its screen and one SideToggle in its top bar; each view
// puts what goes in the side in <Side>, which may be nothing, and the button then rests. Each view's
// side is folded away or out on its own, with the button or Ctrl+\; folded, it floats out while the
// pointer rests on the button. On a phone an open side fills the screen, and picking in it folds it
// (foldOnPhone). `view` is the app's name for what shows, as "tavlan" or "chatt".

const slot = createStore<HTMLElement | null>(null);
const sideSlot = (element: HTMLElement | null) => {
  slot.set(element);
};
const KEY = "llkit.sidor";
const isNarrow = () => window.matchMedia("(max-width: 700px)").matches;

// Which sides are folded, by view; a phone starts afresh each time.
function readSides(): Record<string, boolean> {
  if (isNarrow()) return {};
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, boolean>) ?? {};
  } catch {
    return {};
  }
}

const sides = createStore(readSides());

/** Whether `view`'s side is out: at first all are, but on a phone only `home`'s. */
export const useSideOpen = (view: string, home = "") =>
  sides.use()[view] ?? (!isNarrow() || view === home);

export function setSideOpen(view: string, isOpen: boolean) {
  const next = { ...sides.get(), [view]: isOpen };
  sides.set(next);
  if (isNarrow()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Without storage every side is out next time, which is fine.
  }
}

/** On a phone, where an open side fills the screen: fold it, to show what was picked in it. */
export const foldOnPhone = (view: string) => {
  if (isNarrow()) setSideOpen(view, false);
};

/** The side beside the app's screen (`children`), out or folded for `view`. */
export function SideFrame({
  view,
  home,
  children,
}: {
  view: string;
  /** The view whose side is out on a phone at first, its home. */
  home?: string;
  children: ReactNode;
}) {
  const isOpen = useSideOpen(view, home);
  return (
    <div className={isOpen ? "side-frame" : "side-frame folded"}>
      <aside className="side" ref={sideSlot} aria-label={t("Sidopanel")} data-scrolls />
      {children}
    </div>
  );
}

/** The top bar's button that folds `view`'s side away or out; Ctrl+\ does the same. */
export function SideToggle({ view, home }: { view: string; home?: string }) {
  const isOpen = useSideOpen(view, home);
  const flip = () => setSideOpen(view, !isOpen);
  useShortcut("\\", flip);
  return (
    <button
      className="side-toggle"
      aria-label={t("Visa eller dölj sidopanelen")}
      aria-pressed={isOpen}
      title={`${t("Visa eller dölj sidopanelen")} (Ctrl+\\)`}
      onClick={flip}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
        <path d="M9.5 5v14" />
      </svg>
    </button>
  );
}

// The side is drawn in SideFrame's aside, but its events still pass up through the view's own
// (React's portals): a canvas under the view must not take a double-click or a wheel in it.
const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

/** What the view open puts in the side. */
export function Side({ children }: { children: ReactNode }) {
  const element = slot.use();
  if (!element) return null;
  return createPortal(
    <div
      className="side-body"
      onPointerDown={stop}
      onDoubleClick={stop}
      onContextMenu={stop}
      onWheel={stop}
    >
      {children}
    </div>,
    element,
  );
}
