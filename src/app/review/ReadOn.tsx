import { readingScenes, type ReadingScene } from "../../project/reading.js";
import type { AppState } from "../App.js";
import { SceneText, useSceneDocs } from "../contents/sceneDocs.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

type ReadOnProps = {
  app: AppState;
  project: Project;
  onOpen: (sceneId: string) => void;
};

// A chapter's first scene names its chapter; the others follow a scene break with their title.
function seamText(summaries: Project["summaries"], scene: ReadingScene) {
  const { chapter } = scene;
  if (chapter?.isFirstScene)
    return t("Kapitel {number} · {title}", { number: chapter.number, title: chapter.title });
  const title = summaries[scene.sceneId]?.title ?? "";
  return `* * *   ${title}`;
}

function ShownReadOn({ app, project, sceneId, onOpen }: ReadOnProps & { sceneId: string }) {
  const scenes = readingScenes(project.tree);
  const index = scenes.findIndex((scene) => scene.sceneId === sceneId);
  const after = index < 0 ? [] : scenes.slice(index + 1);
  const ids = after.map((scene) => scene.sceneId);
  const docs = useSceneDocs(project, ids, app.session.autosave.flush);
  if (!docs || after.length === 0) return null;
  return (
    <div className="manuscript read-on">
      {after.map((scene) => (
        <section
          key={scene.sceneId}
          className="read-on-scene"
          onClick={() => onOpen(scene.sceneId)}
        >
          <button className="read-on-seam">{seamText(project.summaries, scene)}</button>
          <SceneText doc={docs[scene.sceneId]} />
        </section>
      ))}
    </div>
  );
}

/** Redigera reads on as an editor does: the scenes after the open one follow on the same sheet.
 *  A click opens the scene, so what waits in it can be gone through. */
export function ReadOn(props: ReadOnProps) {
  const sceneId = props.app.scene?.id;
  if (props.app.writingMode.step !== "redigera" || !sceneId) return null;
  return <ShownReadOn {...props} sceneId={sceneId} />;
}
