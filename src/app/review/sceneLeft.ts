import { useEffect, useState } from "react";
import { documentText } from "../../editor/documentText.js";
import { parseMarkdown } from "../../manuscript/parseMarkdown.js";
import { revisionChanges } from "../../manuscript/revision.js";
import type { Comment } from "../../project/comments.js";
import { readRevision } from "../../project/revisions.js";
import { readSceneBodies } from "../../project/sceneSummaries.js";
import { joinPath } from "@llkit/storage/fileSystem.js";
import type { AppState } from "../App.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import { openTasks } from "./BookTasks.js";

type Left = Record<string, number>;

const isWaiting = (comment: Comment) => !comment.replyTo && !comment.resolved && !comment.isNote;

// Only the scenes with an editor's version waiting are read.
async function changesLeft({ dir }: Project): Promise<Left> {
  const files = await platform.fileSystem.list(joinPath(dir, "redigering")).catch(() => []);
  const ids = files.filter((name) => name.endsWith(".txt")).map((name) => name.slice(0, -4));
  const bodies = await readSceneBodies(
    platform.fileSystem,
    ids.map((id) => ({ dir, id })),
  );
  const counted = await Promise.all(
    ids.map(async (id) => {
      const revised = await readRevision(platform.fileSystem, dir, id);
      const body = bodies[id];
      if (revised === null || body === undefined) return [id, 0] as const;
      return [id, revisionChanges(documentText(parseMarkdown(body)).text, revised).length] as const;
    }),
  );
  return Object.fromEntries(counted);
}

async function leftPerScene(project: Project): Promise<Left> {
  const [left, tasks] = await Promise.all([changesLeft(project), openTasks(project)]);
  for (const { sceneId, comment } of tasks)
    if (isWaiting(comment)) left[sceneId] = (left[sceneId] ?? 0) + 1;
  return left;
}

/** In Redigera, what waits in each scene: the editor's changes and the open comments. The open
 *  scene counts from the editor, so a Godta shows at once; the others from their files. */
export function useLeftPerScene(app: AppState, project: Project): Left | undefined {
  const isOn = app.writingMode.step === "redigera";
  const sceneId = app.scene?.id ?? null;
  const [left, setLeft] = useState<Left>({});
  useEffect(() => {
    if (!isOn) return;
    let isLive = true;
    void leftPerScene(project)
      .then((found) => isLive && setLeft(found))
      .catch(() => undefined);
    return () => void (isLive = false);
  }, [isOn, project, sceneId]);
  if (!isOn) return undefined;
  if (!sceneId) return left;
  const open = app.revision.changes.length + app.comments.comments.filter(isWaiting).length;
  return { ...left, [sceneId]: open };
}
