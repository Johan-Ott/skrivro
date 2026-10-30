import type { ReactNode } from "react";
import type { sceneRepetitions } from "../../editor/repetitionMarks.js";
import type { Comment } from "../../project/comments.js";
import { snapshotWhen } from "../../project/snapshots.js";
import type { AppState } from "../App.js";
import { Writer } from "./CommentsSection.js";
import { currentCard } from "./marginPlacement.js";
import { repeatText } from "./ReviewPanel.js";
import { DRAFT_ID } from "./useComments.js";
import { formatNumber, t } from "../../i18n/i18n.js";

type CardProps = {
  kind: "comment" | "change" | "repeat";
  /** Set as the card's data-comment, data-change or data-repeat, which finds its words. */
  id: string;
  className?: string;
  children: ReactNode;
};

/** A card in the margin. Only the current one shows all of itself; a click makes it current. */
export function MarginCard({ kind, id, className = "", children }: CardProps) {
  const name = `${kind}:${id}`;
  const isCurrent = currentCard.use() === name;
  return (
    <div
      className={`margin-note ${className} ${isCurrent ? "current" : ""}`}
      {...{ [`data-${kind}`]: id }}
      onClick={() => currentCard.set(name)}
    >
      {children}
    </div>
  );
}

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

// Svara writes the reply in the card; Klar puts the comment away, as in Granska.
function CommentActions({ app, comment, isReplying, onReplying }: ReplyProps) {
  const reply = (body: string) => {
    app.comments.reply(comment, body);
    onReplying(false);
  };
  if (isReplying)
    return <Writer label={t("Svara")} onSend={reply} onCancel={() => onReplying(false)} />;
  return (
    <span className="margin-note-actions">
      <button className="link-button" onClick={() => onReplying(true)}>
        {t("Svara")}
      </button>
      <button
        className="link-button quiet"
        onClick={() => app.comments.setResolved(comment.id, true)}
      >
        {t("Klar")}
      </button>
    </span>
  );
}

// "i går · 2 svar".
function detailOf(comment: Comment, replies: number) {
  const when = snapshotWhen(comment.createdAt, Date.now()).toLowerCase();
  if (replies === 0) return when;
  const answers = replies === 1 ? t("1 svar") : t("{count} svar", { count: formatNumber(replies) });
  return `${when} · ${answers}`;
}

export function CommentNote(props: ReplyProps & { replies: Comment[] }) {
  const { comment } = props;
  return (
    <MarginCard kind="comment" id={comment.id}>
      <Who name={comment.author} detail={detailOf(comment, props.replies.length)} />
      <span className="margin-note-body">{comment.body}</span>
      {props.replies.map((each) => (
        <span key={each.id} className="margin-note-reply">
          <b>{each.author}:</b> {each.body}
        </span>
      ))}
      <CommentActions {...props} />
    </MarginCard>
  );
}

// A new comment, written at its line.
export const DraftNote = ({ app }: { app: AppState }) => (
  <div className="margin-note new" data-comment={DRAFT_ID}>
    <span className="margin-note-kind">{t("Kommentar")}</span>
    <Writer
      label={t("Skriv vid raden")}
      sendLabel={t("Spara")}
      onSend={app.comments.add}
      onCancel={app.comments.cancel}
    />
  </div>
);

export type Repeat = ReturnType<typeof sceneRepetitions>[number];

/** Granska's find beside its words: a word used again too soon. */
export const RepeatNote = ({ repeat, window }: { repeat: Repeat; window: number }) => (
  <MarginCard kind="repeat" id={repeat.word} className="named">
    <span className="margin-note-kind">{t("Granska")}</span>
    <span className="margin-note-body">{repeatText(repeat, window)}</span>
  </MarginCard>
);
