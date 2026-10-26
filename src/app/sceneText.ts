import type { Node } from "prosemirror-model";
import { joinSceneFile } from "../manuscript/sceneFile.js";
import { serializeMarkdown } from "../manuscript/serializeMarkdown.js";
import type { SceneSession } from "./sceneSession.js";

/** The open text as its file holds it: a note's lists as Markdown lists, a scene's as styles. */
export function textOf(session: SceneSession, doc: Node) {
  const { scene } = session;
  const isNote = scene ? session.isNote(scene.dir, scene.id) : false;
  const body = serializeMarkdown(doc, { isNote });
  return joinSceneFile({ frontMatter: scene?.frontMatter ?? "", body });
}
