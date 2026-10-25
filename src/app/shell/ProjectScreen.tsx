import { addPackToBook } from "../templates/addPieces.js";
import { PacksLayer } from "../packs/PackList.js";
import { ProfileButton } from "../profile/ProfileLayer.js";
import type { MouseEvent } from "react";
import type { AppState } from "../App.js";
import { NewNoteDialog } from "../notes/NewNoteDialog.js";
import { Overlays } from "../Overlays.js";
import { InsightsLayer } from "../progress/InsightsPanel.js";
import { ResumeScreen } from "../resume/ResumeScreen.js";
import { ProfileLayer } from "../profile/ProfileLayer.js";
import { useBookTheme } from "../themes/themeStyle.js";
import { Sidebar } from "../Sidebar.js";
import { arrivingText, openIfOnDisk } from "../useSceneSession.js";
import type { Project } from "../useProject.js";
import { useCommandKey } from "../shortcuts.js";
import { WritingArea } from "../WritingArea.js";
import { sidebarProps, writingAreaProps } from "../paneProps.js";
import { ContentsScreen, PublishScreen, ReadScreen, SyncScreen } from "./bookViews.js";
import { ReviewPill, Topbar } from "./Topbar.js";
import { BlocksDock } from "../blocks/BlocksDock.js";
import { DayGoalLayer, showDayGoal } from "../progress/DayGoalLayer.js";
import { useAppMenu } from "./useAppMenu.js";
import { useNavigation, type Place } from "./useNavigation.js";
import { lastPageOf, pageFinder, scenePagesOf, usePageMap } from "../usePageMap.js";
import type { PageMap } from "../../project/pageMap.js";
import { chapterOf } from "../../project/treeLabels.js";
import { bookLook, runningHead } from "../bookLook.js";
import { t } from "../../i18n/i18n.js";
import { TextBands } from "../TextBands.js";

type ScreenProps = { app: AppState; project: Project };

function useScreenNavigation({ app, project }: ScreenProps) {
  const { writingMode, session } = app;
  const current: Place = { view: writingMode.view, sceneId: app.scene?.id ?? null };
  return useNavigation(current, (place) => {
    writingMode.setView(place.view);
    if (place.sceneId && place.sceneId !== session.scene?.id) {
      openIfOnDisk(session, project, place.sceneId);
    }
  });
}

type MenuOpen = (event: MouseEvent<HTMLElement>) => void;

function ScreenTopbar(props: ScreenProps & { onMenu: MenuOpen; onProgramMenu: MenuOpen }) {
  const { app, project } = props;
  const { writingMode } = app;
  const isPublishing = writingMode.view === "publicera";
  return (
    <Topbar
      view={writingMode.view}
      title={isPublishing ? t("Publicera {title}", { title: project.name }) : null}
      today={app.today}
      navigation={useScreenNavigation(props)}
      onMenu={props.onMenu}
      onProgramMenu={props.onProgramMenu}
      onToggleSidebar={writingMode.toggleSidebar}
      onView={writingMode.setView}
      onProgress={showDayGoal}
      onSearch={app.palette.open}
      // The button took the cursor from the text; it goes back there, where the writer was.
      onFocus={() => (writingMode.onToggleFocus(), app.editor.requestFocus())}
      onRead={() => writingMode.read(null)}
      profile={<ProfileButton app={app} />}
    />
  );
}

// In Skriv: the Granska pill, and the opening picture when a book opens where you left off.
function OverTheText({ app, project }: ScreenProps) {
  const { writingMode } = app;
  return (
    <>
      <BlocksDock
        app={app}
        project={project}
        review={
          <ReviewPill
            review={writingMode.review}
            onReview={() => writingMode.setReviewOpen(!writingMode.isReviewOpen)}
          />
        }
      />
      <DayGoalLayer app={app} project={project} />
      <ResumeScreen project={project} stats={app.stats} editor={app.editor} />
      <TextBands app={app} project={project} />
    </>
  );
}

const folioOf = (sceneId: string | null, pageMap: PageMap | null) => {
  const page = lastPageOf(sceneId, pageMap);
  return page === null ? null : { page };
};

// The open scene's pages in the margin, and the sheet around it: book and chapter above, page below.
function pageParts(app: AppState, project: Project, pageMap: PageMap | null) {
  const sceneId = app.scene?.id ?? null;
  const chapter = sceneId ? chapterOf(project.tree, sceneId) : null;
  return {
    scenePages: scenePagesOf(app, pageMap),
    runningHead: runningHead(project.fields, {
      title: project.name,
      author: app.startup.preferences.authorName,
      chapter: chapter?.title ?? "",
    }),
    bookLook: bookLook(project.fields),
    folio: folioOf(sceneId, pageMap),
    opensChapter: chapter?.isFirstScene === true,
  };
}

// Counting pages sets the whole book with Typst; for the sheet's page number alone it waits for a
// quiet moment, so it never slows the opening or every pause in the writing.
const SHEET_SETTLE_MS = 20_000;

function useScreenPages({ app, project }: ScreenProps) {
  const { view, settings } = app.writingMode;
  const isShown = view === "innehall" || settings.showPages || settings.tableOfContents;
  const settle = isShown ? undefined : SHEET_SETTLE_MS;
  return usePageMap(project, app.startup.preferences.authorName, isShown || settings.paper, settle);
}

function MainCard({ app, project, pageMap }: ScreenProps & { pageMap: PageMap | null }) {
  const { writingMode } = app;
  const views = { app, project, onBack: () => writingMode.setView("skriv") };
  return (
    <div className={writingMode.view === "publicera" ? "main-card hidden" : "main-card"}>
      <WritingArea {...writingAreaProps(app, project)} {...pageParts(app, project, pageMap)} />
      {writingMode.view === "skriv" && <OverTheText app={app} project={project} />}
      {writingMode.view === "innehall" && (
        <ContentsScreen app={app} project={project} pageMap={pageMap} />
      )}
      {writingMode.view === "synk" && <SyncScreen {...views} />}
      {writingMode.view === "las" && <ReadScreen {...views} />}
    </div>
  );
}

function Floating({ app, project }: ScreenProps) {
  const { writingMode } = app;
  return (
    <>
      <InsightsLayer app={app} project={project} />
      <ProfileLayer app={app} project={project} />
      {app.newNoteSort !== false && (
        <NewNoteDialog
          project={project}
          series={app.series}
          sortId={app.newNoteSort}
          onCreate={(note, isInSeries) => {
            writingMode.setView("skriv");
            void (isInSeries ? app.actions.series : app.actions).notes.newNote(note);
          }}
          onClose={() => app.setNewNoteSort(false)}
        />
      )}
      <Overlays app={app} />
      <PacksLayer
        onAdd={async (pack) => void app.updateProject(await addPackToBook(project, pack))}
      />
    </>
  );
}

// The book's theme on the page, and the keys that work on every view of it.
function useScreenKeysAndTheme({ app, project }: ScreenProps) {
  useCommandKey("splitScene", app.sceneSplit.split);
  useCommandKey("read", () => app.writingMode.read(null));
  useBookTheme(project.fields);
}

// The screen's look follows Fokus, the sidebar and the format row, and waits for the first text.
function screenClasses(
  writingMode: AppState["writingMode"],
  isPublishing: boolean,
  isArriving: boolean,
) {
  return [
    "app",
    isArriving && "arriving",
    writingMode.isFocusMode && "focus-mode",
    writingMode.isSidebarOpen && !isPublishing ? "sidebar-open" : "sidebar-closed",
    !isPublishing && "format-bar-on",
  ];
}

export function ProjectScreen({ app, project }: ScreenProps) {
  const { writingMode } = app;
  const menu = useAppMenu({ app, project });
  useScreenKeysAndTheme({ app, project });
  const isPublishing = writingMode.view === "publicera";
  const pageMap = useScreenPages({ app, project });
  const pageOf = writingMode.settings.tableOfContents
    ? pageFinder(pageMap, project.tree)
    : undefined;
  const classes = screenClasses(writingMode, isPublishing, arrivingText.use());
  return (
    <div className={classes.filter(Boolean).join(" ")}>
      <ScreenTopbar app={app} project={project} {...menu.openers} />
      {!isPublishing && <Sidebar {...sidebarProps(app, project)} pageOf={pageOf} />}
      <div className="sidebar-backdrop" onClick={() => writingMode.setSidebarOpen(false)} />
      <MainCard app={app} project={project} pageMap={pageMap} />
      {isPublishing && (
        <PublishScreen app={app} project={project} onBack={() => writingMode.setView("skriv")} />
      )}
      <Floating app={app} project={project} />
      {menu.menu}
    </div>
  );
}
