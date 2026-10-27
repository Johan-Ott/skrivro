import { useEffect } from "react";
import { refreshPageMarks } from "../editor/pageMarks.js";
import { refreshRepetitions } from "../editor/repetitionMarks.js";
import type { useEditorView } from "../editor/useEditorView.js";
import type { WritingSettings } from "../editor/writingSettings.js";
import { platform } from "./platform.js";

interface EditorModesProps {
  editor: ReturnType<typeof useEditorView>;
  settings: WritingSettings;
  isFocusMode: boolean;
  isLocked: boolean;
  hasScene: boolean;
  scenePages?: (number | undefined)[] | null;
}

// A phone's keyboard corrects the words itself.
const isAutocorrectOn = (settings: WritingSettings) => settings.autocorrect && !platform.isPhone;
const isCompletionOn = (settings: WritingSettings) => settings.completion && !platform.isPhone;

// ProseMirror reads the modes on every update, so no new editor state is needed.
export function useEditorModes(props: EditorModesProps) {
  const { editor, settings } = props;
  const modes = editor.modes.current;
  modes.isTypewriterOn = props.isFocusMode && settings.typewriter;
  modes.isTypographyOn = settings.typography;
  modes.isAutocorrectOn = isAutocorrectOn(settings);
  modes.isCompletionOn = isCompletionOn(settings);
  modes.isSpellcheckOn = settings.spellcheck;
  modes.isEditable = props.hasScene && !props.isLocked;
  modes.repeatWindow = settings.review ? settings.repeatWindow : null;
  const showsMarks = settings.showPages || (settings.paper && !props.isFocusMode);
  modes.pageMarks = showsMarks ? (props.scenePages ?? null) : null;
  const { run } = editor;
  useEffect(() => run(refreshRepetitions, false), [settings.review, settings.repeatWindow, run]);
  useEffect(() => run(refreshPageMarks, false), [props.scenePages, showsMarks, run]);
  // ProseMirror reads the spellcheck attribute only when the view updates.
  useEffect(
    () => editor.viewRef.current?.setProps({}),
    [settings.spellcheck, props.isLocked, props.hasScene, editor.viewRef],
  );
}
