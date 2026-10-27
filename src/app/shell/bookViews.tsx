import type { AppState } from "../App.js";
import { askForReviewOnNextScreen } from "../review/reviewWanted.js";
import { ContentsView } from "../contents/ContentsView.js";
import { ReadView } from "../contents/ReadView.js";
import { cursorAtBlock } from "../../editor/commands.js";
import { sidebarProps } from "../paneProps.js";
import { PublishView } from "../publish/PublishView.js";
import { StudioView } from "../studio/StudioView.js";
import { useState } from "react";
import { openScene, writeOverScene } from "../sceneSession.js";
import { SyncView } from "../sync/SyncReview.js";
import { openIfOnDisk } from "../useSceneSession.js";
import type { Project } from "../useProject.js";
import type { PageMap } from "../../project/pageMap.js";
import { sceneIdsIn } from "../../project/tree.js";
import { t } from "../../i18n/i18n.js";

// Innehåll, Läs, Publicera and Från synken: the same on the computer and on a phone, where
// only the way back and the way into a text differ.

export interface ViewProps {
  app: AppState;
  project: Project;
  onBack: () => void;
}

// A failed export names the scene by title, so it is found by its title.
function openSceneTitled(app: AppState, project: Project, title: string) {
  const id = Object.keys(project.summaries).find((key) => project.summaries[key]?.title === title);
  if (!id) return;
  app.writingMode.setView("skriv");
  openIfOnDisk(app.session, project, id);
}

function openAt(app: AppState, project: Project, sceneId: string, blockIndex: number) {
  app.writingMode.setView("skriv");
  void openScene(app.session, project.dir, sceneId).then(
    (isOpen) => isOpen && app.editor.run(cursorAtBlock(blockIndex)),
  );
}

export function ContentsScreen(
  props: Omit<ViewProps, "onBack"> & {
    pageMap: PageMap | null;
    onOpenScene?: (id: string) => void;
  },
) {
  const { app, project } = props;
  return (
    <ContentsView
      project={project}
      pageMap={props.pageMap}
      stats={app.stats}
      notes={app.notes}
      onOpenScene={props.onOpenScene ?? sidebarProps(app, project).onOpenScene}
      onChangeTree={(tree) => void app.updateTree(tree)}
      onSaveFields={(fields) => void app.updateFields(fields)}
      onSetStatus={(ids, status) =>
        ids.forEach((id) => app.treeHandlers.onSetSceneStatus(id, status))
      }
      onReadBook={() => app.writingMode.read(null)}
      onShowDrafts={() => app.drafts.show(null)}
      onShowTasks={() => (app.writingMode.setView("skriv"), app.writingMode.setReviewOpen(true))}
    />
  );
}

// A chapter opens on its first page; the whole book where the writer is.
function startScene(app: AppState, project: Project) {
  const chapterId = app.writingMode.readChapterId;
  if (chapterId) return sceneIdsIn(project.tree, chapterId)[0] ?? null;
  return app.session.scene?.id ?? null;
}

export function ReadScreen({ app, project, onBack }: ViewProps) {
  return (
    <ReadView
      project={project}
      author={app.startup.preferences.authorName}
      startScene={startScene(app, project)}
      saving={{
        dir: project.dir,
        author: app.startup.preferences.authorName || t("Du"),
        writeOver: (path, write) => writeOverScene(app.session, path, write),
        onSaved: app.refresh,
      }}
      onOpenAt={(sceneId, blockIndex) => openAt(app, project, sceneId, blockIndex)}
      onBack={onBack}
      onDesign={() => app.writingMode.setView("publicera")}
      beforeRead={app.session.autosave.flush}
    />
  );
}

// The writer for the Studio's cards: the name from the settings, the rest from the profile.
const authorOf = (app: AppState) => ({
  name: app.startup.preferences.authorName,
  picture: app.profile.profile.picture,
  frame: app.profile.profile.frame,
  title: app.profile.profile.title,
});

// Back to the text with Granska open, where the placeholders are listed.
function showToCheck(app: AppState, onBack: () => void) {
  askForReviewOnNextScreen();
  onBack();
  app.writingMode.setReviewOpen(true);
}

export function PublishScreen({ app, project, onBack }: ViewProps) {
  const [isStudio, setStudio] = useState(false);
  const saveFields = (fields: Record<string, unknown>) => void app.updateFields(fields);
  if (isStudio)
    return (
      <StudioView
        project={project}
        stats={app.stats}
        journey={app.journey.journey}
        link={app.profile.profile.link}
        about={app.profile.profile.about}
        author={authorOf(app)}
        onSaveFields={saveFields}
        onBack={() => setStudio(false)}
      />
    );
  return (
    <PublishView
      project={project}
      generalAuthor={app.startup.preferences.authorName}
      onSaveFields={saveFields}
      onOpenScene={(title) => openSceneTitled(app, project, title)}
      onBack={onBack}
      onShowToCheck={() => showToCheck(app, onBack)}
      onStudio={() => setStudio(true)}
    />
  );
}

export const SyncScreen = ({ app, project, onBack }: ViewProps) => (
  <SyncView project={project} review={app.syncReview} onBack={onBack} />
);
