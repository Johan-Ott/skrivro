import { WindowBar } from "@llkit/shell/WindowControls.js";
import { reviewAsk } from "../../askOnce.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { manuscriptSceneIds } from "../../project/tree.js";
import type { AppState } from "../App.js";
import { NewNoteDialog } from "../notes/NewNoteDialog.js";
import { openInHome } from "../notes/noteHomes.js";
import { Overlays } from "../Overlays.js";
import { PacksLayer } from "../packs/PackList.js";
import { packsOfBook } from "../templates/addPieces.js";
import { writingAreaProps } from "../paneProps.js";
import { DayGoalLayer } from "../progress/DayGoalLayer.js";
import { ProfileLayer } from "../profile/ProfileLayer.js";
import { TextBands } from "../TextBands.js";
import { ResumeScreen } from "../resume/ResumeScreen.js";
import { useBookTheme } from "../themes/themeStyle.js";
import type { Project } from "../useProject.js";
import { TextBar } from "./TextBar.js";
import { WritingArea } from "../WritingArea.js";
import { PhoneBook } from "./PhoneBook.js";
import { PhoneToolbar } from "./PhoneToolbar.js";
import type { View } from "../useWritingMode.js";
import { TabBar, tabOf, ViewScreen, type Tab } from "./PhoneTabs.js";
import { usePhoneNavigation, useViewsInHistory, type PhoneScreen } from "./usePhoneNavigation.js";
import { useKeyboardUp } from "./usePhone.js";
import { scenePagesOf, usePageMap } from "../usePageMap.js";

type Props = { app: AppState; project: Project };

// Android's back button puts the keyboard away, so the bar has no Klar.
function Floating({ app, project }: Props) {
  const notes = (isInSeries: boolean) => (isInSeries ? app.actions.series : app.actions).notes;
  return (
    <>
      <DayGoalLayer app={app} project={project} />
      <ProfileLayer app={app} project={project} />
      {app.newNoteSort !== false && (
        <NewNoteDialog
          project={project}
          libraryDir={app.startup.preferences.libraryDir}
          series={app.series}
          sortId={app.newNoteSort}
          onCreate={(note, isInSeries) => void notes(isInSeries).newNote(note)}
          onClose={() => app.setNewNoteSort(false)}
        />
      )}
      <Overlays app={app} />
      <PacksLayer book={packsOfBook(project, app.updateProject)} />
    </>
  );
}

// The text a book opens with at the start stays behind Boken; later texts get a screen each.
function useTextFollowsScene(
  sceneId: string | null,
  screen: PhoneScreen,
  showText: (id: string) => void,
) {
  const last = useRef<string | null>(null);
  useEffect(() => {
    const isShown = screen.kind === "text" && screen.sceneId === sceneId;
    if (last.current !== null && sceneId !== null && sceneId !== last.current && !isShown) {
      showText(sceneId);
    }
    if (sceneId !== null) last.current = sceneId;
  }, [sceneId, screen, showText]);
}

function useScreenOpensText(app: AppState, screen: PhoneScreen) {
  const appRef = useRef(app);
  appRef.current = app;
  useEffect(() => {
    const { session, homes, scene } = appRef.current;
    if (screen.kind === "text" && screen.sceneId !== scene?.id) {
      openInHome(session, homes, screen.sceneId);
    }
  }, [screen]);
}

// The text is on disk before another screen shows, not up to a second later.
function useSavedWhenScreenChanges(app: AppState, screen: PhoneScreen) {
  const { flush } = app.session.autosave;
  useEffect(() => () => void flush(), [screen, flush]);
}

// Öppna bredvid from Boken: what is beside the text shows over the text screen.
function useBesideShowsText(app: AppState, showText: (id: string) => void) {
  const { beside } = app.writingMode;
  const sceneId = app.scene?.id;
  useEffect(() => {
    if (beside && sceneId) showText(sceneId);
  }, [beside, sceneId, showText]);
}

// The last scene of the book itself she wrote in, so a note looked at since is not where she goes on.
function useLastManuscriptScene(app: AppState, project: Project) {
  const [last, setLast] = useState<string | null>(null);
  const sceneId = app.scene?.id ?? null;
  const inBook = manuscriptSceneIds(project.tree);
  useEffect(() => {
    if (sceneId && manuscriptSceneIds(project.tree).includes(sceneId)) setLast(sceneId);
  }, [sceneId, project.tree]);
  return last && inBook.includes(last) ? last : (inBook[0] ?? null);
}

function usePhoneScreens({ app, project }: Props) {
  const navigation = usePhoneNavigation();
  const { show, screen } = navigation;
  const showText = useCallback((sceneId: string) => show({ kind: "text", sceneId }), [show]);
  useTextFollowsScene(app.scene?.id ?? null, screen, showText);
  useBesideShowsText(app, showText);
  useScreenOpensText(app, screen);
  useSavedWhenScreenChanges(app, screen);
  // Granska covers the whole screen, so it closes when another text or screen shows.
  const { setReviewOpen } = app.writingMode;
  useEffect(() => setReviewOpen(reviewAsk.take()), [screen, app.scene?.id, setReviewOpen]);
  const openText = (id: string) =>
    id === app.scene?.id ? showText(id) : openInHome(app.session, app.homes, id);
  const continueId = useLastManuscriptScene(app, project);
  const continueWriting = () => continueId && openText(continueId);
  const { setView } = app.writingMode;
  useViewsInHistory(app.writingMode.view, setView, screen, show);
  const showView = (view: View) => (setView(view), show({ kind: "view", view }));
  // Opening a text leaves Innehåll or Läs for Skriv.
  const writeIn = (id: string) => (setView("skriv"), openText(id));
  const onTab = (tab: Tab) => {
    if (tab === "boken") return show({ kind: "book" });
    if (tab === "skriv") return (setView("skriv"), continueWriting());
    showView(tab);
  };
  return { ...navigation, openText: writeIn, continueWriting, continueId, showView, onTab };
}

// The text shows while writing, also when Läs or Innehåll has just opened one.
const isTextShown = (screen: PhoneScreen, view: View) =>
  (screen.kind === "text" || screen.kind === "view") && view === "skriv";

// Du slutade här waits until the text shows, so it greets Fortsätt skriva, not Boken.
function TextScreen(props: Props & { screens: ReturnType<typeof usePhoneScreens> }) {
  const { app, project, screens } = props;
  const { authorName } = app.startup.preferences;
  const pageMap = usePageMap(project, authorName, app.writingMode.settings.showPages);
  const isShown = isTextShown(screens.screen, app.writingMode.view);
  // A new scene asks for the cursor while Boken still shows; it gets it when the text does.
  const { focusIfRequested } = app.editor;
  useEffect(() => {
    if (isShown) focusIfRequested();
  }, [isShown, focusIfRequested]);
  return (
    <div className={isShown ? "phone-text" : "phone-text hidden"}>
      <TextBar app={app} project={project} />
      <WritingArea {...writingAreaProps(app, project)} scenePages={scenePagesOf(app, pageMap)} />
      <PhoneToolbar app={app} project={project} />
      <TextBands app={app} project={project} />
      {isShown && <ResumeScreen project={project} stats={app.stats} editor={app.editor} />}
    </div>
  );
}

// The text has a screen of its own, kept while hidden; these come and go.
function OtherScreen(props: Props & { screens: ReturnType<typeof usePhoneScreens> }) {
  const { app, project, screens } = props;
  const { screen } = screens;
  if (screen.kind === "text" || screen.kind === "view") {
    if (app.writingMode.view === "skriv") return null;
    const { depth, back, openText } = screens;
    const props = { app, project, onBack: back, onOpenText: openText };
    return <ViewScreen key={depth} {...props} />;
  }
  if (screen.kind !== "book") return null;
  return (
    <PhoneBook
      app={app}
      project={project}
      onOpenText={screens.openText}
      onContinue={screens.continueWriting}
      continueId={screens.continueId}
      onSync={() => screens.showView("synk")}
      onContents={() => screens.showView("innehall")}
    />
  );
}

export function PhoneProject({ app, project }: Props) {
  const screens = usePhoneScreens({ app, project });
  useBookTheme(project.fields);
  const isKeyboardUp = useKeyboardUp();
  const hasTabs = !isTextShown(screens.screen, app.writingMode.view) || !isKeyboardUp;
  return (
    <div className={hasTabs ? "phone-app with-tabs" : "phone-app"}>
      <WindowBar />
      <OtherScreen app={app} project={project} screens={screens} />
      <TextScreen app={app} project={project} screens={screens} />
      {hasTabs && (
        <TabBar tab={tabOf(screens.screen, app.writingMode.view)} onTab={screens.onTab} />
      )}
      <Floating app={app} project={project} />
    </div>
  );
}
