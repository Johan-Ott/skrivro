import { EASE, canMove, flipTo, ghostOf } from "../motion.js";

// A book opened from the shelf: its cover grows up into the page it opens on, instead of a cut.

const DURATION = 500;

const isInView = (cover: HTMLElement) => {
  const box = cover.getBoundingClientRect();
  return box.bottom > 0 && box.top < window.innerHeight;
};

// The cover clicked, or, from a button such as Fortsätt där du slutade, the book's first cover
// in view.
function coverOf(dir: string) {
  const covers = Array.from(
    document.querySelectorAll<HTMLElement>(`.book-cover[data-dir="${CSS.escape(dir)}"]`),
  );
  return covers.find((cover) => cover.matches(":hover, :focus-visible")) ?? covers.find(isInView);
}

// The sheet on paper, the whole writing area otherwise; only the part that shows.
function pageOf() {
  const page = document.querySelector(".page.paper > .sheet") ?? document.querySelector(".page");
  if (!page?.checkVisibility()) return null;
  const box = page.getBoundingClientRect();
  const top = Math.max(box.top, 0);
  const bottom = Math.min(box.bottom, window.innerHeight);
  return { page, box: new DOMRect(box.left, top, box.width, bottom - top) };
}

// The cover's words go first, so what grows is its colour, and the paper comes up under it.
function grow(ghost: HTMLElement, page: Element, to: DOMRect) {
  const from = ghost.getBoundingClientRect();
  ghost
    .querySelectorAll("span")
    .forEach((words) => words.animate([{ opacity: 0 }], { duration: 150, fill: "forwards" }));
  const growing = ghost.animate(
    [
      { transform: "none" },
      { opacity: 1, offset: 0.45 },
      { transform: flipTo(to, from), opacity: 0 },
    ],
    { duration: DURATION, easing: EASE, fill: "forwards" },
  );
  growing.onfinish = () => ghost.remove();
  page.animate([{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1 }], DURATION);
}

// The page comes a few frames after the book is open. A book that opens elsewhere, such as on
// its plan, lets the cover fade where it is.
function growWhenShown(ghost: HTMLElement, frames = 30) {
  const shown = pageOf();
  if (shown) return grow(ghost, shown.page, shown.box);
  if (frames > 0) return void requestAnimationFrame(() => growWhenShown(ghost, frames - 1));
  ghost.animate([{ opacity: 1 }, { opacity: 0 }], 200).onfinish = () => ghost.remove();
}

/** Opens the book, its cover growing into the page; one cover at a time. */
export async function openGrowing(dir: string, open: () => Promise<void>) {
  const cover = coverOf(dir);
  if (!cover || !canMove() || document.querySelector(".cover-ghost")) return open();
  const ghost = ghostOf(cover, "cover-ghost");
  ghost.style.setProperty("--w", ghost.style.width);
  try {
    await open();
  } catch (error) {
    ghost.remove();
    throw error;
  }
  growWhenShown(ghost);
}
