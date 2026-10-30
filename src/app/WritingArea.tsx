import { useEffect, type CSSProperties, type ReactNode } from "react";
import { useEditorState } from "../editor/editorStore.js";
import { WritingTip } from "./guide/GuideTip.js";
import type { ManuscriptScope } from "../editor/manuscriptSearch.js";
import { SearchPanel } from "../editor/SearchPanel.js";
import type { useEditorView } from "../editor/useEditorView.js";
import type { WritingSettings } from "../editor/writingSettings.js";
import { countDocumentWords } from "../manuscript/wordCount.js";
import type { SaveStatus } from "@llkit/storage/autosave.js";
import type { SaveFailure } from "@llkit/storage/saveError.js";
import { FocusHeader } from "./FocusHeader.js";
import { closeSettings, usePanels } from "./settingsPanel.js";
import type { Today } from "./useWritingStats.js";
import {
  ReadOnlyNotice,
  SaveToast,
  TrashedNotice,
  TreeFailureToast,
  SavedNowToast,
} from "./SaveToast.js";
import { useEscape } from "@llkit/keys.js";
import { useCommandKey } from "./shortcuts.js";
import { useTextSizeKeys, type SettingsChange } from "./useWritingSettings.js";
import { WritingSettingsPanel } from "./WritingSettingsPanel.js";
import { SheetEdges, type SheetProps } from "./SheetEdges.js";
import { pageClass, pageStyle, type BookLook } from "./bookLook.js";
import { useEditorModes } from "./useEditorModes.js";
import { t } from "../i18n/i18n.js";
import { useTextMenu, type WordItems } from "./spelling/useTextMenu.js";

interface WritingAreaProps {
  /** The printed page of each block of the open scene, when page breaks are shown. */
  scenePages?: (number | undefined)[] | null;
  runningHead?: SheetProps["runningHead"];
  folio?: SheetProps["folio"];
  /** The open scene starts its chapter, so book type gives it a drop cap. */
  opensChapter?: boolean;
  /** How the book's design in Publicera sets the text, used by book type. */
  bookLook?: BookLook;
  aside: ReactNode;
  /** The comments beside the text, inside the page so they scroll with it. */
  margin?: ReactNode;
  /** Another text, or a version of this one, read beside it. */
  beside: ReactNode;
  selectionBar: ReactNode;
  /** Right-click on chosen words: what can be done with them. */
  wordItems: WordItems;
  header: ReactNode;
  footer: ReactNode;
  /** Redigera: the rest of the book after the open scene, on the same sheet. */
  readOn?: ReactNode;
  /** Saved by a newer Skrivro: shown, never written to. */
  isReadOnly: boolean;
  /** The open scene lies in Papperskorgen: shown, never written to, until it is put back. */
  trashed: { label: string; onPutBack: () => void } | null;
  /** Read-only or in Papperskorgen: the text cannot be typed in. */
  isLocked: boolean;
  /** Hidden, not removed, so the editor keeps its scene and undo history. */
  isHidden: boolean;
  manuscriptSearch: ManuscriptScope;
  today: Today;
  editor: ReturnType<typeof useEditorView>;
  focusLocation: string;
  hasScene: boolean;
  saveStatus: SaveStatus | null;
  treeFailure: SaveFailure | null;
  settings: WritingSettings;
  isFocusMode: boolean;
  /** Redigera: the red markings for spelling and repeated words. */
  showsFindings: boolean;
  isSearchOpen: boolean;
  setSearchOpen: (isOpen: boolean) => void;
  searchSeed: string;
  onChangeSettings: (change: SettingsChange) => void;
  onToggleFocus: () => void;
  onRetrySave: () => void;
  onSaveNow: () => Promise<boolean>;
  onNewScene: () => void;
}

function manuscriptClass(settings: WritingSettings, isFocusMode: boolean) {
  if (!isFocusMode) return "manuscript";
  return `manuscript focus-${settings.focus}${settings.typewriter ? " typewriter" : ""}`;
}

function useWritingKeys(props: WritingAreaProps, panels: ReturnType<typeof usePanels>) {
  useTextSizeKeys(props.onChangeSettings);
  useCommandKey("search", () => props.setSearchOpen(true));
  useCommandKey("focus", props.onToggleFocus);
  useCommandKey("newScene", props.onNewScene);
  useEscape(() => {
    if (panels.isSettingsOpen) panels.setSettingsOpen(false);
    else if (props.isFocusMode) props.onToggleFocus();
  });
}

function EmptyScene({ onNewScene }: { onNewScene: () => void }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{t("Ingen scen är öppen")}</p>
      <p className="empty-text">{t("Skapa en scen eller välj en i sidomenyn.")}</p>
      <button className="button primary" onClick={onNewScene}>
        {t("Ny scen")}
      </button>
    </div>
  );
}

const isOnPaper = (props: WritingAreaProps) =>
  props.hasScene && props.settings.paper && !props.isFocusMode;

// The editor stays mounted in both modes, so undo history and cursor survive the switch.
// On paper the text, its header and its footer lie on one sheet, with its pages at the foot.
function Page(props: WritingAreaProps) {
  const { editor, settings, isFocusMode, hasScene } = props;
  const textMenu = useTextMenu(editor, props.wordItems);
  return (
    <div
      className={pageClass({ ...props, isNote: Boolean(props.footer) })}
      style={pageStyle(props) as CSSProperties}
    >
      <div className="sheet">
        {!hasScene && <EmptyScene onNewScene={props.onNewScene} />}
        {hasScene && !isFocusMode && props.header}
        <div
          className={manuscriptClass(settings, isFocusMode) + (hasScene ? "" : " hidden")}
          ref={editor.mount}
          onContextMenu={textMenu.onContextMenu}
        />
        {hasScene && !isFocusMode && (
          <>
            {props.footer}
            {props.readOn}
          </>
        )}
        <SheetEdges {...props} isShown={isOnPaper(props)} />
      </div>
      {props.margin}
      {textMenu.layer}
    </div>
  );
}

function Floating(props: WritingAreaProps & { isSettingsOpen: boolean }) {
  return (
    <>
      {props.isSettingsOpen && (
        <WritingSettingsPanel
          settings={props.settings}
          onChange={props.onChangeSettings}
          showsFocusOptions={props.isFocusMode}
          onClose={closeSettings}
        />
      )}
      {props.isSearchOpen && <OpenSearch {...props} />}
      {props.selectionBar}
      <SaveToast status={props.saveStatus} onRetry={props.onRetrySave} />
      <SavedNowToast onSave={props.onSaveNow} />
      <TreeFailureToast failure={props.treeFailure} />
      <ReadOnlyNotice isReadOnly={props.isReadOnly} />
      <TrashedNotice trashed={props.trashed} />
    </>
  );
}

// Search follows the text as it changes, so it listens to the editor itself.
function OpenSearch(props: WritingAreaProps) {
  return (
    <SearchPanel
      key={props.searchSeed}
      {...props.editor}
      editorState={useEditorState(props.editor)}
      initialSearch={props.searchSeed}
      manuscript={props.manuscriptSearch}
      onClose={() => props.setSearchOpen(false)}
    />
  );
}

// Focus mode has its own header, with Aa; otherwise Aa is in the top bar.
function WritingHead(props: WritingAreaProps & { panels: ReturnType<typeof usePanels> }) {
  const { panels } = props;
  const doc = useEditorState(props.editor)?.doc;
  const toggleSettings = () => panels.setSettingsOpen(!panels.isSettingsOpen);
  return (
    <>
      {props.isFocusMode && (
        <FocusHeader
          {...props}
          location={props.focusLocation}
          wordCount={doc ? countDocumentWords(doc) : 0}
          isSettingsOpen={panels.isSettingsOpen}
          onToggleSettings={toggleSettings}
          onLeave={props.onToggleFocus}
        />
      )}
    </>
  );
}

export function WritingArea(props: WritingAreaProps) {
  const { editor } = props;
  const panels = usePanels();
  useWritingKeys(props, panels);
  useEditorModes(props);
  const { focusIfRequested } = editor;
  useEffect(() => focusIfRequested(), [props.hasScene, focusIfRequested]);
  return (
    <main className={props.isHidden ? "writing hidden" : "writing"}>
      <WritingHead {...props} panels={panels} />
      <div className="writing-body">
        <Page {...props} />
        {props.beside}
        {props.aside}
      </div>
      <Floating {...props} isSettingsOpen={panels.isSettingsOpen} />
      <WritingTip isHidden={props.isHidden} />
    </main>
  );
}
