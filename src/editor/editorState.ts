import { baseKeymap } from "prosemirror-commands";
import { closeHistory, history, redo, undo } from "prosemirror-history";
import { InputRule, inputRules, undoInputRule } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import { Fragment, type Node } from "prosemirror-model";
import { search } from "prosemirror-search";
import { EditorState, TextSelection, type Command } from "prosemirror-state";
import { manuscriptSchema as schema } from "../manuscript/schema.js";
import {
  insertLineBreak,
  insertSceneBreak,
  toggleBold,
  toggleItalic,
  toggleStrike,
  toggleUnderline,
} from "./commands.js";
import { autocorrectPlugin, autocorrectRules } from "./autocorrect.js";
import { completionPlugin } from "./completion.js";
import { NO_WORDS, type CompletionWords } from "./vocabulary.js";
import { focusPlugin, typewriterPlugin } from "./focus.js";
import { mentionsPlugin, type MentionMatcher } from "./mentions.js";
import { listRules } from "./listInput.js";
import { placeholder } from "./placeholder.js";
import { promptHints } from "./promptHints.js";
import { repetitionsPlugin } from "./repetitionMarks.js";
import { spellingPlugin, type SpellingSwitch } from "./spellingMarks.js";
import { commentsPlugin, type CommentAnchor } from "./commentMarks.js";
import { insertFootnote, uniqueFootnoteLabels } from "./footnoteEditing.js";
import { pageMarksPlugin } from "./pageMarks.js";
import { revisionPlugin } from "./revisionMarks.js";
import { suggestionPlugin } from "./suggestionMarks.js";
import type { RevisionChange } from "../manuscript/revision.js";
import { t } from "../i18n/i18n.js";

// Swedish uses ” for both opening and closing quotes. Each rule asks whether it is on.
function typographyRules(isOn: () => boolean): InputRule[] {
  const rule = (pattern: RegExp, text: string) =>
    new InputRule(pattern, (state, _match, start, end) =>
      isOn() ? state.tr.insertText(text, start, end) : null,
    );
  return [rule(/--$/, "–"), rule(/\.\.\.$/, "…"), rule(/"$/, "”"), rule(/'$/, "’")];
}

// *** alone on a line becomes a scene break, with an empty paragraph after it to write on.
const sceneBreakRule = new InputRule(/^\*\*\*$/, (state, _match, start, end) => {
  const $start = state.doc.resolve(start);
  if (end !== $start.end() || $start.parent.type !== schema.nodes.paragraph) return null;
  const before = $start.before();
  const replacement = [schema.nodes.sceneBreak.create(), schema.nodes.paragraph.create()];
  const transaction = state.tr.replaceWith(before, $start.after(), replacement);
  return transaction.setSelection(TextSelection.create(transaction.doc, before + 2));
});

/** ProseMirror asks these on every update, so they switch without a new state. */
export interface EditorSwitches {
  isTypewriterOn: () => boolean;
  isTypographyOn: () => boolean;
  isAutocorrectOn: () => boolean;
  isCompletionOn: () => boolean;
  /** Whether the open text is a note: its lists are Markdown lists, a "- " starts one. */
  isNote: () => boolean;
  completion: () => CompletionWords;
  mentionMatchers: () => MentionMatcher[];
  onMention: (id: string, box: DOMRect) => void;
  /** Null when the review is off. */
  repeatWindow: () => number | null;
  commentAnchors: () => CommentAnchor[];
  onComment: (id: string) => void;
  /** The printed page of each top-level block, or null when page breaks are not shown. */
  pageMarks: () => (number | undefined)[] | null;
  /** The editor's changes to the open text that are not yet accepted or rejected. */
  revisionChanges: () => RevisionChange[];
  /** In Förslagsläge, the scene's text as it was when it began; otherwise null. */
  suggestedFrom: () => string | null;
  /** Null where Skrivro does not check the spelling itself. */
  spelling: () => SpellingSwitch | null;
}

export const DEFAULT_SWITCHES: EditorSwitches = {
  isTypewriterOn: () => false,
  isTypographyOn: () => true,
  isAutocorrectOn: () => false,
  isCompletionOn: () => false,
  isNote: () => false,
  completion: () => NO_WORDS,
  mentionMatchers: () => [],
  onMention: () => undefined,
  repeatWindow: () => null,
  commentAnchors: () => [],
  onComment: () => undefined,
  pageMarks: () => null,
  revisionChanges: () => [],
  suggestedFrom: () => null,
  spelling: () => null,
};

// Each new paragraph starts its own undo, so Ctrl+Z takes back the last paragraph, not
// everything written without a pause.
export const newParagraph: Command = (state, dispatch, view) =>
  baseKeymap["Enter"]?.(
    state,
    dispatch && ((transaction) => dispatch(closeHistory(transaction))),
    view,
  ) ?? false;

// Handled even with nothing to take back, or the browser's own undo of the page runs instead.
const always =
  (command: Command): Command =>
  (state, dispatch) => (command(state, dispatch), true);

const writingKeys = keymap({
  Enter: newParagraph,
  "Mod-z": always(undo),
  "Mod-y": always(redo),
  "Shift-Mod-z": always(redo),
  "Mod-b": toggleBold,
  "Mod-i": toggleItalic,
  "Mod-u": toggleUnderline,
  "Mod-Shift-x": toggleStrike,
  "Mod-Enter": insertSceneBreak,
  "Shift-Enter": insertLineBreak,
  "Mod-Alt-f": insertFootnote,
  Backspace: undoInputRule,
});

const writingRules = (switches: EditorSwitches) =>
  inputRules({
    rules: [
      sceneBreakRule,
      ...listRules(switches.isNote),
      ...typographyRules(switches.isTypographyOn),
      ...autocorrectRules(switches.isAutocorrectOn),
    ],
  });

export function createEditorState(doc: Node, switches = DEFAULT_SWITCHES): EditorState {
  const writableDoc =
    doc.childCount > 0 ? doc : doc.copy(Fragment.from(schema.nodes.paragraph.create()));
  return EditorState.create({
    doc: writableDoc,
    plugins: [
      history(),
      search(),
      completionPlugin(switches.isCompletionOn, switches.completion),
      autocorrectPlugin(switches.isAutocorrectOn, switches.spelling),
      writingRules(switches),
      writingKeys,
      uniqueFootnoteLabels,
      keymap(baseKeymap),
      focusPlugin(),
      typewriterPlugin(switches.isTypewriterOn),
      mentionsPlugin(switches.mentionMatchers, switches.onMention),
      repetitionsPlugin(switches.repeatWindow),
      spellingPlugin(switches.spelling),
      commentsPlugin(switches.commentAnchors, switches.onComment),
      pageMarksPlugin(switches.pageMarks),
      revisionPlugin(switches.revisionChanges),
      suggestionPlugin(switches.suggestedFrom),
      placeholder(t("Börja skriva…")),
      promptHints(),
    ],
  });
}
