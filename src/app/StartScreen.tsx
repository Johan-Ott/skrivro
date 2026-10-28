import { PacksLayer } from "./packs/PackList.js";
import type { AppState } from "./App.js";
import { signInToAccount } from "./googleAccount.js";
import { useFeedbackDialog } from "@llkit/feedback/FeedbackDialog.js";
import { useBackupsDialog } from "./backups/BackupsDialog.js";
import { useState, type ReactNode } from "react";
import { useMenuButton } from "@llkit/Menu.js";
import { useCommandKey } from "./shortcuts.js";
import { appMenu, phoneShelfMenu, programMenu } from "./shell/appMenu.js";
import { ShelfTopbar } from "./shell/Topbar.js";
import { PhoneShelf } from "./shelf/PhoneShelf.js";
import { ProfileButton, ProfileLayer } from "./profile/ProfileLayer.js";
import { usePhone } from "./phone/usePhone.js";
import { ABOUT_TAB, SettingsLayer, HELP_TAB } from "./settings/SettingsDialog.js";
import type { useWritingMode } from "./useWritingMode.js";
import { t } from "../i18n/i18n.js";
import { recordFailure } from "@llkit/errorLog.js";
import { platform } from "./platform.js";
import { libraryOf, startDetails } from "./onboarding/books.js";
import { Opening, useBookActions } from "./shelf/useBookActions.js";
import { NewBookDialog } from "./onboarding/NewBookDialog.js";
import type { ProjectDetails } from "../project/newProject.js";
import { Welcome } from "./onboarding/Welcome.js";
import { firstLanguage, type Choices } from "./onboarding/FirstChoices.js";
import { Bookshelf } from "./shelf/Bookshelf.js";
import { useCloudBooks } from "./shelf/useCloudBooks.js";
import { shelfHandlers } from "./shelf/shelfHandlers.js";

// Skrivro starts at the welcome the first time, and at the shelf after: every book is begun,
// fetched or opened from there.

type App = Pick<AppState, "profile" | "updateFields" | "startup"> & {
  open: (dir: string) => Promise<void>;
  choose: () => Promise<void>;
  writingMode: ReturnType<typeof useWritingMode>;
  /** Ny bok was chosen in an open book: the shelf opens with the new book's sheet. */
  newProjectAsked: { current: boolean };
};
type StartScreenProps = { app: App };

// The shelf's menu, with the dialogs it opens.
function useShelfMenu(app: App, onNewProject: () => void, isPhone: boolean) {
  const settings = app.writingMode.settingsDialog;
  const backups = useBackupsDialog(app, []);
  const feedback = useFeedbackDialog();
  const actions = {
    showShelf: () => undefined,
    newProject: onNewProject,
    openFolder: () => void app.choose(),
    ...{ showVersions: null, exportZip: null, importRevision: null, book: [], sharing: [] },
    showBackups: backups.open,
    sendFeedback: feedback.open,
    openSettings: () => settings.open(),
    openShortcuts: () => settings.open(HELP_TAB),
    openAbout: () => settings.open(ABOUT_TAB),
  };
  useCommandKey("newBook", onNewProject);
  const menu = useMenuButton(t("Meny"), isPhone ? phoneShelfMenu(actions) : appMenu(actions));
  const program = useMenuButton(t("Skrivro"), programMenu(actions));
  const layers = (
    <>
      {menu.menu}
      {program.menu}
      {backups.layer}
      {feedback.layer}
      <SettingsLayer {...app.startup} {...app.writingMode} dialog={settings} book={null} />
      <PacksLayer />
    </>
  );
  return { openers: { onMenu: menu.open, onProgramMenu: program.open }, layers };
}

function ShelfFrame(
  props: StartScreenProps & { onNewProject: () => void; isPhone: boolean; children: ReactNode },
) {
  const { app } = props;
  const menu = useShelfMenu(app, props.onNewProject, props.isPhone);
  const layers = (
    <>
      {menu.layers}
      <ProfileLayer app={app} project={null} />
    </>
  );
  const profile = <ProfileButton app={app} />;
  if (props.isPhone)
    return (
      <PhoneShelf onMenu={menu.openers.onMenu} profile={profile}>
        {props.children}
        {layers}
      </PhoneShelf>
    );
  return (
    <div className="shelf-app">
      <ShelfTopbar title={t("Bokhylla")} {...menu.openers} profile={profile} />
      <div className="main-card">{props.children}</div>
      {layers}
    </div>
  );
}

function useNewBookSheet(app: App) {
  return useState(() => {
    const isAsked = app.newProjectAsked.current;
    app.newProjectAsked.current = false;
    return isAsked;
  });
}

// A book in Drive is fetched and opened by the tap on its cover.
function useCloud(app: App) {
  const { preferences } = app.startup;
  const cloud = useCloudBooks(preferences.libraryDir, preferences.isDriveSyncOn);
  const fetchAndOpen = async (name: string) => {
    const dir = await cloud.fetch(name).catch(recordFailure("Hämtningen"));
    if (dir) await app.open(dir);
  };
  return { ...cloud, onFetch: (name: string) => void fetchAndOpen(name) };
}

function NewBookSheet(props: {
  app: App;
  onCreate: (details: ProjectDetails) => Promise<void>;
  onClose: () => void;
}) {
  const { preferences } = props.app.startup;
  return (
    <NewBookDialog
      start={startDetails(preferences.defaultDailyGoal, preferences.bookLanguage)}
      libraryDir={preferences.libraryDir ?? ""}
      onCreate={props.onCreate}
      onClose={props.onClose}
    />
  );
}

function Shelf({ app }: StartScreenProps) {
  const { preferences } = app.startup;
  const isPhone = usePhone();
  const [isNewBookOpen, setNewBookOpen] = useNewBookSheet(app);
  const books = useBookActions(app);
  const cloud = useCloud(app);
  return (
    <ShelfFrame app={app} onNewProject={() => setNewBookOpen(true)} isPhone={isPhone}>
      <Bookshelf
        libraryDir={preferences.libraryDir}
        knownProjects={preferences.knownProjects}
        author={preferences.authorName}
        onOpen={books.open}
        onNewProject={() => setNewBookOpen(true)}
        onImport={books.import}
        onOpenExample={books.example}
        cloud={cloud}
        {...shelfHandlers(app.startup, isPhone, cloud.look)}
      />
      <Opening saying={books.busy} />
      {isNewBookOpen && (
        <NewBookSheet app={app} onCreate={books.create} onClose={() => setNewBookOpen(false)} />
      )}
    </ShelfFrame>
  );
}

// The chosen languages' dictionaries and Typst's compiler, fetched while the writer begins; what
// fails here is fetched again the first time it is needed.
function fetchWhatSkrivroNeeds(languages: string[]) {
  const failed = recordFailure("Hämtningen vid första start");
  for (const language of languages) void platform.spelling?.prepare(language).catch(failed);
  void platform.prepareTypst?.().catch(failed);
}

// The first start's two ways to the shelf: choices made here, or the account from another device,
// whose name and goal come along with the sync.
function firstStart({ preferences, updatePreferences }: AppState["startup"]) {
  const start = async (choices: Choices) => {
    const libraryDir = await libraryOf(preferences.libraryDir);
    const [bookLanguage = "sv-SE"] = choices.languages;
    const { dailyGoal, authorName } = choices;
    updatePreferences((now) => ({
      ...now,
      ...{ isOnboardingDone: true, libraryDir, bookLanguage, defaultDailyGoal: dailyGoal },
      ...(authorName ? { authorName } : {}),
    }));
    fetchWhatSkrivroNeeds(choices.languages);
  };
  const signInFirst = async () => {
    const account = await signInToAccount(updatePreferences);
    if (account) {
      const { authorName, defaultDailyGoal } = account.settings;
      await start({ authorName, languages: [firstLanguage()], dailyGoal: defaultDailyGoal });
    }
    return account !== null;
  };
  return { start, signInFirst };
}

export function StartScreen({ app }: StartScreenProps) {
  if (app.startup.preferences.isOnboardingDone) return <Shelf app={app} />;
  const { start, signInFirst } = firstStart(app.startup);
  const { settings, onChangeSettings } = app.writingMode;
  return (
    <Welcome
      onStart={start}
      onSignIn={signInFirst}
      theme={settings.theme}
      onTheme={(theme) => onChangeSettings((current) => ({ ...current, theme }))}
    />
  );
}
