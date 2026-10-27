import { redo, undo } from "prosemirror-history";
import { useEditorState } from "../../editor/editorStore.js";
import { useState } from "react";
import { insertSceneBreak, toggleStyle } from "../../editor/commands.js";
import { insertFootnote } from "../../editor/footnoteEditing.js";
import { insertPlaceholder } from "../../editor/placeholderMarks.js";
import type { AppState } from "../App.js";
import { insertChosenPicture } from "../palette/sceneContext.js";
import { StylePicker } from "../StylePicker.js";
import { CorrectionsBar, useCaretCorrections } from "../spelling/Corrections.js";
import { RepeatNote, repeatedAtCaret } from "../spelling/ClickCorrections.js";
import type { Project } from "../useProject.js";
import { WritingSettingsPanel } from "../WritingSettingsPanel.js";
import { t } from "../../i18n/i18n.js";

// What a keyboard shortcut does on the computer, as buttons over the phone's keyboard.
// Pressing one keeps the text focused, so the keyboard stays up.

type Tool = [label: string, symbol: string, onPress: () => void];

function tools(app: AppState, project: Project, toggleSettings: () => void): Tool[] {
  const { run } = app.editor;
  return [
    [t("Ångra"), "↶", () => run(undo)],
    [t("Gör om"), "↷", () => run(redo)],
    [t("Punktlista"), "•", () => run(toggleStyle("punktlista"))],
    [t("Numrerad lista"), "1.", () => run(toggleStyle("numrerad"))],
    [t("Scenbrytning"), "⁂", () => run(insertSceneBreak)],
    [t("Infoga fotnot"), t("Fotnot"), () => run(insertFootnote)],
    [t("Platshållare"), "?", () => run(insertPlaceholder)],
    [t("Infoga bild…"), t("Bild"), () => void insertChosenPicture(project.dir, run)],
    [t("Skrivinställningar"), "Aa", toggleSettings],
  ];
}

function Tools(props: { app: AppState; project: Project; onSettings: () => void }) {
  const { editor } = props.app;
  return (
    <>
      <StylePicker editorState={useEditorState(editor)} run={editor.run} />
      {tools(props.app, props.project, props.onSettings).map(([label, symbol, onPress]) => (
        <button key={label} className="phone-tool" aria-label={label} onClick={onPress}>
          {symbol}
        </button>
      ))}
    </>
  );
}

// Aa: the writing settings, with the focus mode as a switch since the phone has no Esc or topbar.
function PhoneSettings({
  writingMode,
  onClose,
}: Pick<AppState, "writingMode"> & { onClose: () => void }) {
  return (
    <WritingSettingsPanel
      settings={writingMode.settings}
      onChange={writingMode.onChangeSettings}
      showsFocusOptions={writingMode.isFocusMode}
      focusMode={{ isOn: writingMode.isFocusMode, onFlip: writingMode.onToggleFocus }}
      onClose={onClose}
    />
  );
}

export function PhoneToolbar({ app, project }: { app: AppState; project: Project }) {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const { editor, writingMode } = app;
  const corrections = useCaretCorrections(editor);
  const repeated = corrections ? null : repeatedAtCaret(editor);
  if (!app.scene) return null;
  const toggleSettings = () => setSettingsOpen(!isSettingsOpen);
  return (
    <>
      {isSettingsOpen && (
        <PhoneSettings writingMode={writingMode} onClose={() => setSettingsOpen(false)} />
      )}
      <div
        className="phone-toolbar"
        role="toolbar"
        aria-label={t("Verktyg")}
        onMouseDown={(event) => event.preventDefault()}
      >
        {corrections && <CorrectionsBar editor={editor} corrections={corrections} />}
        {repeated && (
          <RepeatNote word={repeated} onReview={() => writingMode.setReviewOpen(true)} />
        )}
        {!corrections && !repeated && (
          <Tools app={app} project={project} onSettings={toggleSettings} />
        )}
      </div>
    </>
  );
}
