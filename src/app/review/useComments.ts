import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { refreshComments } from "../../editor/commentMarks.js";
import { documentText } from "../../editor/documentText.js";
import type { useEditorView } from "../../editor/useEditorView.js";
import {
  anchorAt,
  newComment,
  newReply,
  readComments,
  writeComments,
  type Anchor,
  type Comment,
} from "../../project/comments.js";
import { recordFailure } from "@llkit/errorLog.js";
import { createStore } from "@llkit/store.js";
import { platform } from "../platform.js";
import type { OpenScene } from "../sceneSession.js";
import { useCommandKey } from "../shortcuts.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

type Editor = ReturnType<typeof useEditorView>;

/** The draft's own mark in the text, so the margin can set its card beside the line. */
export const DRAFT_ID = "draft";

/** True while MarginNotes stands beside the text: comments are then written and read there. */
export const marginOut = createStore(false);

// What is selected, or with nothing selected the paragraph the caret stands in; null in an empty one.
function selectedAnchor(editor: Editor): Anchor | null {
  const state = editor.viewRef.current?.state;
  if (!state) return null;
  const { selection } = state;
  const { $from } = selection;
  const isLine = selection.empty && $from.parent.textContent.trim() !== "";
  if (selection.empty && !isLine) return null;
  const { text, fromDoc } = documentText(state.doc);
  const [from, to] = isLine ? [$from.start(), $from.end()] : [selection.from, selection.to];
  return anchorAt(text, fromDoc(from), fromDoc(to));
}

// A file that could not be read is never written, since the list in hand would replace it.
async function readInto(
  where: { dir: string; sceneId: string },
  setComments: (comments: Comment[]) => void,
  isRead: { current: boolean },
) {
  try {
    setComments(await readComments(platform.fileSystem, where.dir, where.sceneId));
    isRead.current = true;
  } catch (error) {
    isRead.current = false;
    recordFailure("Kommentarerna kunde inte läsas")(error);
  }
}

// Written one change at a time, then read again.
function useCommentFile(project: Project | null, scene: OpenScene | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const queue = useRef(Promise.resolve());
  const isRead = useRef(false);
  const dir = project?.dir ?? null;
  const sceneId = scene?.id ?? null;
  useEffect(() => {
    setComments([]);
    isRead.current = false;
  }, [dir, sceneId]);
  useEffect(() => {
    if (!dir || !sceneId) return;
    queue.current = queue.current.then(() => readInto({ dir, sceneId }, setComments, isRead));
  }, [project, dir, sceneId]);
  const save = (next: Comment[]) => {
    setComments(next);
    if (!dir || !sceneId) return;
    queue.current = queue.current
      .then(() => {
        if (!isRead.current) throw new Error("filen kunde inte läsas");
        return writeComments(platform.fileSystem, dir, sceneId, next);
      })
      .catch(recordFailure("Kommentaren kunde inte sparas"));
  };
  return { comments, save };
}

function useCommentMarks(
  editor: Editor,
  comments: Comment[],
  draft: Anchor | null,
  onComment: (id: string) => void,
) {
  const open = comments
    .filter((comment) => !comment.replyTo && !comment.resolved)
    .map((comment) => ({ id: comment.id, anchor: comment, isNote: comment.isNote === true }));
  editor.modes.current.commentAnchors = draft ? [...open, { id: DRAFT_ID, anchor: draft }] : open;
  editor.modes.current.onComment = (id) => id !== DRAFT_ID && onComment(id);
  const { run } = editor;
  // Before paint, so the margin finds the marks when it places its cards.
  useLayoutEffect(() => run(refreshComments, false), [comments, draft, run]);
}

function withResolved(comments: Comment[], id: string, resolved: boolean) {
  return comments.map((comment) => (comment.id === id ? { ...comment, resolved } : comment));
}

// With its replies, which belong to it.
const withoutComment = (comments: Comment[], id: string) =>
  comments.filter((comment) => comment.id !== id && comment.replyTo !== id);

// A comment begun in one scene is not left waiting in the next.
function useDraft(sceneId: string | undefined) {
  const [draft, setDraft] = useState<Anchor | null>(null);
  useEffect(() => setDraft(null), [sceneId]);
  return [draft, setDraft] as const;
}

export function useComments(parts: {
  project: Project | null;
  scene: OpenScene | null;
  editor: Editor;
  author: string;
}) {
  const { comments, save } = useCommentFile(parts.project, parts.scene);
  const [draft, setDraft] = useDraft(parts.scene?.id);
  const [focused, setFocused] = useState<string | null>(null);
  const { editor } = parts;
  useCommentMarks(editor, comments, draft, setFocused);
  const start = useCallback(() => setDraft(selectedAnchor(editor)), [editor]);
  useCommandKey("comment", start);
  const author = parts.author || t("Du");
  return {
    comments,
    draft,
    focused,
    focus: setFocused,
    start,
    cancel: () => setDraft(null),
    add: (body: string, isNote = false) => {
      if (draft) save([...comments, newComment(draft, body, author, isNote)]);
      setDraft(null);
    },
    reply: (to: Comment, body: string) => save([...comments, newReply(to, body, author)]),
    setResolved: (id: string, resolved: boolean) => save(withResolved(comments, id, resolved)),
    remove: (id: string) => save(withoutComment(comments, id)),
  };
}
