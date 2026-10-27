import { useEffect, useRef, useState } from "react";
import { placeInRoom, rubOut } from "../../project/stickyNoteGeometry.js";
import { NOTE_COLORS, type StickyNote } from "../../project/stickyNotes.js";
import { GripIcon, PenIcon, PlusIcon } from "../shell/icons.js";
import { HideIcon, TrashIcon } from "./NoteIcons.js";
import { EraserIcon } from "./EraserIcon.js";
import { NoteDrawing, type NoteTool } from "./NoteDrawing.js";
import { useKeptSize, useNoteDrag, useRoomSize } from "./stickyNoteHooks.js";
import type { StickyNotesState } from "./useStickyNotes.js";
import { t } from "../../i18n/i18n.js";

// Lappar over the text, each with text, pen and eraser, kept inside the window while keeping
// its own place for when the window grows. Removing one with something on it asks first.

type Props = { note: StickyNote; state: StickyNotesState };

const COLOR_NAMES: Record<StickyNote["color"], string> = {
  gul: t("Gul"),
  rosa: t("Rosa"),
  mint: t("Mint"),
  himmel: t("Himmelsblå"),
  lavendel: t("Lavendel"),
};

function ColorDots({ note, state }: Props) {
  return (
    <>
      {NOTE_COLORS.map((color) => (
        <button
          key={color}
          className={`note-color ${color}`}
          aria-label={COLOR_NAMES[color]}
          aria-pressed={note.color === color}
          onClick={() => state.change(note.id, { color })}
        />
      ))}
    </>
  );
}

// Göm puts a note away until Lappar opens again; the bin throws it away at once, and Ångra
// brings it back.
function NoteEnds(props: Props & Ends) {
  const { note, state } = props;
  const remove = () => {
    state.remove(note.id);
    props.onRemoved(note);
  };
  return (
    <>
      <button className="note-tool" aria-label={t("Släng lappen")} onClick={remove}>
        <TrashIcon />
      </button>
      <button
        className="note-tool"
        aria-label={t("Göm lappen")}
        onClick={() => props.onHide(note.id)}
      >
        <HideIcon />
      </button>
    </>
  );
}

type Ends = { onHide: (id: string) => void; onRemoved: (note: StickyNote) => void };

type Box = { left: number; top: number; width: number; height: number };

function ToolButton(props: {
  tool: NoteTool;
  chosen: NoteTool | null;
  onChoose: (tool: NoteTool | null) => void;
}) {
  const isChosen = props.chosen === props.tool;
  return (
    <button
      className={isChosen ? "note-tool chosen" : "note-tool"}
      aria-label={props.tool === "pen" ? t("Rita") : t("Sudda")}
      aria-pressed={isChosen}
      onClick={() => props.onChoose(isChosen ? null : props.tool)}
    >
      {props.tool === "pen" ? <PenIcon /> : <EraserIcon />}
    </button>
  );
}

function NoteHead(
  props: Props &
    Ends & { shown: Box; tool: NoteTool | null; onTool: (tool: NoteTool | null) => void },
) {
  const { note, state } = props;
  const addNext = () =>
    state.add({ left: props.shown.left + 24, top: props.shown.top + 24 }, note.color);
  const drag = useNoteDrag(note, props.shown, state);
  return (
    <header className="note-head" onPointerDown={drag}>
      <GripIcon />
      <ColorDots note={note} state={state} />
      <ToolButton tool="pen" chosen={props.tool} onChoose={props.onTool} />
      <ToolButton tool="eraser" chosen={props.tool} onChoose={props.onTool} />
      <button className="note-tool" aria-label={t("Ny lapp")} onClick={addNext}>
        <PlusIcon />
      </button>
      <NoteEnds {...props} />
    </header>
  );
}

function NoteBody(props: Props & { shown: Box; tool: NoteTool | null }) {
  const { note, state } = props;
  const erase = (point: [number, number]) =>
    state.change(note.id, { strokes: rubOut(note.strokes, point) });
  return (
    <div className="note-body">
      <textarea
        value={note.text}
        aria-label={t("Lappens text")}
        placeholder={t("Skriv eller rita…")}
        onChange={(event) => state.change(note.id, { text: event.target.value })}
      />
      <NoteDrawing
        strokes={note.strokes}
        tool={props.tool}
        size={`${props.shown.width}x${props.shown.height}`}
        onStroke={(stroke) => state.change(note.id, { strokes: [...note.strokes, stroke] })}
        onErase={erase}
      />
    </div>
  );
}

function StickyNoteCard({ note, state, ...ends }: Props & Ends) {
  const card = useRef<HTMLElement>(null);
  const [tool, setTool] = useState<NoteTool | null>(null);
  const shown = placeInRoom(note, useRoomSize(card));
  useKeptSize(card, note, shown, state);
  return (
    <section
      ref={card}
      className={`sticky-note ${note.color}`}
      style={shown}
      aria-label={t("Lapp")}
    >
      <NoteHead {...{ note, state, shown, tool, ...ends }} onTool={setTool} />
      <NoteBody note={note} state={state} shown={shown} tool={tool} />
    </section>
  );
}

const UNDO_MS = 6000;

// A thrown note can be had back for a moment.
function UndoRemove(props: { state: StickyNotesState; removed: StickyNote; onDone: () => void }) {
  const { onDone } = props;
  useEffect(() => {
    const timer = setTimeout(onDone, UNDO_MS);
    return () => clearTimeout(timer);
  }, [props.removed, onDone]);
  const undo = () => {
    props.state.restore(props.removed);
    onDone();
  };
  return (
    <div className="note-undo" role="status">
      {t("Lappen slängdes.")}
      <button className="link-button" onClick={undo}>
        {t("Ångra")}
      </button>
    </div>
  );
}

/** The book's lappar over the text; opened with none, it starts the first. A hidden one is back
 * the next time Lappar opens. The lapp that is open in the text is not shown here as well. */
export function StickyNotesLayer({ state }: { state: StickyNotesState }) {
  const { notes, openId } = state;
  const [hidden, setHidden] = useState<string[]>([]);
  const [removed, setRemoved] = useState<StickyNote | null>(null);
  const hasStarted = useRef(false);
  useEffect(() => {
    if (notes === null || hasStarted.current) return;
    hasStarted.current = true;
    // The first at the top right, clear of the tree and of where the text begins.
    if (notes.length === 0) state.add({ left: Math.max(24, window.innerWidth - 260), top: 64 });
  }, [notes, state]);
  return (
    <>
      {(notes ?? [])
        .filter((note) => !hidden.includes(note.id) && note.id !== openId)
        .map((note) => (
          <StickyNoteCard
            key={note.id}
            note={note}
            state={state}
            onHide={(id) => setHidden([...hidden, id])}
            onRemoved={setRemoved}
          />
        ))}
      {removed && <UndoRemove state={state} removed={removed} onDone={() => setRemoved(null)} />}
    </>
  );
}
