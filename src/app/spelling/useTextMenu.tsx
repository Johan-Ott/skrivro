import { selectAll } from "prosemirror-commands";
import type { EditorView } from "prosemirror-view";
import { useState, type MouseEvent } from "react";
import {
  isMisspelled,
  refreshSpelling,
  wordAt,
  type SpellingSwitch,
} from "../../editor/spellingMarks.js";
import type { useEditorView } from "../../editor/useEditorView.js";
import { Menu, type MenuItem } from "@llkit/Menu.js";
import { platform } from "../platform.js";
import { shortcutText } from "../shortcuts.js";
import { t } from "../../i18n/i18n.js";

type Place = { word: string; from: number; to: number };

/** What can be done with the chosen words, first in the menu over them. */
export type WordItems = (text: string) => MenuItem[];

// A second group of items under a line, when there is a first.
function under(first: MenuItem[], second: MenuItem[]) {
  const [top, ...rest] = second;
  if (first.length === 0 || !top) return [...first, ...second];
  return [...first, { ...top, separatorBefore: true }, ...rest];
}

function selectedText(view: EditorView) {
  const { from, to } = view.state.selection;
  return view.state.doc.textBetween(from, to, "\n");
}

// The clipboard is written by the page itself; reading it needs the app.
function clipboardItems(view: EditorView): MenuItem[] {
  const copy = () => void navigator.clipboard.writeText(selectedText(view));
  const cut = () => (copy(), view.dispatch(view.state.tr.deleteSelection()));
  const { readClipboard } = platform;
  const paste = readClipboard && (() => void readClipboard().then((text) => view.pasteText(text)));
  return [
    ...(view.state.selection.empty
      ? []
      : [
          { label: t("Klipp ut"), shortcut: shortcutText({ key: "x" }), onSelect: cut },
          { label: t("Kopiera"), shortcut: shortcutText({ key: "c" }), onSelect: copy },
        ]),
    ...(paste
      ? [{ label: t("Klistra in"), shortcut: shortcutText({ key: "v" }), onSelect: paste }]
      : []),
  ];
}

function editItems(view: EditorView): MenuItem[] {
  const all = () => selectAll(view.state, view.dispatch);
  const items = [
    ...clipboardItems(view),
    { label: t("Markera allt"), shortcut: shortcutText({ key: "a" }), onSelect: all },
  ];
  return items.map((item) => ({ ...item, onSelect: () => (item.onSelect?.(), view.focus()) }));
}

function spellingItems(
  view: EditorView,
  spelling: SpellingSwitch,
  place: Place,
  suggestions: string[],
) {
  const replace = (word: string) =>
    view.dispatch(view.state.tr.insertText(word, place.from, place.to));
  const corrections = suggestions.length
    ? suggestions.map((word) => ({ label: word, onSelect: () => (replace(word), view.focus()) }))
    : [{ label: t("Inga förslag"), onSelect: () => view.focus() }];
  const add = () => {
    spelling.addWord(place.word);
    refreshSpelling(view.state, view.dispatch);
  };
  return [
    ...corrections,
    {
      label: t("Lägg till ”{word}” i bokens ordlista", { word: place.word }),
      separatorBefore: true,
      onSelect: add,
    },
  ];
}

async function itemsAt(
  view: EditorView,
  spelling: SpellingSwitch | null,
  position: number,
  wordItems: WordItems,
) {
  const text = selectedText(view).trim();
  const edit = under(text ? wordItems(text) : [], editItems(view));
  const place = wordAt(view.state.doc, position);
  if (!spelling || !place || !isMisspelled(spelling, place.word)) return edit;
  const suggestions = await spelling.suggestions(spelling.language, place.word).catch(() => []);
  return under(spellingItems(view, spelling, place, suggestions), edit);
}

/** The text's own right-click menu: corrections for a misspelled word, what can be done with the
 * chosen words, then cut, copy and paste. */
export function useTextMenu(editor: ReturnType<typeof useEditorView>, wordItems: WordItems) {
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const open = async (event: MouseEvent) => {
    const view = editor.viewRef.current;
    if (!view || platform.isPhone) return;
    event.preventDefault();
    const { clientX: x, clientY: y } = event;
    const position = view.posAtCoords({ left: x, top: y })?.pos ?? view.state.selection.from;
    setMenu({
      x,
      y,
      items: await itemsAt(view, editor.modes.current.spelling, position, wordItems),
    });
  };
  const layer = menu && <Menu {...menu} label={t("Text")} onClose={() => setMenu(null)} />;
  return { onContextMenu: (event: MouseEvent) => void open(event), layer };
}
