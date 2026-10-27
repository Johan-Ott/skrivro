import { useEffect, useState } from "react";
import {
  bookPlaceholders,
  placeholdersOf,
  type PlaceholderTask,
} from "../../project/placeholderTasks.js";
import { manuscriptSceneIds } from "../../project/tree.js";
import { placeOf } from "../../project/treeLabels.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

/** The scene being written, as the editor has it, so a placeholder is gone from the list as soon as
 * it is deleted. The other scenes are read from disk when the book or the open scene changes. */
export interface OpenText {
  id: string;
  text: string;
}

export function usePlaceholders(project: Project, open: OpenText | null) {
  const [onDisk, setOnDisk] = useState<PlaceholderTask[]>([]);
  const { dir, tree } = project;
  const openId = open?.id ?? null;
  useEffect(() => {
    let isLive = true;
    const others = manuscriptSceneIds(tree).filter((id) => id !== openId);
    void bookPlaceholders(platform.fileSystem, dir, others)
      .then((found) => isLive && setOnDisk(found))
      .catch(() => undefined);
    return () => void (isLive = false);
  }, [dir, tree, openId]);
  return manuscriptSceneIds(tree).flatMap((id) =>
    open && id === open.id
      ? placeholdersOf(id, open.text)
      : onDisk.filter((task) => task.sceneId === id),
  );
}

/** Att kolla: a row per [?] in the book. It is done when the placeholder is gone. */
export function PlaceholderTasks(props: {
  project: Project;
  open: OpenText;
  onOpen: (sceneId: string) => void;
}) {
  const { project } = props;
  const tasks = usePlaceholders(project, props.open);
  if (tasks.length === 0) return null;
  return (
    <section className="review-section" aria-label={t("Att kolla")}>
      <span className="review-heading">{t("Att kolla")}</span>
      {tasks.map((task, index) => (
        <button
          key={`${task.sceneId}-${index}`}
          className="review-item book-task"
          onClick={() => props.onOpen(task.sceneId)}
        >
          <span className="kpi-sub">{placeOf(project.tree, project.summaries, task.sceneId)}</span>
          <span>{task.before ? `…${task.before} ${task.text}` : task.text}</span>
        </button>
      ))}
    </section>
  );
}

/** Before an export: placeholders are exported as they stand, so the writer sees how many are left. */
export function PlaceholderWarning(props: { project: Project; onShow: () => void }) {
  const count = usePlaceholders(props.project, null).length;
  if (count === 0) return null;
  return (
    <p className="setting-hint" role="status">
      {t("Platshållare kvar: {count}", { count })}{" "}
      <button className="link-button" onClick={props.onShow}>
        {t("Visa i Att kolla")}
      </button>
    </p>
  );
}
