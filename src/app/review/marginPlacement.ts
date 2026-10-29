import { useEffect, useLayoutEffect, useRef } from "react";
import { marginOut } from "./useComments.js";

const GAP = 12;
// The room each side of the text while the notes are out: a note and the space before it.
const MARGIN = 280;
const PAGE_EDGES = 96;
// The text gives up some width for the notes, never more than down to this.
const NARROWEST_TEXT = 440;

type Room = "both sides" | "right" | null;

// Room for a margin on both sides keeps the text in the middle. Room for one moves the text left,
// as Word does, and a page narrower than that keeps the notes in Granska.
function roomOf(page: HTMLElement): Room {
  const sheetMargins = page.classList.contains("paper") ? 176 : 0;
  const left = page.getBoundingClientRect().width - NARROWEST_TEXT - sheetMargins - PAGE_EDGES;
  if (left >= 2 * MARGIN) return "both sides";
  return left >= MARGIN ? "right" : null;
}

// The words a card is about: a comment's or a note's mark, an editor's change, or the first time
// a name is used.
function markOf(card: HTMLElement) {
  const { comment, change, entity } = card.dataset;
  if (comment) return `.commented[data-comment="${comment}"]`;
  if (change) return `.ProseMirror [data-change="${change}"]`;
  return `.mention[data-entity="${entity}"]`;
}

const markTop = (page: HTMLElement, card: HTMLElement) =>
  page.querySelector(markOf(card))?.getBoundingClientRect().top ?? null;

// Each card sits level with its words, pushed down below the card above so none overlap.
function stackCards(box: HTMLElement, page: HTMLElement) {
  const origin = page.getBoundingClientRect();
  const head = box.querySelector<HTMLElement>(".margin-head");
  let below = head ? head.offsetHeight + GAP : 0;
  Array.from(box.querySelectorAll<HTMLElement>(".margin-note"))
    .map((card) => ({ card, top: markTop(page, card) }))
    .sort((one, two) => (one.top ?? 0) - (two.top ?? 0))
    .forEach(({ card, top }) => {
      card.hidden = top === null;
      if (top === null) return;
      const cardTop = Math.max(top - origin.top + page.scrollTop, below);
      card.style.top = `${cardTop}px`;
      below = cardTop + card.offsetHeight + GAP;
    });
}

function markRoom(page: HTMLElement, room: Room) {
  page.classList.toggle("with-margin-notes", room !== null);
  page.classList.toggle("margin-on-right", room === "right");
}

// On paper the cards lie on the desk beside the sheet, otherwise beside the text.
function placeNotes(box: HTMLElement) {
  const page = box.parentElement;
  const beside = page?.querySelector(page.classList.contains("paper") ? ".sheet" : ".ProseMirror");
  if (!page || !beside) return;
  const room = roomOf(page);
  const isRoomy = room !== null;
  if (marginOut.get() !== isRoomy) marginOut.set(isRoomy);
  markRoom(page, box.firstElementChild !== null ? room : null);
  box.hidden = !isRoomy;
  if (!isRoomy) return;
  const left = beside.getBoundingClientRect().right - page.getBoundingClientRect().left;
  box.style.left = `${left + 32}px`;
  stackCards(box, page);
}

/** The margin's box, placed again whenever `change` says the cards may have moved: other cards,
 * other text, a card grown or shrunk. It also tells `marginOut` whether there is room. */
export function usePlacement(change: string, doc: unknown) {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = box.current;
    const page = element?.parentElement;
    if (!element || !page) return;
    const place = () => placeNotes(element);
    place();
    const observer = new ResizeObserver(place);
    observer.observe(page);
    return () => {
      observer.disconnect();
      markRoom(page, null);
    };
  }, [change, doc]);
  // The text's marks for new comments are drawn in the app's own layout effect, after this one,
  // so the cards are placed once more after it.
  useEffect(() => {
    if (box.current) placeNotes(box.current);
  }, [change, doc]);
  useEffect(() => () => marginOut.set(false), []);
  return box;
}
