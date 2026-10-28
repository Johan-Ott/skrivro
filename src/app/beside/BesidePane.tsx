import { CloseButton } from "@llkit/controls.js";
import { useEditorState } from "../../editor/editorStore.js";
import type { Node } from "prosemirror-model";
import { useEffect, useState } from "react";
import { plainText } from "../../manuscript/compare.js";
import { parseMarkdown } from "../../manuscript/parseMarkdown.js";
import { splitSceneFile } from "../../manuscript/sceneFile.js";
import { snapshotWhen, type Snapshot } from "../../project/snapshots.js";
import { scenePath } from "../../storage/sceneId.js";
import type { AppState } from "../App.js";
import { SceneText } from "../contents/sceneDocs.js";
import { FileContent } from "../notes/ResearchFile.js";
import { platform } from "../platform.js";
import { DiffText } from "../snapshots/SnapshotsDialog.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

/** What shows beside the text: another text to read, or a version of the open one to compare. */
export type Beside =
  | { kind: "text"; dir: string; sceneId: string }
  | { kind: "version"; dir: string; sceneId: string; snapshot: Snapshot };

export function useBeside() {
  const [beside, setBeside] = useState<Beside | null>(null);
  return { beside, setBeside };
}

// Read again when the project is, so a text saved elsewhere shows as it is now.
function useBesideDoc(beside: Beside | null, project: Project) {
  const [doc, setDoc] = useState<Node | null>(null);
  const path = beside ? scenePath(beside.dir, beside.sceneId) : null;
  useEffect(() => {
    setDoc(null);
    if (!path) return;
    let isCurrent = true;
    void platform.fileSystem
      .readText(path)
      .then((text) => isCurrent && setDoc(parseMarkdown(splitSceneFile(text).body)))
      .catch(() => undefined);
    return () => void (isCurrent = false);
  }, [path, project]);
  return doc;
}

function titleOf(app: AppState, beside: Beside) {
  const summaries = { ...app.series?.summaries, ...app.project?.summaries };
  const title = summaries[beside.sceneId]?.title ?? "";
  if (beside.kind === "text") return title;
  const when = beside.snapshot.label ?? snapshotWhen(beside.snapshot.time, Date.now());
  return t("{title}, jämförd med {when}", { title, when });
}

// A version is compared with the open text when that is the one, otherwise with its saved text.
function besideBody(app: AppState, beside: Beside, doc: Node | null, open: Node | undefined) {
  if (beside.kind === "text") return <SceneText doc={doc ?? undefined} />;
  const live = app.scene?.id === beside.sceneId ? open : doc;
  const now = live ? live.textBetween(0, live.content.size, "\n\n") : "";
  return <DiffText before={plainText(beside.snapshot.body, "\n\n")} now={now} />;
}

/** Another text, or an older version of this one, beside the text being written. */
export function BesidePane({ app, project }: { app: AppState; project: Project }) {
  const { beside, setBeside } = app.writingMode;
  const doc = useBesideDoc(beside, project);
  const open = useEditorState(app.editor)?.doc;
  if (!beside) return null;
  const file = beside.kind === "text" ? project.summaries[beside.sceneId]?.file : undefined;
  return (
    <aside className="beside-pane" aria-label={t("Bredvid")}>
      <div className="beside-header">
        <span className="beside-title">{titleOf(app, beside)}</span>
        <CloseButton onClose={() => setBeside(null)} />
      </div>
      <div className="beside-body manuscript">
        {file && <FileContent dir={project.dir} name={file} />}
        {besideBody(app, beside, doc, open)}
      </div>
    </aside>
  );
}
