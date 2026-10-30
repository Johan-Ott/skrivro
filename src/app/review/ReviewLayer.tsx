import { TextSelection, type Command } from "prosemirror-state";
import type { Comment } from "../../project/comments.js";
import { useEffect, useState } from "react";
import { useEditorState, useSettledDoc } from "../../editor/editorStore.js";
import { misspelledAtCaret } from "../spelling/Corrections.js";
import { PAUSE_MS } from "../../editor/repetitionMarks.js";
import type { Node } from "prosemirror-model";
import { SearchQuery } from "prosemirror-search";
import type { NameSuspect } from "../../manuscript/review.js";
import type { AppState } from "../App.js";
import type { OpenScene } from "../sceneSession.js";
import type { Project } from "../useProject.js";
import { narrationOf, type Narration } from "../../manuscript/narration.js";
import { fadingPeople } from "../../project/fadingPeople.js";
import { gestureNotes, similarNames } from "../../project/bookNotes.js";
import { bookLanguage } from "../../project/bookLanguage.js";
import { NarrationPicker, narrationLine } from "./NarrationPicker.js";
import { ReviewPanel } from "./ReviewPanel.js";
import { useReview } from "./useReview.js";
import { CommentsAndTasks } from "./CommentsAndTasks.js";
import { RevisionSection } from "./RevisionSection.js";
import { usePhone } from "../phone/usePhone.js";
import { PhoneCommentBox } from "./PhoneCommentBox.js";
import { suggestMenuItems } from "./Suggesting.js";
import { marginOut, type useComments } from "./useComments.js";

const selectRange =
  ({ from, to }: { from: number; to: number }): Command =>
  (state, dispatch) => {
    dispatch?.(state.tr.setSelection(TextSelection.create(state.doc, from, to)).scrollIntoView());
    return true;
  };

// Only what still waits: a reply belongs to its comment, and a resolved one is done.
export const openComments = (comments: Comment[]) =>
  comments.filter((comment) => !comment.replyTo && !comment.resolved).length;
import { t } from "../../i18n/i18n.js";

type Comments = ReturnType<typeof useComments>;

// Only whole words with the same capital letters change; Ångra undoes all of it in one step.
const replaceAllQuery = (suspect: NameSuspect) =>
  new SearchQuery({
    search: suspect.word,
    replace: suspect.suggestion,
    wholeWord: true,
    caseSensitive: true,
  });

type ShownProps = {
  app: AppState;
  project: Project;
  scene: OpenScene;
  doc: Node;
  comments: Comments;
};

// Opened while a comment is written in Granska, and by itself for an editor's changes, so they
// are seen. With the margin on they stand there instead, beside their words.
function useOpening(app: AppState, isWriting: boolean, focused: string | null) {
  useOpenedByClick(app, focused);
  const { setReviewOpen, settings } = app.writingMode;
  const hasRevision = app.revision.isOpen && !settings.commentsInMargin;
  useEffect(() => {
    if (isWriting || hasRevision) setReviewOpen(true);
  }, [isWriting, hasRevision, setReviewOpen]);
}

// A click on commented words shows the comment: in the margin when it stands there, else in Granska.
// A misspelled word among them shows its corrections instead, so only one thing opens at a time.
function useOpenedByClick(app: AppState, focused: string | null) {
  const { setReviewOpen } = app.writingMode;
  const isInMargin = marginOut.use();
  const isMisspelled = misspelledAtCaret(app.editor, useEditorState(app.editor)) !== null;
  useEffect(() => {
    if (focused && !isInMargin && !isMisspelled) setReviewOpen(true);
  }, [focused, isInMargin, isMisspelled, setReviewOpen]);
}

// About the whole book, beside the open scene: people who fade out, names alike, worn gestures.
const bookNotesOf = (app: AppState, project: Project) => [
  ...fadingPeople(app.notes.cards, app.notes.mentions, project.tree),
  ...similarNames(app.notes.cards),
  ...gestureNotes(Object.values(app.notes.manuscript), bookLanguage(project.fields)),
];

const NarrationLine = (props: { narration: Narration; onChange: () => void }) => (
  <section className="review-section narration-line">
    <span className="setting-hint">
      {t("Berättarröst: {narration}", { narration: narrationLine(props.narration) })}
    </span>
    <button className="link-button quiet" onClick={props.onChange}>
      {t("Ändra")}
    </button>
  </section>
);

// Once chosen, the narration is one line that Granska keeps to; the choice opens on Ändra.
function NarrationSection({ app, fields }: { app: AppState; fields: Record<string, unknown> }) {
  const narration = narrationOf(fields);
  const [isChoosing, setChoosing] = useState(false);
  const save = (next: Narration | null) => void app.updateFields({ narration: next });
  if (narration && !isChoosing)
    return <NarrationLine narration={narration} onChange={() => setChoosing(true)} />;
  return (
    <section className="review-section">
      <span className="review-heading">{t("Berättarröst")}</span>
      <NarrationPicker value={narration} onChange={save} />
      {narration ? (
        <button className="link-button quiet" onClick={() => setChoosing(false)}>
          {t("Klar")}
        </button>
      ) : (
        <span className="setting-hint">
          {t("Välj hur boken berättas, så ser Granska till att texten håller sig till det.")}
        </span>
      )}
    </section>
  );
}

const Narration = ({ app, project }: Pick<ShownProps, "app" | "project">) => (
  <NarrationSection app={app} fields={project.fields} />
);

// A comment is written in Granska; on a phone in a box over the text, beside it in the margin.
function useWritingInPanel(app: AppState, comments: Comments) {
  const isPhone = usePhone();
  const isInMargin = marginOut.use();
  const isWriting = comments.draft !== null && !isPhone && !isInMargin;
  useOpening(app, isWriting, comments.focused);
  return isWriting;
}

function ShownReview(props: ShownProps) {
  const { app } = props;
  const { review: isReviewOn, repeatWindow } = app.writingMode.settings;
  const review = useReview({ ...props, cards: app.notes.cards, repeatWindow });
  const isWritingInPanel = useWritingInPanel(app, props.comments);
  return (
    <>
      <PhoneCommentBox comments={props.comments} />
      <ReviewPanel
        review={isReviewOn ? review : null}
        commentsSection={<CommentsAndTasks {...props} />}
        narrationSection={<Narration app={app} project={props.project} />}
        menuItems={suggestMenuItems(app, usePhone())}
        bookNotes={bookNotesOf(app, props.project)}
        revisionSection={<RevisionSection revision={app.revision} />}
        revisionCount={app.revision.changes.length}
        repeatWindow={repeatWindow}
        onOpenCard={app.cards.open}
        onReplaceAll={(suspect) => app.search.scope.replaceAll(replaceAllQuery(suspect))}
        onIgnore={(word) => void app.updateFields({ ignoredNames: [...review.ignored, word] })}
        onShowRange={(range) => app.editor.run(selectRange(range))}
        isPinnedOpen={isWritingInPanel}
        commentCount={openComments(props.comments.comments)}
        isOpen={app.writingMode.isReviewOpen}
        onOpenChange={app.writingMode.setReviewOpen}
        onCount={app.writingMode.setReviewCount}
      />
    </>
  );
}

// Shown in Redigera with Granskning on, or whenever there is something from someone else to read.
function isWanted({ writingMode, comments, revision }: AppState) {
  const hasComments = comments.comments.length > 0 || comments.draft !== null;
  const hasAny = writingMode.settings.review || hasComments || revision.isOpen;
  return writingMode.showsFindings && hasAny;
}

// A comment begun, or changes to accept, take the writer to Redigera. Only when they begin: a
// half-written comment waits there while the writer goes back to Skriv.
function useToRedigera({ comments, revision, writingMode }: AppState) {
  const { draft } = comments;
  const { goTo } = writingMode;
  useEffect(() => {
    if (draft !== null) goTo("redigera");
  }, [draft, goTo]);
  useEffect(() => {
    if (revision.isOpen) goTo("redigera");
  }, [revision.isOpen, goTo]);
}

export function ReviewLayer({ app, project }: { app: AppState; project: Project }) {
  const { scene, writingMode, comments } = app;
  useToRedigera(app);
  const doc = useSettledDoc(app.editor, PAUSE_MS);
  if (!isWanted(app) || writingMode.isFocusMode || !scene || !doc) return null;
  return <ShownReview app={app} project={project} scene={scene} doc={doc} comments={comments} />;
}
