import { useCallback, useEffect, useRef, useState } from "react";
import type { View } from "../useWritingMode.js";

export type PhoneScreen =
  | { kind: "book" }
  | { kind: "text"; sceneId: string }
  /** Innehåll, Läs, Publicera or Från synken, as the writing mode's view says. */
  | { kind: "view"; view: View };

// A screen opened anew starts at its top; going back keeps the place it was left at.
function toTop() {
  window.scrollTo(0, 0);
  document.querySelectorAll(".phone-app .page, .phone-view").forEach((scroller) => {
    scroller.scrollTop = 0;
  });
}

// What Android's back button closes before anything else: a menu or a dialog.
const LAYERS = "[role=menu], [role=dialog]";
const openLayers = () => document.querySelectorAll(LAYERS).length;

// A panel, or a screen within a screen, marks its way out for back to take; the
// last one in sight is the one on top.
const innerBack = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-phone-back]"))
    .filter((element) => element.checkVisibility())
    .pop();

/** Android's back: closes what lies on top, else the screen before; false when there is none. */
function skrivroBack(depth: number) {
  const layers = openLayers();
  const inner = innerBack();
  if (layers === 0 && inner) {
    inner.click();
    return true;
  }
  if (layers === 0) {
    if (depth <= 1) return false;
    window.history.back();
    return true;
  }
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  // A layer that does not close with Escape is closed by its own way out, or else back leaves the
  // screen.
  setTimeout(() => {
    if (openLayers() < layers) return;
    const way = innerBack();
    if (way) way.click();
    else if (depth > 1) window.history.back();
  }, 80);
  return true;
}

// Outside a book, on the shelf and in the first steps, back still closes what lies on top or goes
// one step back; with nothing left it leaves Skrivro, as Android expects.
type BackPage = { skrivroBack?: () => boolean };
const outsideBook = () => skrivroBack(1);
(window as BackPage).skrivroBack = outsideBook;

/** Each screen is a history entry, so Android's back button returns to the screen before. */
export function usePhoneNavigation() {
  const [stack, setStack] = useState<PhoneScreen[]>([{ kind: "book" }]);
  useEffect(() => {
    const onBack = () =>
      setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);
  const show = useCallback((screen: PhoneScreen) => {
    window.history.pushState({ skrivro: screen.kind }, "");
    setStack((current) => [...current, screen]);
    requestAnimationFrame(toTop);
  }, []);
  const back = useCallback(() => window.history.back(), []);
  useEffect(() => {
    const depth = stack.length;
    const page = window as BackPage;
    page.skrivroBack = () => skrivroBack(depth);
    return () => void (page.skrivroBack = outsideBook);
  }, [stack.length]);
  const screen = stack[stack.length - 1] ?? { kind: "book" };
  return { screen, depth: stack.length, show, back };
}

/** Every change of view on a screen is a step back can take, and back brings that view again. */
export function useViewsInHistory(
  view: View,
  setView: (view: View) => void,
  screen: PhoneScreen,
  show: (screen: PhoneScreen) => void,
) {
  useEffect(() => {
    if (screen.kind === "view") setView(screen.view);
    if (screen.kind === "text") setView("skriv");
  }, [screen, setView]);
  // Only a view that changed is a step; a screen that changed has set its own view.
  const shown = useRef(view);
  useEffect(() => {
    if (shown.current === view) return;
    shown.current = view;
    const isNew = screen.kind === "text" || (screen.kind === "view" && screen.view !== view);
    if (view !== "skriv" && isNew) show({ kind: "view", view });
  }, [view, screen, show]);
}
