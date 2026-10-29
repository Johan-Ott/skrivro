// The books' movements: Ny bok growing out of the shelf, a cover flying to its place or growing
// into the page. They are left out where they cannot run or the writer asked for less.

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

/** A copy of `element` fixed over it, so it can fly on when the screen under it changes. */
export function ghostOf(element: HTMLElement, className: string) {
  const { left, top, width, height } = element.getBoundingClientRect();
  const ghost = element.cloneNode(true) as HTMLElement;
  ghost.classList.add(className);
  ghost.inert = true;
  ghost.setAttribute("aria-hidden", "true");
  // Inline, as a cover's own position would win over a class.
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  });
  document.body.append(ghost);
  return ghost;
}
