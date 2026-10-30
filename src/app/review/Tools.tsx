import { useEffect } from "react";
import { createStore } from "@llkit/store.js";
import type { AppState } from "../App.js";
import { usePhone } from "../phone/usePhone.js";
import { t } from "../../i18n/i18n.js";

export type Tool = "las" | "foresla" | "kommentera" | "anteckna";

/** Redigera's tool, as Figma's: Läs reads and selects, Föreslå types suggestions, Kommentera and
 *  Anteckna open a comment or a note on what is selected. */
export const tool = createStore<Tool>("las");

type ToolButton = { id: Tool; label: string; letter: string; paths: string[] };

const TOOLS: ToolButton[] = [
  { id: "las", label: t("Läs"), letter: "V", paths: ["M4 4l7 17 2.5-7.5L21 11z"] },
  {
    id: "foresla",
    label: t("Föreslå"),
    letter: "F",
    paths: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
  },
  {
    id: "kommentera",
    label: t("Kommentera"),
    letter: "K",
    paths: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  },
  {
    id: "anteckna",
    label: t("Anteckna"),
    letter: "A",
    paths: ["M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z", "M15 3v5h6"],
  },
];

const isInBox = (target: HTMLElement) => target.closest("input, textarea, select") !== null;

// A letter is a tool's unless it is typed: into a box, or into the text while Föreslå writes there.
const isTyping = (target: HTMLElement) =>
  isInBox(target) ||
  (target.isContentEditable && (tool.get() === "foresla" || !target.closest(".ProseMirror")));

const hasModifier = (event: KeyboardEvent) => event.ctrlKey || event.metaKey || event.altKey;

const toolOf = (key: string) => TOOLS.find((button) => button.letter === key.toUpperCase())?.id;

// Escape goes back to Läs from any tool, also from the text Föreslå writes in.
function onToolKey(event: KeyboardEvent) {
  const { target } = event;
  if (hasModifier(event) || !(target instanceof HTMLElement)) return;
  if (event.key === "Escape") {
    if (!isInBox(target)) tool.set("las");
    return;
  }
  const chosen = toolOf(event.key);
  if (!chosen || isTyping(target)) return;
  event.preventDefault();
  tool.set(chosen);
}

// With Kommentera or Anteckna, words selected with the mouse open their draft at once.
function useDraftOnSelect(app: AppState) {
  const { comments, editor } = app;
  useEffect(() => {
    const onMouseUp = (event: MouseEvent) => {
      const chosen = tool.get();
      const dom = editor.viewRef.current?.dom;
      if (chosen === "las" || chosen === "foresla" || !dom?.contains(event.target as Node)) return;
      // ProseMirror reads the new selection after this event.
      setTimeout(() => {
        if (editor.viewRef.current?.state.selection.empty !== false) return;
        if (chosen === "anteckna") comments.startNote();
        else comments.start();
      });
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [comments, editor]);
}

// Läs again once Redigera is left, so Skriv never comes back to a tool.
function useToolKeys() {
  useEffect(() => {
    window.addEventListener("keydown", onToolKey);
    return () => {
      window.removeEventListener("keydown", onToolKey);
      tool.set("las");
    };
  }, []);
}

const ToolButton = ({ button, isChosen }: { button: ToolButton; isChosen: boolean }) => (
  <button
    className="icon-button"
    aria-label={`${button.label} (${button.letter})`}
    aria-pressed={isChosen}
    title={`${button.label} (${button.letter})`}
    onClick={() => tool.set(button.id)}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      {button.paths.map((path) => (
        <path key={path} d={path} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  </button>
);

function ShownTools({ app }: { app: AppState }) {
  const chosen = tool.use();
  useToolKeys();
  useDraftOnSelect(app);
  return (
    <div
      className="tool-pill"
      role="toolbar"
      aria-label={t("Verktyg")}
      onMouseDown={(event) => event.preventDefault()}
    >
      {TOOLS.map((button) => (
        <ToolButton key={button.id} button={button} isChosen={chosen === button.id} />
      ))}
    </div>
  );
}

/** Redigera's tools in a pill at the foot of the text, each on its key. A phone has Granska. */
export const Tools = (props: { app: AppState }) => (usePhone() ? null : <ShownTools {...props} />);
