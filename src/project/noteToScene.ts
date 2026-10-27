import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import type { FileSystem } from "@llkit/storage/fileSystem.js";
import { UNANSWERED_FIELD_AND_GAP } from "../manuscript/prompts.js";
import { joinSceneFile, splitSceneFile } from "../manuscript/sceneFile.js";
import { scenePath } from "../storage/sceneId.js";
import { t } from "../i18n/i18n.js";
import { takeSnapshot } from "./snapshots.js";
import { noteIdsOf } from "./cards.js";
import { manuscriptSceneIds, type TreeNode } from "./tree.js";

// A note made a scene loses the template's questions and the bold labels above its fields; what
// was written under a label stays. A comment of the writer's under a bold line counts as a question.

/** The note's text without its unanswered questions, and nothing else changed. */
export const withoutQuestions = (body: string) => body.replace(UNANSWERED_FIELD_AND_GAP, "");

const LABEL_LINE = /^\*\*[^*\n]+:\*\*[ \t]*(?:\r?\n(?:[ \t]*\r?\n)*|(?![\s\S]))/gm;

/** The note's text as a scene: without its unanswered questions, and without the labels. */
export const withoutTemplate = (body: string) => withoutQuestions(body).replace(LABEL_LINE, "");

/** The notes of `before` that `after` holds in the manuscript. */
export function notesMadeScenes(before: TreeNode[], after: TreeNode[]) {
  const notes = noteIdsOf(before);
  return manuscriptSceneIds(after).filter((id) => notes.has(id));
}

/** Written only where something goes, so a note without questions is not touched. */
export async function cleanNotesMadeScenes(fileSystem: FileSystem, dir: string, ids: string[]) {
  for (const id of ids) {
    const path = scenePath(dir, id);
    const text = await fileSystem.readText(path);
    const { frontMatter, body } = splitSceneFile(text);
    const cleaned = withoutTemplate(body);
    if (cleaned === body) continue;
    // Nothing goes without a way back: the note as it was is kept in Versioner.
    await takeSnapshot(fileSystem, { dir, id }, text, {
      time: Date.now(),
      label: t("Innan den blev scen"),
    });
    await writeAtomic(fileSystem, path, joinSceneFile({ frontMatter, body: cleaned }));
  }
}
