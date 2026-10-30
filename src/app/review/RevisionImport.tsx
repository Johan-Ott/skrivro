import { useState } from "react";
import { documentText } from "../../editor/documentText.js";
import { readBookScenes } from "../../export/book.js";
import { revisionChanges } from "../../manuscript/revision.js";
import { writeRevision } from "../../project/revisions.js";
import { readRounds, withRound, writeRounds } from "../../project/rounds.js";
import {
  newComment,
  readComments as loadComments,
  writeComments,
  type Comment,
} from "../../project/comments.js";
import type { WordComment } from "../../import/docxComments.js";
import type { EditorsFile } from "../../import/revisionImport.js";
import { Dialog } from "@llkit/controls.js";
import { recordFailure } from "@llkit/errorLog.js";
import { platform } from "../platform.js";
import type { AppState } from "../App.js";
import { openIfOnDisk } from "../useSceneSession.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

const WORD = { name: t("Word-dokument"), extensions: ["docx"] };

type Counts = Record<string, number>;

/** What reading the file found: the scenes changed, how many scenes it held, new comments, and
 *  whether it was a round with the editor, whose letter then says the rest. */
interface ReadBack {
  changed: string[];
  found: number;
  comments: number;
  isRound: boolean;
}

// Only scenes whose text differs get an editor's version; the rest are left alone.
async function writeChanged(project: Project, texts: Map<string, string>) {
  const changes: Counts = {};
  for (const [sceneId, text] of texts) {
    if (!project.scenes.includes(sceneId)) continue;
    const scenes = await readBookScenes(platform.fileSystem, project.dir, [sceneId], {});
    const doc = scenes.get(sceneId);
    const current = doc ? documentText(doc).text : "";
    if (doc && current === text) continue;
    await writeRevision(platform.fileSystem, project.dir, sceneId, text);
    changes[sceneId] = revisionChanges(current, text).length;
  }
  return changes;
}

const sum = (counts: Counts) => Object.values(counts).reduce((total, count) => total + count, 0);

// A file sent with Skicka till redaktör is a round: what came back is kept with the letter.
async function writeRound(project: Project, file: EditorsFile, changes: Counts, comments: Counts) {
  const ids = [...new Set([...Object.keys(changes), ...Object.keys(comments)])];
  const counts = (id: string) => ({ changes: changes[id] ?? 0, comments: comments[id] ?? 0 });
  const back = Object.fromEntries(ids.map((id) => [id, counts(id)]));
  const { sentAt, editor, letter } = file;
  const round = { sentAt, editor, letter: letter ?? "", back, answer: "", isRead: false };
  const { fileSystem } = platform;
  const rounds = await readRounds(fileSystem, project.dir);
  await writeRounds(fileSystem, project.dir, withRound(rounds, { ...round, backAt: Date.now() }));
}

async function readEditorsFile(project: Project): Promise<ReadBack | null> {
  const picked = await platform.pickFile(WORD);
  if (!picked) return null;
  const { editorsFile } = await import("../../import/revisionImport.js");
  const file = await editorsFile(picked.bytes);
  const changes = await writeChanged(project, file.texts);
  const comments = await readComments(project, picked.bytes);
  const isRound = file.letter !== null;
  if (isRound) await writeRound(project, file, changes, comments);
  const changed = Object.keys(changes);
  return { changed, found: file.texts.size, comments: sum(comments), isRound };
}

const isSame = (one: Comment, other: WordComment) =>
  one.quote === other.quote && one.body === other.body && one.author === other.author;

// Each comment joins its scene's own, unless it is there already from reading the file before.
async function readComments(project: Project, docx: Uint8Array) {
  const { docxComments } = await import("../../import/docxComments.js");
  const { fileSystem } = platform;
  const added: Counts = {};
  for (const found of await docxComments(docx)) {
    if (!project.scenes.includes(found.sceneId)) continue;
    const existing = await loadComments(fileSystem, project.dir, found.sceneId);
    if (existing.some((comment) => isSame(comment, found))) continue;
    const comment = newComment(found, found.body, found.author || t("Testläsare"));
    await writeComments(fileSystem, project.dir, found.sceneId, [...existing, comment]);
    added[found.sceneId] = (added[found.sceneId] ?? 0) + 1;
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

/** "Läs in kommenterad Word-fil": the menu item, and the answer once the file is read; a round
 *  with the editor answers with its letter instead. */
export function useRevisionImport(
  project: Project,
  onRead: () => void,
  onOpenScene: (id: string) => void,
) {
  const [readBack, setReadBack] = useState<ReadBack | null>(null);
  const open = () =>
    void readEditorsFile(project)
      .then((found) => {
        setReadBack(found?.isRound ? null : found);
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
      app.rounds.reload();
      void app.refresh();
      app.writingMode.goTo("redigera");
    },
    (id) => openIfOnDisk(app.session, project, id),
  );
