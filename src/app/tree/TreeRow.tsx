import { useSwipe } from "@llkit/touch.js";
import { useState, type DragEvent, type KeyboardEvent, type MouseEvent } from "react";
import type { DropPosition, TreeRow as Row } from "../../project/treeRows.js";
import type { Label } from "../../project/labels.js";
import { LabelDots, LeftPill, PovTag, StatusDot } from "./rowSigns.js";
import type { SceneStatus } from "../../manuscript/sceneFile.js";
import { Chevron } from "./Chevron.js";
import { NoteKindIcon } from "../notes/NoteKindIcon.js";
import type { NoteKind } from "../../project/noteKinds.js";
import type { StatusStep } from "../../project/statusSteps.js";
import { t } from "../../i18n/i18n.js";

export interface TreeRowProps {
  row: Row;
  label: string;
  /** Without numbering. */
  title: string;
  meta: string;
  /** A sign for a file or a guide; null for a plain note or scene. */
  kind: NoteKind | null;
  /** The row's labels, shown as dots in their colours. */
  dots: Label[];
  /** A scene's step, as a dot before its labels; null for anything else. */
  status: (StatusStep & { id: SceneStatus }) | null;
  isActive: boolean;
  /** Just moved here from the manuscript, marked like the open row though it is not open. */
  isMoved: boolean;
  /** In a table of contents, the printed page it starts on; undefined when the sidebar is not one. */
  page?: number | null | undefined;
  /** In Redigera, what waits in the scene; nothing shows at 0. */
  left: number;
  isExpanded: boolean | null;
  isRenaming: boolean;
  isMissing: boolean;
  dropHint: DropPosition | null;
  dragProps: {
    draggable: boolean;
    onDragStart: (event: DragEvent<HTMLElement>) => void;
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
    onDragEnd: () => void;
  };
  onActivate: () => void;
  onToggle: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  onStartRename: () => void;
  onRename: (title: string | null) => void;
  /** On a phone: swiped left, and swiped right; missing where the row has nothing to swipe to. */
  onSwipeLeft?: (() => void) | undefined;
  onSwipeRight?: (() => void) | undefined;
}

function RenameInput({
  initial,
  onRename,
}: {
  initial: string;
  onRename: (title: string | null) => void;
}) {
  const [value, setValue] = useState(initial);
  const finish = (title: string | null) => onRename(title?.trim() ? title.trim() : null);
  return (
    <input
      className="tree-rename"
      aria-label={t("Nytt namn")}
      autoFocus
      // The old name is chosen, so typing replaces it, as in any file manager.
      onFocus={(event) => event.target.select()}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") finish(value);
        if (event.key === "Escape") finish(null);
        event.stopPropagation();
      }}
    />
  );
}

const isMarked = (props: TreeRowProps) => props.isActive || props.isMoved;

const rowClass = (props: TreeRowProps) =>
  [
    "tree-row",
    props.row.depth === 0 ? "top-level" : "",
    isMarked(props) ? "active" : "",
    props.status?.id === "idé" ? "planned" : "",
    props.isMissing ? "missing" : "",
    props.page !== undefined ? "toc" : "",
    props.dropHint ? `drop-${props.dropHint}` : "",
  ]
    .filter(Boolean)
    .join(" ");

const treeItemAttributes = (props: TreeRowProps) => ({
  role: "treeitem",
  "data-node-id": props.row.node.id,
  tabIndex: 0,
  "aria-level": props.row.depth + 1,
  "aria-expanded": props.isExpanded ?? undefined,
  "aria-current": props.isActive ? ("page" as const) : undefined,
});

// The row's menu for a tap, where there is no right click.
const MoreButton = (props: { label: string; onOpen: (event: MouseEvent<HTMLElement>) => void }) => (
  <button
    className="tree-more"
    aria-label={t("Meny för {name}", { name: props.label })}
    onClick={(event) => (event.stopPropagation(), props.onOpen(event))}
  >
    ⋯
  </button>
);

// Dots to the page number, as a printed table of contents lines them up.
const PageLeader = ({ page }: { page: number | null }) => (
  <>
    <span className="tree-leader" aria-hidden="true" />
    <span className="tree-page">{page ?? ""}</span>
  </>
);

// What waits, the words or in a table of contents the page; then the menu for a tap.
const RowEnd = (props: TreeRowProps) => (
  <>
    <LeftPill left={props.left} />
    {props.page === undefined ? (
      <span className="tree-meta">{props.meta}</span>
    ) : (
      <PageLeader page={props.page} />
    )}
    <MoreButton label={props.label} onOpen={props.onContextMenu} />
  </>
);

// What a swipe will do, shown under the row as it moves aside.
function SwipeHint({ side }: { side: "left" | "right" | null }) {
  if (!side) return null;
  return (
    <span className={`tree-swipe-hint ${side}`} aria-hidden="true">
      {side === "left" ? t("Papperskorg") : t("Nästa status")}
    </span>
  );
}

export function TreeRow(props: TreeRowProps) {
  const swipe = useSwipe(props.onSwipeLeft, props.onSwipeRight);
  if (!props.onSwipeLeft && !props.onSwipeRight) return <RowItself {...props} />;
  return (
    <div className="tree-swipe" role="none" {...swipe.handlers}>
      <SwipeHint side={swipe.side} />
      <RowItself {...props} offset={swipe.offset} />
    </div>
  );
}

const rowStyle = (props: TreeRowProps & { offset?: number }) => ({
  paddingLeft: 10 + props.row.depth * 14,
  ...(props.offset ? { transform: `translateX(${props.offset}px)` } : {}),
});

// The name, after the sign of a file or a guide; a field while it is renamed.
const RowName = (props: TreeRowProps) => (
  <>
    <NoteKindIcon kind={props.kind} />
    {props.isRenaming ? (
      <RenameInput initial={props.title} onRename={props.onRename} />
    ) : (
      <span className="tree-label">{props.label}</span>
    )}
  </>
);

function RowItself(props: TreeRowProps & { offset?: number }) {
  return (
    <div
      {...treeItemAttributes(props)}
      className={rowClass(props)}
      style={rowStyle(props)}
      onClick={props.onActivate}
      onDoubleClick={props.onStartRename}
      onKeyDown={props.onKeyDown}
      onContextMenu={props.onContextMenu}
      {...props.dragProps}
    >
      <span
        className="tree-chevron"
        onClick={(event) => (event.stopPropagation(), props.onToggle())}
      >
        {props.isExpanded !== null && <Chevron isOpen={props.isExpanded} />}
      </span>
      <StatusDot status={props.status} />
      <RowName {...props} />
      {props.row.node.pov && <PovTag pov={props.row.node.pov} />}
      <LabelDots dots={props.dots} />
      <RowEnd {...props} />
    </div>
  );
}
