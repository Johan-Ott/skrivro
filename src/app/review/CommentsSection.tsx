import { useState, type ReactNode } from "react";
import { usePhone } from "../phone/usePhone.js";
import { locate, type Comment } from "../../project/comments.js";
import { snapshotWhen } from "../../project/snapshots.js";
import { marginOut, type useComments } from "./useComments.js";
import { t } from "../../i18n/i18n.js";

type Comments = ReturnType<typeof useComments>;

interface WriterProps {
  label: string;
  /** The button that sends, when it is not the same word as the label. */
  sendLabel?: string;
  onSend: (body: string) => void;
  onCancel: () => void;
  /** More choices before the buttons, such as note or comment. */
  children?: ReactNode;
}

export function Writer(props: WriterProps) {
  const [body, setBody] = useState("");
  return (
    <div className="comment-writer">
      <textarea
        autoFocus
        rows={3}
        aria-label={props.label}
        placeholder={`${props.label}…`}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <div className="review-actions">
        {props.children}
        <button
          className="button primary small"
          disabled={body.trim() === ""}
          onClick={() => props.onSend(body.trim())}
        >
          {props.sendLabel ?? props.label}
        </button>
        <button className="button secondary small" onClick={props.onCancel}>
          {t("Avbryt")}
        </button>
      </div>
    </div>
  );
}

const byline = (comment: Comment) =>
  `${comment.author} · ${snapshotWhen(comment.createdAt, Date.now()).toLowerCase()}`;

function Replies({ replies }: { replies: Comment[] }) {
  return replies.map((reply) => (
    <div key={reply.id} className="comment-reply">
      <span>{reply.body}</span>
      <span className="kpi-sub">{byline(reply)}</span>
    </div>
  ));
}

function CommentActions({ comment, comments }: { comment: Comment; comments: Comments }) {
  const [isReplying, setReplying] = useState(false);
  const send = (body: string) => {
    comments.reply(comment, body);
    setReplying(false);
  };
  if (isReplying)
    return <Writer label={t("Svara")} onSend={send} onCancel={() => setReplying(false)} />;
  return (
    <div className="review-actions">
      <button className="link-button" onClick={() => setReplying(true)}>
        {t("Svara")}
      </button>
      <button
        className="link-button quiet"
        onClick={() => comments.setResolved(comment.id, !comment.resolved)}
      >
        {comment.resolved ? t("Öppna igen") : t("Lös")}
      </button>
      <button className="link-button quiet" onClick={() => comments.remove(comment.id)}>
        {t("Ta bort")}
      </button>
    </div>
  );
}

// On a phone the comment is written in a box over the text, and beside a roomy page in the margin.
function Draft({ comments }: { comments: Comments }) {
  const isPhone = usePhone();
  const isInMargin = marginOut.use();
  if (!comments.draft || isPhone || isInMargin) return null;
  return (
    <div className="review-item focused">
      <span className="comment-quote">”{comments.draft.quote}”</span>
      <Writer label={t("Kommentera")} onSend={comments.add} onCancel={comments.cancel} />
    </div>
  );
}

function ResolvedToggle(props: { count: number; isShowing: boolean; onToggle: () => void }) {
  if (props.count === 0) return null;
  return (
    <button className="link-button quiet" onClick={props.onToggle}>
      {props.isShowing ? t("Dölj lösta") : t("Visa lösta ({count})", { count: props.count })}
    </button>
  );
}

function CommentCard(props: {
  comment: Comment;
  replies: Comment[];
  isPlaced: boolean;
  isFocused: boolean;
  comments: Comments;
}) {
  const { comment, comments } = props;
  return (
    <div className={props.isFocused ? "review-item focused" : "review-item"}>
      <span className="comment-quote">”{comment.quote}”</span>
      {!props.isPlaced && (
        <span className="kpi-sub">{t("Citatet finns inte längre i texten.")}</span>
      )}
      <span>{comment.body}</span>
      <span className="kpi-sub">{comment.isNote ? t("Anteckning") : byline(comment)}</span>
      <Replies replies={props.replies} />
      <CommentActions comment={comment} comments={comments} />
    </div>
  );
}

export function CommentsSection({ comments, text }: { comments: Comments; text: string }) {
  const [isShowingResolved, setShowingResolved] = useState(false);
  const top = comments.comments.filter((comment) => !comment.replyTo);
  const resolved = top.filter((comment) => comment.resolved);
  const shown = top.filter((comment) => !comment.resolved || isShowingResolved);
  if (top.length === 0 && !comments.draft) return null;
  return (
    <section className="review-section">
      <span className="review-heading">{t("Kommentarer")}</span>
      <Draft comments={comments} />
      {shown.map((comment) => (
        <CommentCard
          key={comment.id}
          comment={comment}
          replies={comments.comments.filter((reply) => reply.replyTo === comment.id)}
          isPlaced={locate(text, comment) !== null}
          isFocused={comments.focused === comment.id}
          comments={comments}
        />
      ))}
      <ResolvedToggle
        count={resolved.length}
        isShowing={isShowingResolved}
        onToggle={() => setShowingResolved(!isShowingResolved)}
      />
    </section>
  );
}
