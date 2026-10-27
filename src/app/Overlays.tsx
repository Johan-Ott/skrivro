import { joinPath } from "@llkit/storage/fileSystem.js";
import { labelsOf } from "../project/labels.js";
import { useSettledDoc } from "../editor/editorStore.js";
import { PAUSE_MS } from "../editor/repetitionMarks.js";
import type { ManuscriptScope } from "../editor/manuscriptSearch.js";
import { useCallback, useMemo } from "react";
import { useAutoBackup } from "./useAutoBackup.js";
import { ConflictLayer } from "./ConflictLayer.js";
import { CommandPalette } from "./palette/CommandPalette.js";
import type { usePalette } from "./palette/usePalette.js";
import {
  writeOverScene,
  type DiskConflict,
  type OpenScene,
  type SceneSession,
} from "./sceneSession.js";
import type { Snapshot } from "../project/snapshots.js";
import type { WriteGuard } from "../sync/localSide.js";
import type { Beside } from "./beside/BesidePane.js";
import { SnapshotsLayer } from "./snapshots/SnapshotsDialog.js";
import { draftBeside, DraftsLayer } from "./drafts/DraftsDialog.js";
import type { Drafts } from "./drafts/useDrafts.js";
import type { Draft } from "../project/drafts.js";
import type { useSnapshots } from "./snapshots/useSnapshots.js";
import { CrashDialog } from "./SyncLayer.js";
import type { SyncReview } from "./sync/useSyncReview.js";
import type { useEditorView } from "../editor/useEditorView.js";
import type { Project } from "./useProject.js";
import { MentionCard } from "./notes/MentionCard.js";
import type { Notes } from "./notes/useNotes.js";
import type { CardActions } from "./notes/cardActions.js";
import type { View } from "./useWritingMode.js";
import { ExportStatus } from "./exporting/ExportPanels.js";
import type { useExport } from "./exporting/useExport.js";
import type { WritingSettings } from "../editor/writingSettings.js";
import { SettingsLayer, type useSettingsDialog } from "./settings/SettingsDialog.js";
import { bookLanguage } from "../project/bookLanguage.js";
import type { useStartup } from "./useStartup.js";
import type { SettingsChange } from "./useWritingSettings.js";
import { useDriveSync, type DriveSync } from "./useDriveSync.js";
import type { TreeNode } from "../project/tree.js";
import { Celebrations } from "./journey/Celebrations.js";

interface OverlayParts {
  project: Project | null;
  homes: Project[];
  scene: OpenScene | null;
  session: SceneSession;
  conflict: DiskConflict | null;
  editor: ReturnType<typeof useEditorView>;
  search: { scope: ManuscriptScope };
  refresh: () => Promise<void>;
  updateTree: (tree: TreeNode[]) => Promise<void>;
  series: Project | null;
  seriesState: { refreshSeries: () => Promise<void> };
  updateFields: (fields: Record<string, unknown>) => Promise<void>;
  syncReview: SyncReview;
  snapshots: ReturnType<typeof useSnapshots>;
  drafts: Drafts;
  palette: ReturnType<typeof usePalette>;
  notes: Notes;
  cards: CardActions;
  zip: ReturnType<typeof useExport>;
  startup: Pick<ReturnType<typeof useStartup>, "preferences" | "updatePreferences">;
  writingMode: {
    settings: WritingSettings;
    onChangeSettings: (change: SettingsChange) => void;
    settingsDialog: ReturnType<typeof useSettingsDialog>;
    setView: (view: View) => void;
    openSearchWith: (text: string) => void;
    setBeside: (beside: Beside | null) => void;
  };
}

function MentionLayer({ app }: { app: OverlayParts }) {
  const { notes, project } = app;
  if (!project) return null;
  const openNote = (id: string) => {
    notes.hideMention();
    app.cards.open(id);
  };
  return <MentionCard notes={notes} homes={app.homes} onOpenNote={openNote} />;
}

function bookSettings(app: OverlayParts, drive: DriveSync) {
  if (!app.project) return null;
  return {
    language: bookLanguage(app.project.fields),
    onChangeLanguage: (language: string) => void app.updateFields({ language }),
    onExportZip: app.zip.backup,
    snapshotsDir: joinPath(app.project.dir, "snapshots"),
    drive,
    syncChanges: app.syncReview.items.length,
    onShowSyncChanges: () => {
      app.writingMode.settingsDialog.close();
      app.writingMode.setView("synk");
    },
  };
}

function PaletteLayer({ app }: { app: OverlayParts }) {
  if (!app.palette.isOpen) return null;
  const search = (text: string) => {
    app.writingMode.setView("skriv");
    app.search.scope.setOn(true);
    app.writingMode.openSearchWith(text);
  };
  return (
    <CommandPalette
      entries={app.palette.entries}
      labels={app.project ? labelsOf(app.project.fields) : []}
      onClose={app.palette.close}
      onSearch={search}
    />
  );
}

// The sync and the copies live here, not in the dialog, so they run while the dialog is closed.
function SettingsAndSync({ app }: { app: OverlayParts }) {
  const { preferences, updatePreferences } = app.startup;
  const dirs = [app.project?.dir, app.series?.dir].filter((dir) => dir !== undefined);
  // The same function from render to render, or the sync would start again on every one.
  const { refresh: refreshBook } = app;
  const { refreshSeries } = app.seriesState;
  const refresh = useCallback(
    async () => void (await Promise.all([refreshBook(), refreshSeries()])),
    [refreshBook, refreshSeries],
  );
  const { session } = app;
  const guard = useCallback<WriteGuard>(
    (path, write) => writeOverScene(session, path, write),
    [session],
  );
  const synced = useMemo(() => ({ refresh, guard }), [refresh, guard]);
  const drive = useDriveSync(dirs, preferences, updatePreferences, synced);
  useAutoBackup(dirs, app.project);
  return (
    <SettingsLayer
      {...app.startup}
      {...app.writingMode}
      dialog={app.writingMode.settingsDialog}
      book={bookSettings(app, drive)}
    />
  );
}

// The version goes beside the open text, and the dialog closes so the writing can go on.
function compareBeside(app: OverlayParts, snapshot: Snapshot) {
  const { scene } = app;
  if (!scene) return;
  app.writingMode.setBeside({ kind: "version", dir: scene.dir, sceneId: scene.id, snapshot });
  app.snapshots.close();
}

// As a version is: beside the open text, with the dialog closed.
function readDraftBeside(app: OverlayParts, draft: Draft) {
  const beside = app.project && draftBeside(app.project, draft);
  if (beside) app.writingMode.setBeside(beside);
  app.drafts.close();
}

export function Overlays({ app }: { app: OverlayParts }) {
  // A version is compared with the text as it stood at the last pause.
  const doc = useSettledDoc(app.editor, PAUSE_MS);
  return (
    <>
      <ConflictLayer {...app} />
      {app.project && <CrashDialog project={app.project} refresh={app.refresh} />}
      <SnapshotsLayer
        state={app.snapshots}
        sceneTitle={app.scene?.title ?? ""}
        doc={doc}
        onBeside={(snapshot) => compareBeside(app, snapshot)}
      />
      <DraftsLayer
        drafts={app.drafts}
        project={app.project}
        onBeside={(draft) => readDraftBeside(app, draft)}
      />
      <SettingsAndSync app={app} />
      <MentionLayer app={app} />
      <PaletteLayer app={app} />
      <ExportStatus exporter={app.zip} onOpenScene={() => undefined} />
      <Celebrations />
    </>
  );
}
