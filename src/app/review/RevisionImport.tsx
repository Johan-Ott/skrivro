import { useState } from "react";
import { documentText } from "../../editor/documentText.js";
import { readBookScenes } from "../../export/book.js";
import { writeRevision } from "../../project/revisions.js";
import {
  newComment,
  readComments as loadComments,
  writeComments,
  type Comment,
} from "../../project/comments.js";
import type { WordComment } from "../../import/docxComments.js";
import { Dialog } from "@llkit/controls.js";
import { recordFailure } from "@llkit/errorLog.js";
import { platform } from "../platform.js";
import type { AppState } from "../App.js";
import { openIfOnDisk } from "../useSceneSession.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

const WORD = { name: t("Word-dokument"), extensions: ["docx"] };

/** What reading the file found: the scenes changed, how many scenes it held, and new comments. */
interface ReadBack {
  changed: string[];
  found: number;
  comments: number;
}

// Only scenes whose text differs get an editor's version; the rest are left alone.
async function readEditorsFile(project: Project): Promise<ReadBack | null> {
  const picked = await platform.pickFile(WORD);
  if (!picked) return null;
  const { revisionTexts } = await import("../../import/revisionImport.js");
  const texts = await revisionTexts(picked.bytes);
  const changed: string[] = [];
  for (const [sceneId, text] of texts) {
    if (!project.scenes.includes(sceneId)) continue;
    const scenes = await readBookScenes(platform.fileSystem, project.dir, [sceneId], {});
    const doc = scenes.get(sceneId);
    if (doc && documentText(doc).text === text) continue;
    await writeRevision(platform.fileSystem, project.dir, sceneId, text);
    changed.push(sceneId);
  }
  const comments = await readComments(project, picked.bytes);
  return { changed, found: texts.size, comments };
}

const isSame = (one: Comment, other: WordComment) =>
  one.quote === other.quote && one.body === other.body && one.author === other.author;

// Each comment joins its scene's own, unless it is there already from reading the file before.
async function readComments(project: Project, docx: Uint8Array) {
  const { docxComments } = await import("../../import/docxComments.js");
  const { fileSystem } = platform;
  let added = 0;
  for (const found of await docxComments(docx)) {
    if (!project.scenes.includes(found.sceneId)) continue;
    const existing = await loadComments(fileSystem, project.dir, found.sceneId);
    if (existing.some((comment) => isSame(comment, found))) continue;
    const comment = newComment(found, found.body, found.author || t("Testläsare"));
    await writeComments(fileSystem, project.dir, found.sceneId, [...existing, comment]);
    added++;
  }
  return added;
}

function ChangedScenes(props: {
  project: Project;
  readBack: ReadBack;
  onOpenScene: (id: string) => void;
}) {
  const { readBack } = props;
  return (
    <>
      <p>
        {t(
          "Redaktören har ändrat i {count} scener. Öppna en och gå igenom ändringarna under Granska.",
          { count: readBack.changed.length },
        )}
      </p>
      <div className="revision-scenes">
        {readBack.changed.map((sceneId) => (
          <button key={sceneId} className="link-button" onClick={() => props.onOpenScene(sceneId)}>
            {props.project.summaries[sceneId]?.title ?? sceneId}
          </button>
        ))}
      </div>
    </>
  );
}

function ReadBackMessage(props: {
  project: Project;
  readBack: ReadBack;
  onOpenScene: (id: string) => void;
}) {
  const { readBack } = props;
  if (readBack.found === 0 && readBack.comments === 0) {
    return (
      <p>
        {t(
          "Filen saknar Skrivros markeringar. Läs in ett manus som exporterats från Skrivro och redigerats i Word.",
        )}
      </p>
    );
  }
  return (
    <>
      {readBack.comments > 0 && (
        <p>{t("{count} nya kommentarer finns nu i Granska.", { count: readBack.comments })}</p>
      )}
      {readBack.changed.length > 0 ? (
        <ChangedScenes {...props} />
      ) : (
        <p>{t("Ingen har ändrat något i texten.")}</p>
      )}
    </>
  );
}

/** "Läs in kommenterad Word-fil": the menu item, and the answer once the file is read. */
export function useRevisionImport(
  project: Project,
  onRead: () => void,
  onOpenScene: (id: string) => void,
) {
  const [readBack, setReadBack] = useState<ReadBack | null>(null);
  const open = () =>
    void readEditorsFile(project)
      .then((found) => {
        setReadBack(found);
        onRead();
      })
      .catch(recordFailure("Redigering"));
  const close = () => setReadBack(null);
  const layer = readBack && (
    <Dialog label={t("Ändringar och kommentarer")} onClose={close}>
      <ReadBackMessage
        project={project}
        readBack={readBack}
        onOpenScene={(id) => (close(), onOpenScene(id))}
      />
      <div className="dialog-actions">
        <button className="button primary" onClick={close}>
          {t("Stäng")}
        </button>
      </div>
    </Dialog>
  );
  return { open, layer };
}

// Read anew after the file, so the new comments show at once, in Redigera.
export const useEditorsFile = (app: AppState, project: Project) =>
  useRevisionImport(
    project,
    () => {
      app.revision.reload();
      void app.refresh();
      app.writingMode.goTo("redigera");
    },
    (id) => openIfOnDisk(app.session, project, id),
  );
