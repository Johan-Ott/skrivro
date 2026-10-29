import { BackButton } from "@llkit/controls.js";
import { SectionHeading } from "./SectionHeading.js";
import type { ReactNode } from "react";
import { swipesOf, TrashUndo } from "./useSwipes.js";
import {
  withoutEmptyFixedSorts,
  withoutEmptySorts,
  type TreeRow as Row,
} from "../../project/treeRows.js";
import { Menu } from "@llkit/Menu.js";
import { addMenu, foldMenu, rowMenu } from "./treeMenus.js";
import { TreeRow } from "./TreeRow.js";
import {
  isEmptySort,
  rowHandlers,
  rowView,
  useTreeView,
  type Tree,
  type TreeViewProps,
} from "./useTreeView.js";
import { nodeLabel } from "../../project/treeLabels.js";
import { LabelsLayer } from "../labels/LabelsInTree.js";
import { TreeTools } from "./TreeTools.js";
import { menuActions } from "./treeMenuActions.js";
import { t } from "../../i18n/i18n.js";

export type { TreeViewProps } from "./useTreeView.js";

function menuOf(row: Row, tree: Tree, menuFor: ReturnType<typeof menuActions>) {
  const { actions } = tree;
  const isInTrash = actions.isInTrash(row.node.id);
  const canMove = actions.canEdit(row.node) && !isInTrash;
  const move = canMove ? (step: 1 | -1) => actions.moveBy(row, step) : undefined;
  return rowMenu(row.node, isInTrash, menuFor, move);
}

function Rows({ rows, props, tree }: { rows: Row[]; props: TreeViewProps; tree: Tree }) {
  const { view, actions, drag, openMenu } = tree;
  const menuFor = menuActions(tree, props);
  return [
    ...rows.map((row) => (
      <TreeRow
        key={row.node.id}
        {...rowView(row, props, view.collapsed)}
        isRenaming={view.renamingId === row.node.id}
        isMoved={view.movedId === row.node.id}
        dropHint={drag.dropHintFor(row.node.id)}
        dragProps={drag.rowDragProps(row, actions.canEdit(row.node) && !tree.isFiltered)}
        {...rowHandlers(row, actions, view)}
        {...(isEmptySort(row.node) ? { onActivate: () => props.onNewNote(row.node.id) } : {})}
        onContextMenu={(event) => openMenu(event, menuOf(row, tree, menuFor))}
        {...swipesOf(row, props, tree)}
      />
    )),
  ];
}

// Skrivro's own sorts show once they hold a note; + Ny anteckning offers them all.
function BookNotes({ props, tree }: { props: TreeViewProps & BookExtras; tree: Tree }) {
  if (!props.seriesNotes) {
    const notes = withoutEmptyFixedSorts(tree.sections.notes);
    return (
      <>
        {notes.length > 0 && (
          <SectionHeading
            label={t("Anteckningar")}
            isFolded={tree.folded.notes}
            onToggle={() => tree.folded.toggle("notes")}
          />
        )}
        <Rows rows={tree.folded.notes ? [] : notes} props={props} tree={tree} />
      </>
    );
  }
  const own = withoutEmptySorts(tree.sections.notes);
  return (
    <>
      {props.seriesNotes}
      {own.length > 0 && <SectionHeading label={t("Bara i den här boken")} />}
      <Rows rows={own} props={props} tree={tree} />
    </>
  );
}

interface BookExtras {
  /** On a phone, with no right click, adding to the book is a button. */
  hasAddButton?: boolean;
  seriesNotes?: ReactNode;
}

function NotesAndTrash({ props, tree }: { props: TreeViewProps & BookExtras; tree: Tree }) {
  return (
    <>
      <BookNotes props={props} tree={tree} />
      <button className="tree-add" onClick={() => props.onNewNote(null)}>
        {t("+ Ny anteckning")}
      </button>
      <div className="tree-bottom">
        <Rows rows={tree.sections.trash} props={props} tree={tree} />
      </div>
    </>
  );
}

function AddButton({ props, tree }: { props: TreeViewProps; tree: Tree }) {
  const menuFor = menuActions(tree, props);
  return (
    <button
      className="tree-add"
      onClick={(event) => tree.openMenu(event, [...addMenu(menuFor), ...foldMenu(tree.view)])}
    >
      {t("+ Lägg till")}
    </button>
  );
}

// In chapter focus the heading is the chapter, with the way back to the whole book above it.
function BookHeading({ props, tree }: { props: TreeViewProps; tree: Tree }) {
  const { focused, view } = tree;
  const { project } = props;
  if (!focused) return <TreeTools props={props} tree={tree} />;
  return (
    <>
      <BackButton label={t("Hela boken")} onBack={() => view.setFocusId(null)} />
      <SectionHeading label={nodeLabel(focused, project.tree, project.summaries)} />
    </>
  );
}

// The manuscript folded leaves its rows out; chapter focus always shows the chapter's scenes.
const bookRows = (tree: Tree) => (tree.folded.book && !tree.focused ? [] : tree.sections.book);

/** One tree, so the arrow keys walk through all of it. */
export function TreeView(props: TreeViewProps & BookExtras) {
  const tree = useTreeView(props);
  const { view } = tree;
  const menuFor = menuActions(tree, props);
  return (
    <div
      role="tree"
      aria-label={t("Boken")}
      className="tree"
      onContextMenu={(event) => tree.openMenu(event, [...addMenu(menuFor), ...foldMenu(view)])}
    >
      <BookHeading props={props} tree={tree} />
      <div className="tree-scroll">
        <Rows rows={bookRows(tree)} props={props} tree={tree} />
        {props.hasAddButton && <AddButton props={props} tree={tree} />}
        <NotesAndTrash props={props} tree={tree} />
      </div>
      {view.menu && <Menu {...view.menu} label={t("Boken")} onClose={() => view.setMenu(null)} />}
      <LabelsLayer props={props} view={view} />
      <TrashUndo props={props} tree={tree} />
      {tree.drag.isRefused && (
        <div className="toast inverted tree-undo" role="status">
          {t(
            "Det som står i manuset blir inte en anteckning när det dras. Välj Gör till anteckning i scenens meny.",
          )}
        </div>
      )}
    </div>
  );
}

/** The series' Papperskorg shows only once something is in it. */
export function SeriesNotes(props: TreeViewProps & { name: string }) {
  const tree = useTreeView(props);
  const { sections, view } = tree;
  const hasTrash = (sections.trash[0]?.node.children ?? []).length > 0;
  const trash = hasTrash ? sections.trash : [];
  return (
    <div role="group" aria-label={props.name} onContextMenu={(event) => event.stopPropagation()}>
      <SectionHeading label={t("Anteckningar · {name}", { name: props.name })} />
      <Rows rows={sections.notes} props={props} tree={tree} />
      <Rows rows={trash} props={props} tree={tree} />
      {view.menu && <Menu {...view.menu} label={props.name} onClose={() => view.setMenu(null)} />}
    </div>
  );
}
