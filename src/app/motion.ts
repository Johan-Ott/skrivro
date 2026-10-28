// Ny bok's movements: the book growing out of the shelf, its pages turning, and the made book
// flying to its place. They are left out where they cannot run or the writer asked for less.

export const EASE = "cubic-bezier(.2,.7,.2,1)";

/** False in tests, with reduced motion, and on a phone, where the dialog is one page. */
export function canMove() {
  if (typeof document.body.animate !== "function") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return window.innerWidth > 760;
}

/** The transform that puts the box `to` where `from` is, for an element placed at `to` with its
 * transform origin at its top left corner. */
export const flipTo = (from: DOMRect, to: DOMRect) =>
  `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
