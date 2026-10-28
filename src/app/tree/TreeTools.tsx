import type { DragEvent, ReactNode } from "react";
import { manuscriptWords } from "../../project/treeLabels.js";
import { FilterButton } from "../labels/LabelsInTree.js";
import { FoldIcon, UnfoldIcon } from "../shell/icons.js";
import type { Tree, TreeViewProps } from "./useTreeView.js";
import { Chevron } from "./Chevron.js";
import { t, formatNumber } from "../../i18n/i18n.js";

function Tool(props: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      className="tree-tool"
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

const FoldTools = ({ view }: { view: Tree["view"] }) => (
  <>
    <Tool label={t("Fäll ut alla")} onClick={view.unfoldAll}>
      <UnfoldIcon />
    </Tool>
    <Tool label={t("Fäll ihop alla")} onClick={view.foldAll}>
      <FoldIcon />
    </Tool>
  </>
);

const BookWords = ({ project }: Pick<TreeViewProps, "project">) => (
  <span className="tree-tools-words" aria-label={t("Ord i boken")}>
    {formatNumber(manuscriptWords(project.tree, project.summaries))}
  </span>
);

// The manuscript folds as one, apart from the notes; how it was left is kept.
const BookToggle = ({ tree }: { tree: Tree }) => (
  <button
    className="sidebar-heading-toggle tree-book-toggle"
    aria-expanded={!tree.folded.book}
    onClick={() => tree.folded.toggle("book")}
  >
    <Chevron isOpen={!tree.folded.book} />
    {t("Manus")}
  </button>
);

/** Above the book: the manuscript's fold, filter, unfold all, fold all, and the book's words. */
export function TreeTools({ props, tree }: { props: TreeViewProps; tree: Tree }) {
  const { view } = tree;
  const { project } = props;
  return (
    <div
      className="tree-tools"
      onDragOver={(event: DragEvent) => event.preventDefault()}
      onDrop={(event: DragEvent) => (event.preventDefault(), tree.dropAtBookEnd())}
    >
      <BookToggle tree={tree} />
      <FilterButton props={props} view={view} />
      <FoldTools view={view} />
      <BookWords project={project} />
    </div>
  );
}
