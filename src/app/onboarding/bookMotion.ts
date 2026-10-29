import { EASE, canMove, flipTo } from "../motion.js";

// Ny bok is the open book: it grows out of the blank book on the shelf, turns a page for each
// question, and shrinks back into the blank book when the writer cancels.

export const TURN_EASE = "cubic-bezier(.45,.05,.25,1)";

// The blank book at the end of the shelf, where Ny bok comes from and goes back to.
const tome = () => document.querySelector(".new-book .cover-blank")?.getBoundingClientRect();

const nextPaint = (then: () => void) => requestAnimationFrame(() => requestAnimationFrame(then));

/** The blank book grows into the open book, and its pages show once it is big. */
export function grow(book: HTMLElement) {
  const from = tome();
  if (!from || !canMove()) return;
  const to = book.getBoundingClientRect();
  book.animate([{ transform: flipTo(from, to) }, { transform: "none" }], {
    duration: 450,
    easing: EASE,
  });
  book
    .querySelector(".nb-spread")
    ?.animate([{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }], { duration: 450 });
}

/** The pages fade and the book shrinks back into the blank book; `done` closes it. */
export function shrink(book: HTMLElement, done: () => void) {
  const to = tome();
  if (!to || !canMove()) return done();
  const from = book.getBoundingClientRect();
  book
    .querySelector(".nb-spread")
    ?.animate([{ opacity: 1 }, { opacity: 0, offset: 0.4 }, { opacity: 0 }], {
      duration: 400,
      fill: "forwards",
    });
  const shrinking = book.animate([{ transform: "none" }, { transform: flipTo(to, from) }], {
    duration: 400,
    easing: EASE,
    fill: "forwards",
  });
  shrinking.onfinish = done;
}

/** A page turns over the spine. Back, the earlier question is under it already as it lifts;
 * forward, it lands on the old question and lies there until the new one is drawn under it. */
export function turnPage(book: HTMLElement, isAhead: boolean, apply: () => void, done: () => void) {
  // Narrow, the book is one page and nothing turns.
  const host = book.querySelector(".nb-sheets");
  if (!host?.checkVisibility() || !canMove()) return (apply(), done());
  if (!isAhead) apply();
  const sheet = document.createElement("div");
  sheet.className = isAhead ? "nb-sheet ahead" : "nb-sheet back";
  host.append(sheet);
  const turning = sheet.animate(
    [{ transform: "rotateY(0deg)" }, { transform: `rotateY(${isAhead ? -180 : 180}deg)` }],
    { duration: 520, easing: TURN_EASE, fill: "forwards" },
  );
  turning.onfinish = () => {
    if (!isAhead) return (sheet.remove(), done());
    apply();
    nextPaint(() => {
      sheet.remove();
      done();
      book
        .querySelectorAll(".nb-questions h2, .nb-body")
        .forEach((shown) => shown.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 }));
    });
  };
}

/** Where the made book's cover stands on the title page: the place it flies to the shelf from. */
export function coverOnTitlePage(book: HTMLElement) {
  const page = book.querySelector(".nb-title-page")?.getBoundingClientRect();
  if (!page?.width || !canMove()) return null;
  const height = Math.min(page.height * 0.78, page.width * 0.8 * 1.5);
  const width = height / 1.5;
  const left = page.left + (page.width - width) / 2;
  return new DOMRect(left, page.top + (page.height - height) / 2, width, height);
}

/** The open book fades away while the made book leaves it for the shelf. */
export function leave(book: HTMLElement, done: () => void) {
  const backdrop = book.closest(".dialog-backdrop");
  if (!backdrop || !canMove()) return done();
  const fading = backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 220,
    easing: "ease-in",
    fill: "forwards",
  });
  fading.onfinish = done;
}
