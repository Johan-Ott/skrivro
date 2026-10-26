import { useState } from "react";
import {
  contentsGroups,
  contentsRows,
  inTimeOrder,
  movedInTime,
  type ContentsGroup,
  type ContentsRow,
} from "../../project/contents.js";
import { notesMatching, rowMatches } from "../../project/contentsFilter.js";
import { findNode } from "../../project/tree.js";
import type { Project } from "../useProject.js";
import { nodeLabel } from "../../project/treeLabels.js";
import { Row } from "./ContentsRowView.js";
import type { ContentsProps } from "./ContentsView.js";
import { SceneRows, useSceneDrag, type SceneDrag } from "./SceneRows.js";
import { t, formatNumber } from "../../i18n/i18n.js";

const timeOrderOf = (fields: Record<string, unknown>) => {
  const stored = fields["timeOrder"];
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
};

function useRowDrag(shown: ContentsRow[], onOrder: (order: string[]) => void) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  return {
    propsFor: (id: string) => ({
      draggable: true,
      onDragStart: () => setDraggedId(id),
      onDragOver: (event: { preventDefault: () => void }) => event.preventDefault(),
      onDrop: () => {
        if (draggedId && draggedId !== id) {
          const index = shown.findIndex((row) => row.id === id);
          onOrder(movedInTime(shown, draggedId, index));
        }
        setDraggedId(null);
      },
      onDragEnd: () => setDraggedId(null),
    }),
  };
}

function useFolds() {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  return { isOpen: (id: string) => open.has(id), toggle };
}

type Folds = ReturnType<typeof useFolds>;

type ListParts = ContentsProps & {
  sceneDrag: SceneDrag;
  folds: Folds;
  isShown: (row: ContentsRow) => boolean;
};

// A chapter's row, and its scenes' rows under it once it is unfolded.
function ChapterRows(props: ListParts & { row: ContentsRow; dragProps: object }) {
  const { row, folds } = props;
  const isOpen = folds.isOpen(row.id);
  const fold = row.number === null ? undefined : { isOpen, onToggle: () => folds.toggle(row.id) };
  return (
    <>
      <Row
        {...props}
        pages={props.pageMap?.chapterPages.get(row.id) ?? null}
        isDimmed={!props.isShown(row)}
        fold={fold}
      />
      {isOpen && <SceneRows {...props} chapterId={row.id} drag={props.sceneDrag} />}
    </>
  );
}

// "Kapitel 1–4 · 25 502 ord", shown while the part is folded away.
function partSummary(rows: ContentsRow[]) {
  const numbers = rows.flatMap((row) => (row.number === null ? [] : [row.number]));
  const words = formatNumber(rows.reduce((sum, row) => sum + row.words, 0));
  if (numbers.length === 0) return t("{count} ord", { count: words });
  const span = `${Math.min(...numbers)}–${Math.max(...numbers)}`;
  return t("Kapitel {span} · {count} ord", { span, count: words });
}

// "Del I · Vintern", as the tree names it.
function partLabel({ project }: ContentsProps, id: string) {
  const node = findNode(project.tree, id)?.node;
  return node ? nodeLabel(node, project.tree, project.summaries) : "";
}

// A part's heading folds its chapters away, so a long book can be read part by part.
function PartRows(props: ListParts & { group: ContentsGroup }) {
  const { group, folds } = props;
  const part = group.part;
  const isFolded = part !== null && folds.isOpen(part.id);
  return (
    <>
      {part && (
        <button
          className="contents-part"
          aria-expanded={!isFolded}
          onClick={() => folds.toggle(part.id)}
        >
          <span className="contents-part-title">{partLabel(props, part.id)}</span>
          {isFolded && <span className="contents-part-summary">{partSummary(group.rows)}</span>}
        </button>
      )}
      {!isFolded &&
        group.rows.map((row) => (
          <ChapterRows
            key={row.id}
            {...props}
            row={row}
            dragProps={props.sceneDrag.forChapter(row.id)}
          />
        ))}
    </>
  );
}

/** The notes the filter holds too: a label on a note is found here as on a chapter. */
const MatchingNotes = (props: {
  notes: { id: string; title: string }[];
  onOpen: (id: string) => void;
}) =>
  props.notes.length > 0 && (
    <div className="contents-notes">
      <span className="field-label">{t("Anteckningar")}</span>
      {props.notes.map((note) => (
        <button key={note.id} className="contents-note" onClick={() => props.onOpen(note.id)}>
          {note.title}
        </button>
      ))}
    </div>
  );

// The short columns' names, once over the chapters, in the rows' own grid.
const ColumnNames = () => (
  <div className="contents-columns" aria-hidden="true">
    <span />
    <span />
    <span>{t("Vems ögon")}</span>
    <span>{t("När")}</span>
    <span>{t("Ord")}</span>
  </div>
);

// What the filter holds: chapters by their words, and notes by name, other name and label.
function matches(project: Project, found: ContentsProps["notes"], query: string) {
  const sources = { tree: project.tree, fields: project.fields, ...found };
  return {
    isShown: (row: ContentsRow) => rowMatches(sources, row, query),
    notes: notesMatching(sources, project.summaries, query),
  };
}

/** The chapters, by part in reading order, or as one list in the order of time. */
export function ContentsList(props: ContentsProps & { isTimeOrder: boolean; query: string }) {
  const { project, isTimeOrder, query } = props;
  const { isShown, notes } = matches(project, props.notes, query);
  const rows = contentsRows(project.tree, project.summaries);
  const timeOrdered = inTimeOrder(rows, timeOrderOf(project.fields));
  const drag = useRowDrag(timeOrdered, (timeOrder) => props.onSaveFields({ timeOrder }));
  const parts = {
    ...props,
    sceneDrag: useSceneDrag(project, props.onChangeTree),
    folds: useFolds(),
    isShown,
  };
  if (rows.length === 0) return <p className="contents-empty">{t("Inga kapitel än.")}</p>;
  return (
    <div className="contents-list">
      {query && !rows.some(isShown) && notes.length === 0 && (
        <p className="contents-empty">{t("Inget kapitel har ”{query}”.", { query })}</p>
      )}
      <MatchingNotes notes={notes} onOpen={props.onOpenScene} />
      <ColumnNames />
      {isTimeOrder
        ? timeOrdered.map((row) => (
            <ChapterRows key={row.id} {...parts} row={row} dragProps={drag.propsFor(row.id)} />
          ))
        : contentsGroups(project.tree, project.summaries).map((group, index) => (
            <PartRows key={group.part?.id ?? `loose-${index}`} {...parts} group={group} />
          ))}
    </div>
  );
}
