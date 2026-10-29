import { useState } from "react";
import { documentText } from "../../editor/documentText.js";
import { useSettledDoc } from "../../editor/editorStore.js";
import { PAUSE_MS } from "../../editor/repetitionMarks.js";
import { cardsNamedIn } from "../../project/cards.js";
import type { Comment } from "../../project/comments.js";
import { snapshotWhen } from "../../project/snapshots.js";
import { CHARACTERS_ID, PLACES_ID, THINGS_ID } from "../../project/sorts.js";
import type { AppState } from "../App.js";
import { Writer } from "./CommentsSection.js";
import { usePlacement } from "./marginPlacement.js";
import { ChangeNotes } from "./RevisionSection.js";
import { DRAFT_ID } from "./useComments.js";
import { t } from "../../i18n/i18n.js";

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

const Who = (props: { name: string; detail: string }) => (
  <span className="margin-note-who">
    <span className="margin-note-face">{initial(props.name)}</span>
    <b>{props.name}</b>
    <span>{props.detail}</span>
  </span>
);

type ReplyProps = {
  app: AppState;
  comment: Comment;
  isReplying: boolean;
  onReplying: (isReplying: boolean) => void;
};

// Svara writes the reply in the card; Klar puts the comment or the note away, as in Granska.
function CommentActions({ app, comment, isReplying, onReplying }: ReplyProps) {
  const reply = (body: string) => {
    app.comments.reply(comment, body);
    onReplying(false);
  };
  if (isReplying)
    return <Writer label={t("Svara")} onSend={reply} onCancel={() => onReplying(false)} />;
  return (
    <span className="margin-note-actions">
      {!comment.isNote && (
        <button className="link-button" onClick={() => onReplying(true)}>
          {t("Svara")}
        </button>
      )}
      <button
        className="link-button quiet"
        onClick={() => app.comments.setResolved(comment.id, true)}
      >
        {t("Klar")}
      </button>
    </span>
  );
}

function CommentNote(props: ReplyProps & { replies: Comment[] }) {
  const { comment } = props;
  const when = snapshotWhen(comment.createdAt, Date.now()).toLowerCase();
  return (
    <div className={comment.isNote ? "margin-note noted" : "margin-note"} data-comment={comment.id}>
      {comment.isNote ? (
        <span className="margin-note-kind">{t("Anteckning")}</span>
      ) : (
        <Who name={comment.author} detail={when} />
      )}
      <span className="margin-note-body">{comment.body}</span>
      {props.replies.map((each) => (
        <span key={each.id} className="margin-note-reply">
          <b>{each.author}:</b> {each.body}
        </span>
      ))}
      <CommentActions {...props} />
    </div>
  );
}

// Written at the line: the writer's own note, or a comment for the one who reads.
function DraftNote({ app }: { app: AppState }) {
  const [isNote, setNote] = useState(true);
  const kind = (label: string, isOn: boolean) => (
    <button role="radio" aria-checked={isNote === isOn} onClick={() => setNote(isOn)}>
      {label}
    </button>
  );
  return (
    <div className="margin-note new" data-comment={DRAFT_ID}>
      <Writer
        label={t("Skriv vid raden")}
        sendLabel={t("Spara")}
        onSend={(body) => app.comments.add(body, isNote)}
        onCancel={app.comments.cancel}
      >
        <div className="segmented small" role="radiogroup" aria-label={t("Sort")}>
          {kind(t("Anteckning"), true)}
          {kind(t("Kommentar"), false)}
        </div>
      </Writer>
    </div>
  );
}

const KIND_WORDS: Record<string, string> = {
  [CHARACTERS_ID]: t("person"),
  [PLACES_ID]: t("plats"),
  [THINGS_ID]: t("sak"),
};

type NamedCard = AppState["notes"]["cards"][number];

function MentionNote({ app, card }: { app: AppState; card: NamedCard }) {
  const description = app.notes.descriptionOf(card.id);
  return (
    <div className="margin-note named" data-entity={card.id}>
      <Who name={card.name} detail={KIND_WORDS[card.sortId] ?? card.sortLabel} />
      {description && <span className="margin-note-body">{description}</span>}
      <span className="margin-note-actions">
        <button className="link-button" onClick={() => app.cards.open(card.id)}>
          {t("Öppna {name}", { name: card.name })}
        </button>
      </span>
    </div>
  );
}

type Shown = "allt" | "kommentarer" | "anteckningar";

function MarginHead(props: { app: AppState; shown: Shown; onShown: (shown: Shown) => void }) {
  const { onChangeSettings } = props.app.writingMode;
  const hide = () => onChangeSettings((current) => ({ ...current, commentsInMargin: false }));
  const option = (label: string, shown: Shown) => (
    <button role="radio" aria-checked={props.shown === shown} onClick={() => props.onShown(shown)}>
      {label}
    </button>
  );
  return (
    <div className="margin-head">
      <div className="segmented small" role="radiogroup" aria-label={t("Visa i marginalen")}>
        {option(t("Allt"), "allt")}
        {option(t("Kommentarer"), "kommentarer")}
        {option(t("Anteckningar"), "anteckningar")}
      </div>
      <button className="link-button quiet" onClick={hide}>
        {t("Dölj marginalen")}
      </button>
    </div>
  );
}

const isShown = (comment: Comment, shown: Shown) =>
  shown === "allt" || (shown === "anteckningar") === (comment.isNote === true);

// What the margin holds for the open scene; the people and places named only under Allt, the
// editor's changes under all but Anteckningar.
function useMarginCards(app: AppState, shown: Shown) {
  const doc = useSettledDoc(app.editor, PAUSE_MS);
  const open = app.comments.comments.filter((comment) => !comment.replyTo && !comment.resolved);
  const text = shown === "allt" && doc ? documentText(doc).text : "";
  const named = text ? cardsNamedIn(app.notes.cards, text) : [];
  const wanted = open.filter((comment) => isShown(comment, shown));
  const { changes } = app.revision;
  const shownChanges = shown === "anteckningar" ? [] : changes;
  return {
    doc,
    wanted,
    named,
    changes: shownChanges,
    ids: [
      ...[...wanted, ...named].map((each) => each.id),
      ...shownChanges.map((each) => each.from),
    ],
    hasCards: open.length + named.length + changes.length > 0 || app.comments.draft !== null,
  };
}

/** Marginalen: beside the text, level with what they are about, the open comments, the writer's
 * own notes at the line, and the people and places the scene names. */
export function MarginNotes({ app }: { app: AppState }) {
  const [shown, setShown] = useState<Shown>("allt");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const { doc, wanted, named, changes, ids, hasCards } = useMarginCards(app, shown);
  const { comments: all, draft } = app.comments;
  const box = usePlacement([shown, replyingTo, draft !== null, all.length, ...ids].join(), doc);
  const { settings, isFocusMode, showsFindings } = app.writingMode;
  if (!settings.commentsInMargin || isFocusMode || !showsFindings) return null;
  return (
    <div className="margin-notes" ref={box}>
      {hasCards && <MarginHead app={app} shown={shown} onShown={setShown} />}
      {wanted.map((comment) => (
        <CommentNote
          key={comment.id}
          app={app}
          comment={comment}
          replies={all.filter((reply) => reply.replyTo === comment.id)}
          isReplying={replyingTo === comment.id}
          onReplying={(isReplying) => setReplyingTo(isReplying ? comment.id : null)}
        />
      ))}
      {draft && <DraftNote app={app} />}
      {changes.length > 0 && <ChangeNotes revision={app.revision} />}
      {named.map((card) => (
        <MentionNote key={card.id} app={app} card={card} />
      ))}
    </div>
  );
}
