import { useCallback, useEffect, useRef, useState } from "react";
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
import { platform } from "../platform.js";
import type { OpenScene } from "../sceneSession.js";
import { useCommandKey } from "../shortcuts.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

type Editor = ReturnType<typeof useEditorView>;

// Null when nothing is selected.
function selectedAnchor(editor: Editor): Anchor | null {
  const state = editor.viewRef.current?.state;
  if (!state || state.selection.empty) return null;
  const { text, fromDoc } = documentText(state.doc);
  return anchorAt(text, fromDoc(state.selection.from), fromDoc(state.selection.to));
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

function useCommentMarks(editor: Editor, comments: Comment[], onComment: (id: string) => void) {
  editor.modes.current.commentAnchors = comments
    .filter((comment) => !comment.replyTo && !comment.resolved)
    .map((comment) => ({ id: comment.id, anchor: comment }));
  editor.modes.current.onComment = onComment;
  const { run } = editor;
  useEffect(() => run(refreshComments, false), [comments, run]);
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
  useCommentMarks(editor, comments, setFocused);
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
    add: (body: string) => {
      if (draft) save([...comments, newComment(draft, body, author)]);
      setDraft(null);
    },
    reply: (to: Comment, body: string) => save([...comments, newReply(to, body, author)]),
    setResolved: (id: string, resolved: boolean) => save(withResolved(comments, id, resolved)),
    remove: (id: string) => save(withoutComment(comments, id)),
  };
}
