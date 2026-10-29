import { TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { useEditorState } from "../../editor/editorStore.js";
import type { AppState } from "../App.js";
import { sendToEditor } from "../exporting/collaboration.js";
import { usePhone } from "../phone/usePhone.js";
import type { Project } from "../useProject.js";
import { useEditorsFile } from "./RevisionImport.js";
import { DRAFT_ID } from "./useComments.js";
import { formatNumber, t } from "../../i18n/i18n.js";

const MARKS = `.commented:not(.noted):not([data-comment="${DRAFT_ID}"]), [data-change]`;

type Mark = { isChange: boolean; card: string; element: HTMLElement; place: number };

// Each change and open comment once, in the text's order; words split by italics are still one.
// Read from the text as it is drawn, so the walk is what the writer sees.
function marksOf(view: EditorView | null): Mark[] {
  const marks = new Map<string, Mark>();
  for (const element of Array.from(view?.dom.querySelectorAll<HTMLElement>(MARKS) ?? [])) {
    const { comment, change } = element.dataset;
    const isChange = change !== undefined;
    const card = isChange
      ? `.margin-note[data-change="${change}"]`
      : `.margin-note[data-comment="${comment}"]`;
    const place = view?.posAtDOM(element, 0) ?? 0;
    if (!marks.has(card)) marks.set(card, { isChange, card, element, place });
  }
  return [...marks.values()];
}

// The mark in the middle of the view with the caret on it, and its card in the margin outlined.
function showMark(app: AppState, mark: Mark) {
  mark.element.scrollIntoView({ block: "center" });
  app.editor.run((state, dispatch) => {
    dispatch?.(state.tr.setSelection(TextSelection.create(state.doc, mark.place)));
    return true;
  });
  app.editor.viewRef.current?.focus();
  document.querySelector(".margin-note.current")?.classList.remove("current");
  document.querySelector(mark.card)?.classList.add("current");
}

// From the caret, as Word's Nästa: what was accepted or answered is gone, and the next one is next.
function useWalk(app: AppState) {
  const caret = useEditorState(app.editor)?.selection.from ?? 0;
  const marks = marksOf(app.editor.viewRef.current);
  const show = (mark: Mark | undefined) => mark && showMark(app, mark);
  return {
    marks,
    passed: marks.filter((mark) => mark.place <= caret).length,
    next: () => show(marks.find((mark) => mark.place > caret)),
    previous: () => show(marks.filter((mark) => mark.place < caret).at(-1)),
  };
}

function walkText(total: number, passed: number) {
  if (total === 0) return t("Inget kvar att gå igenom");
  const count = formatNumber(total);
  if (passed === 0) return t("{count} att gå igenom", { count });
  return t("{current} av {total}", { current: formatNumber(passed), total: count });
}

// Only what there is: "2 ändringar", not "2 ändringar · 0 kommentarer".
function countsText(marks: Mark[]) {
  const changes = marks.filter((mark) => mark.isChange).length;
  const comments = marks.length - changes;
  const parts = [
    changes > 0 &&
      (changes === 1 ? t("1 ändring") : t("{count} ändringar", { count: formatNumber(changes) })),
    comments > 0 &&
      (comments === 1
        ? t("1 kommentar")
        : t("{count} kommentarer", { count: formatNumber(comments) })),
  ];
  return parts.filter(Boolean).join(" · ");
}

const ARROWS = { previous: "m15 6-6 6 6 6", next: "m9 6 6 6-6 6" };

const Arrow = (props: { path: string; label: string; onClick: () => void }) => (
  <button className="icon-button" aria-label={props.label} onClick={props.onClick}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d={props.path} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </button>
);

function Walk({ app }: { app: AppState }) {
  const walk = useWalk(app);
  const total = walk.marks.length;
  return (
    <span className="walk-bar-walk">
      <b>{t("Genomgång")}</b>
      <Arrow path={ARROWS.previous} label={t("Föregående")} onClick={walk.previous} />
      <span className="walk-bar-place">{walkText(total, walk.passed)}</span>
      <Arrow path={ARROWS.next} label={t("Nästa")} onClick={walk.next} />
      {total > 0 && <span className="walk-bar-counts">{countsText(walk.marks)}</span>}
    </span>
  );
}

// Manus reads as the writer writes; Bok as the page will look, in the book's type.
function ReadAs({ app }: { app: AppState }) {
  const { settings, onChangeSettings } = app.writingMode;
  const option = (label: string, bookType: boolean) => (
    <button
      role="radio"
      aria-checked={settings.bookType === bookType}
      onClick={() => onChangeSettings((current) => ({ ...current, bookType }))}
    >
      {label}
    </button>
  );
  return (
    <div className="segmented small" role="radiogroup" aria-label={t("Läs som")}>
      {option(t("Manus"), false)}
      {option(t("Bok"), true)}
    </div>
  );
}

function ShownWalkBar({ app, project }: { app: AppState; project: Project }) {
  const editorsFile = useEditorsFile(app, project);
  return (
    <>
      <div
        className="selection-bar fixed walk-bar"
        role="toolbar"
        aria-label={t("Genomgång")}
        onMouseDown={(event) => event.preventDefault()}
      >
        <Walk app={app} />
        <span className="walk-bar-end">
          <ReadAs app={app} />
          <button className="link-button" onClick={editorsFile.open}>
            {t("Läs in redaktörens fil…")}
          </button>
          <button
            className="button small secondary"
            onClick={() => sendToEditor(project, app.zip.run)}
          >
            {t("Skicka till redaktör…")}
          </button>
        </span>
      </div>
      {editorsFile.layer}
    </>
  );
}

/** Redigera's row over the text, in the format row's place: the walk through what waits, and the
 *  way the book goes to the editor and comes back. A phone has Granska instead. */
export const WalkBar = (props: { app: AppState; project: Project }) =>
  usePhone() ? null : <ShownWalkBar {...props} />;
