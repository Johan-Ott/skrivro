import type { ResolvedPos } from "prosemirror-model";
import { Plugin, PluginKey, type Command, type EditorState } from "prosemirror-state";
import { manuscriptSchema as schema } from "../manuscript/schema.js";

// Länk… asks for the address in a popover. It stays open until the text or the selection moves.
const asking = new PluginKey<boolean>("asking-for-link");

export const linkAsking = new Plugin<boolean>({
  key: asking,
  state: {
    init: () => false,
    apply: (transaction, isOpen, before, after) => {
      const meta = transaction.getMeta(asking) as boolean | undefined;
      if (meta !== undefined) return meta;
      return isOpen && !transaction.docChanged && after.selection.eq(before.selection);
    },
  },
});

export const isAskingForLink = (state: EditorState) => asking.getState(state) === true;

export const askForLink: Command = (state, dispatch) => {
  if (!state.selection.$from.parent.isTextblock) return false;
  dispatch?.(state.tr.setMeta(asking, true));
  return true;
};

export const stopAskingForLink: Command = (state, dispatch) => {
  dispatch?.(state.tr.setMeta(asking, false));
  return true;
};

// The whole stretch of one link around the cursor, so a click in it edits all of it.
function linkAround($pos: ResolvedPos) {
  const linkOf = (index: number) =>
    schema.marks.link.isInSet($pos.parent.maybeChild(index)?.marks ?? []);
  let first = linkOf($pos.index()) ? $pos.index() : $pos.index() - 1;
  const mark = linkOf(first);
  if (!mark) return null;
  const isSameLink = (index: number) => linkOf(index)?.eq(mark) === true;
  let last = first;
  while (isSameLink(first - 1)) first--;
  while (isSameLink(last + 1)) last++;
  const href = String(mark.attrs["href"]);
  return { from: $pos.posAtIndex(first), to: $pos.posAtIndex(last + 1), href };
}

/** What Länk… links: the selection, or the link the cursor stands in. */
export function linkTarget(state: EditorState) {
  const { from, to, empty, $from } = state.selection;
  if (empty) return linkAround($from) ?? { from, to, href: "" };
  let href = "";
  state.doc.nodesBetween(from, to, (node) => {
    href ||= String(schema.marks.link.isInSet(node.marks)?.attrs["href"] ?? "");
  });
  return { from, to, href };
}

// "skrivro.se" is a web address and "elin@exempel.se" an e-mail; one with its scheme stays as typed.
function fullAddress(typed: string) {
  const address = typed.trim();
  if (address === "" || /^[a-z][a-z\d+.-]*:/i.test(address)) return address;
  return address.includes("@") ? `mailto:${address}` : `https://${address}`;
}

/** Links the target to the typed address; with nothing selected the address is written in. An
 * empty address takes the link away. */
export const setLink =
  (typed: string): Command =>
  (state, dispatch) => {
    const href = fullAddress(typed);
    const { from, to: end } = linkTarget(state);
    const transaction = state.tr.setMeta(asking, false);
    let to = end;
    if (from === to && href !== "") {
      transaction.insertText(typed.trim(), from);
      to = from + typed.trim().length;
    }
    transaction.removeMark(from, to, schema.marks.link);
    if (href !== "") transaction.addMark(from, to, schema.marks.link.create({ href }));
    dispatch?.(transaction.scrollIntoView());
    return true;
  };
