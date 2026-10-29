import { saveNoteAsTemplate } from "./notes/TemplateChips.js";
import { startLapp } from "./createLapp.js";
import { selectionBarOf } from "./selectionBarOf.js";
import { PersonSecrets, SecretPanel } from "./notes/SecretPanel.js";
import type { ProjectChange } from "./labels/LabelsDialog.js";
import { BesidePane } from "./beside/BesidePane.js";
import {
  CHARACTERS_ID,
  moveToTrash,
  SECRETS_ID,
  TRASH_ID,
  type TreeNode,
} from "../project/tree.js";
import { chapterOf } from "../project/treeLabels.js";
import type { AppState } from "./App.js";
import { trashedScene } from "./trashedScene.js";
import { saveAliases } from "./notes/aliasActions.js";
import { NoteHeader, NoteMentions, noteSortOf, type NotePageProps } from "./notes/NotePage.js";
import { NoteVoice } from "./notes/NoteVoice.js";
import { MarginNotes } from "./review/MarginNotes.js";
import { ReviewLayer } from "./review/ReviewLayer.js";
import { TextHeader } from "./TextHeader.js";
import { SceneStrip } from "./phone/SceneStrip.js";
import { openInHome } from "./notes/noteHomes.js";
import { SeriesNotes } from "./tree/TreeView.js";
import type { OpenScene } from "./sceneSession.js";
import type { Project } from "./useProject.js";
import { t } from "../i18n/i18n.js";

const openText = (app: AppState) => (id: string) => {
  app.writingMode.setView("skriv");
  openInHome(app.session, app.homes, id);
};

function focusLocation(project: Project, scene: OpenScene | null) {
  const chapter = scene ? chapterOf(project.tree, scene.id) : null;
  const title = scene?.title ?? "";
  return chapter ? t("Kapitel {number} · {title}", { number: chapter.number, title }) : title;
}

function sceneHeader(app: AppState, project: Project, sceneId: string) {
  return (
    <>
      <TextHeader
        project={project}
        sceneId={sceneId}
        onChangeTree={(tree: TreeNode[]) => void app.updateTree(tree)}
        onReadChapter={(chapterId) => app.writingMode.read(chapterId)}
        onShowVersions={app.snapshots.show}
      />
      <SceneStrip app={app} />
    </>
  );
}

// The manuscript's first scene: notes live in sorts, and the trash is no place to go.
function firstSceneIn(nodes: TreeNode[]): string | null {
  for (const node of nodes) {
    if (node.kind === "scene") return node.id;
    if (node.kind === "sort" || node.id === TRASH_ID) continue;
    const found = firstSceneIn(node.children ?? []);
    if (found) return found;
  }
  return null;
}

// The welcome's way out: it goes to the trash, the book forgets it was ever there, and the
// book's first scene opens in its place.
function WelcomeFoot(props: { app: AppState; project: Project; id: string }) {
  if (props.project.fields["welcome"] !== props.id) return null;
  const remove = async () => {
    const tree = moveToTrash(props.project.tree, props.id);
    if (!tree) return;
    await props.app.updateProject({ tree, fields: { welcome: undefined } });
    const first = firstSceneIn(tree);
    if (first) openText(props.app)(first);
  };
  return (
    <div className="welcome-foot">
      <button className="button secondary" onClick={() => void remove()}>
        {t("Ta bort välkomsten")}
      </button>
    </div>
  );
}

// A secret's page says who learns it when; a person's page what they know. Book notes only.
function SecretParts(props: NotePageProps & { sortId: string; app: AppState }) {
  const parts = { ...props, onChangeTree: (tree: TreeNode[]) => void props.app.updateTree(tree) };
  if (props.sortId === SECRETS_ID) return <SecretPanel {...parts} />;
  if (props.sortId === CHARACTERS_ID) return <PersonSecrets {...parts} />;
  return null;
}

function textParts(app: AppState, project: Project) {
  const scene = app.scene;
  if (!scene) return { header: null, footer: null };
  const home = app.homes.find((candidate) => noteSortOf(candidate, scene.id) !== null);
  const sortId = home ? noteSortOf(home, scene.id) : null;
  if (!home || sortId === null)
    return { header: sceneHeader(app, project, scene.id), footer: null };
  const isInSeries = home !== project;
  const noteProps = {
    project: home,
    book: project,
    noteId: scene.id,
    notes: app.notes,
    onOpen: openText(app),
    onSaveFields: (fields: Record<string, unknown>) =>
      void (isInSeries ? app.seriesState.updateSeriesFields(fields) : app.updateFields(fields)),
    onSetAliases: (aliases: string[]) => void saveAliases(app, home, scene.id, aliases),
  };
  return {
    header: <NoteHeader {...noteProps} sortId={sortId} />,
    footer: (
      <>
        <WelcomeFoot app={app} project={project} id={scene.id} />
        {!isInSeries && <SecretParts {...noteProps} sortId={sortId} app={app} />}
        {sortId === CHARACTERS_ID && <NoteVoice {...noteProps} />}
        <NoteMentions {...noteProps} />
      </>
    ),
  };
}

export function sidebarProps(app: AppState, project: Project) {
  const { writingMode } = app;
  return {
    ...{ project, libraryDir: app.startup.preferences.libraryDir },
    openSceneId: writingMode.view === "skriv" ? (app.scene?.id ?? null) : null,
    ...{ isFollowingOpenScene: writingMode.settings.followOpenText, onOpenScene: openText(app) },
    isContentsShown: writingMode.view === "innehall",
    onShowContents: () => writingMode.setView("innehall"),
    onNewLapp: () => void startLapp(app, project),
    syncReviewCount: app.syncReview.toChoose,
    onShowSyncReview: () => writingMode.setView("synk"),
    ...{ onShowSnapshots: app.snapshots.show, onShowDrafts: app.drafts.show },
    onOpenBeside: (id: string) =>
      app.writingMode.setBeside({ kind: "text", dir: project.dir, sceneId: id }),
    onChangeTree: (tree: TreeNode[]) => void app.updateTree(tree),
    onUpdateProject: (change: ProjectChange) => void app.updateProject(change),
    onShowShelf: () => void app.showShelf(),
    onNewNote: (sortId: string | null) => app.setNewNoteSort(sortId),
    ...app.treeHandlers,
    onSetNoteLink: (id: string, isLinked: boolean) => void app.actions.notes.setLink(id, isLinked),
    seriesNotes: app.series && <SeriesNotes {...seriesTreeProps(app, app.series)} />,
    canMergeOpenScene: app.sceneSplit.canMerge,
    onMergeWithNext: app.sceneSplit.merge,
    ...seriesChoiceProps(app),
    ...templateProps(app, project),
  };
}

const templateProps = (app: AppState, project: Project) => ({
  onSaveAsTemplate: (id: string) =>
    void saveNoteAsTemplate(project, app.startup.preferences.libraryDir, id),
});

function seriesChoiceProps(app: AppState) {
  const choice = app.seriesChoice;
  return {
    onJoinSeries: (folder: string | null, seriesNumber: number | null) =>
      void choice.joinSeries(folder, seriesNumber),
    onCreateSeries: (title: string, noteIds: string[], seriesNumber: number | null) =>
      void choice.createAndJoin(title, noteIds, seriesNumber),
    ...(app.series ? { onMoveToSeries: (id: string) => void choice.moveToSeries([id]) } : {}),
  };
}

function seriesTreeProps(app: AppState, series: Project) {
  const { actions, writingMode } = app;
  return {
    project: series,
    name: series.name,
    openSceneId: writingMode.view === "skriv" ? (app.scene?.id ?? null) : null,
    onOpenScene: openText(app),
    onChangeTree: (tree: TreeNode[]) => void app.seriesState.updateSeriesTree(tree),
    onShowSnapshots: (id: string) => app.snapshots.show(id, series.dir),
    onOpenBeside: (id: string) =>
      app.writingMode.setBeside({ kind: "text", dir: series.dir, sceneId: id }),
    onNewNote: (sortId: string | null) => app.setNewNoteSort(sortId),
    ...app.seriesTreeHandlers,
    onSetNoteLink: (id: string, isLinked: boolean) =>
      void actions.series.notes.setLink(id, isLinked),
  };
}

export function writingAreaProps(app: AppState, project: Project) {
  const trashed = trashedScene(app, project);
  return {
    editor: app.editor,
    isReadOnly: project.isReadOnly,
    isLocked: project.isReadOnly || trashed !== null,
    trashed,
    isHidden: app.writingMode.view !== "skriv",
    hasScene: app.scene !== null,
    focusLocation: focusLocation(project, app.scene),
    ...textParts(app, project),
    ...app.writingMode,
    saveStatus: app.saveStatus,
    today: app.today,
    treeFailure: app.treeFailure,
    manuscriptSearch: app.search.scope,
    aside: <ReviewLayer app={app} project={project} />,
    margin: <MarginNotes app={app} />,
    beside: <BesidePane app={app} project={project} />,
    selectionBar: selectionBarOf(app, project),
    onRetrySave: () => void app.session.autosave.flush(),
    onSaveNow: app.session.autosave.flush,
    onNewScene: () => void app.actions.newItem("scene"),
  };
}
