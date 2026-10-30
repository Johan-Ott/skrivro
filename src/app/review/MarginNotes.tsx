import { useEffect, useMemo, useState } from "react";
import { useSettledDoc } from "../../editor/editorStore.js";
import { PAUSE_MS, sceneRepetitions } from "../../editor/repetitionMarks.js";
import type { Comment } from "../../project/comments.js";
import type { AppState } from "../App.js";
import { CommentNote, DraftNote, RepeatNote, type Repeat } from "./MarginCards.js";
import { currentCard, usePlacement } from "./marginPlacement.js";
import { ChangeNotes } from "./RevisionSection.js";
import { formatNumber, t } from "../../i18n/i18n.js";

type Shown = "allt" | "forslag" | "kommentarer" | "anteckningar" | "granska";

const chipsOf = (): [Shown, string][] => [
  ["allt", t("Allt")],
  ["forslag", t("Förslag")],
  ["kommentarer", t("Kommentarer")],
  ["anteckningar", t("Anteckningar")],
  ["granska", t("Granska")],
];

type HeadProps = { counts: Record<Shown, number>; shown: Shown; onShown: (shown: Shown) => void };

const MarginHead = ({ counts, shown, onShown }: HeadProps) => (
  <div className="margin-head" role="group" aria-label={t("Visa i marginalen")}>
    {chipsOf().map(([each, label]) => (
      <button
        key={each}
        className="chip"
        aria-pressed={shown === each}
        onClick={() => onShown(each)}
      >
        {label} <span className="margin-chip-count">{formatNumber(counts[each])}</span>
      </button>
    ))}
  </div>
);

type Cards = { comments: Comment[]; changes: AppState["revision"]["changes"]; repeats: Repeat[] };

function countsOf({ comments, changes, repeats }: Cards): Record<Shown, number> {
  const notes = comments.filter((comment) => comment.isNote === true).length;
  return {
    allt: comments.length + changes.length + repeats.length,
    forslag: changes.length,
    kommentarer: comments.length - notes,
    anteckningar: notes,
    granska: repeats.length,
  };
}

// Words clicked in the text open their comment's card.
function useClickedComment(focused: string | null) {
  useEffect(() => {
    if (focused) currentCard.set(`comment:${focused}`);
  }, [focused]);
}

// What waits in the open scene: the editor's and the writer's suggestions, the comments and
// notes, and the words Granska finds used again too soon.
function useMarginCards(app: AppState, shown: Shown) {
  const doc = useSettledDoc(app.editor, PAUSE_MS);
  const { review, repeatWindow } = app.writingMode.settings;
  const repeats = useMemo(
    () => (doc && review ? sceneRepetitions(doc, repeatWindow) : []),
    [doc, review, repeatWindow],
  );
  const comments = app.comments.comments.filter((comment) => !comment.replyTo && !comment.resolved);
  const all = { comments, changes: app.revision.changes, repeats };
  const isOn = (kind: Shown) => shown === "allt" || shown === kind;
  useClickedComment(app.comments.focused);
  return {
    doc,
    counts: countsOf(all),
    comments: comments.filter((comment) => isOn(comment.isNote ? "anteckningar" : "kommentarer")),
    changes: isOn("forslag") ? all.changes : [],
    repeats: isOn("granska") ? repeats : [],
  };
}

type Shows = ReturnType<typeof useMarginCards> & { shown: Shown; replyingTo: string | null };

// Placed again whenever a card comes, goes, opens or grows.
function usePlacedCards(app: AppState, { doc, shown, replyingTo, ...cards }: Shows) {
  const { comments, draft } = app.comments;
  const ids = [
    ...cards.comments.map((each) => each.id),
    ...cards.changes.map((each) => each.from),
    ...cards.repeats.map((each) => each.word),
  ];
  const isOpen = currentCard.use();
  const { step, isFocusMode } = app.writingMode;
  // The box itself comes with Redigera, so it is placed when it comes, not only when cards change.
  const key = [step, isFocusMode, shown, isOpen, replyingTo, draft !== null, comments.length];
  return usePlacement([...key, ...ids].join(), doc);
}

type CommentsProps = {
  app: AppState;
  comments: Comment[];
  replyingTo: string | null;
  onReplying: (id: string | null) => void;
};

const CommentNotes = ({ app, comments, replyingTo, onReplying }: CommentsProps) =>
  comments.map((comment) => (
    <CommentNote
      key={comment.id}
      app={app}
      comment={comment}
      replies={app.comments.comments.filter((reply) => reply.replyTo === comment.id)}
      isReplying={replyingTo === comment.id}
      onReplying={(isReplying) => onReplying(isReplying ? comment.id : null)}
    />
  ));

/** Marginalen in Redigera: what waits stands beside its words, one line each but the current one. */
export function MarginNotes({ app }: { app: AppState }) {
  const [shown, setShown] = useState<Shown>("allt");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const cards = useMarginCards(app, shown);
  const { counts, comments, changes, repeats } = cards;
  const { draft } = app.comments;
  const box = usePlacedCards(app, { ...cards, shown, replyingTo });
  const { step, isFocusMode, settings } = app.writingMode;
  if (step !== "redigera" || isFocusMode) return null;
  return (
    <div className="margin-notes" ref={box}>
      {(counts.allt > 0 || draft) && (
        <MarginHead counts={counts} shown={shown} onShown={setShown} />
      )}
      <CommentNotes
        app={app}
        comments={comments}
        replyingTo={replyingTo}
        onReplying={setReplyingTo}
      />
      {draft && <DraftNote app={app} />}
      {changes.length > 0 && <ChangeNotes revision={app.revision} />}
      {repeats.map((repeat) => (
        <RepeatNote key={repeat.word} repeat={repeat} window={settings.repeatWindow} />
      ))}
    </div>
  );
}
