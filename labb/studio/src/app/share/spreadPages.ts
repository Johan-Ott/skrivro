/** What one printed page holds, read from the pages on screen in Läs som bok. */
export type PageBlock =
  | { kind: "chapter"; number: string; title: string }
  | { kind: "text"; text: string; isFirst: boolean; isQuoted: boolean }
  | { kind: "break" };

const textIn = (element: Element | null) => element?.textContent?.trim() ?? "";

function chapterOf(element: Element): PageBlock {
  const number = textIn(element.querySelector(".read-chapter-number"));
  return { kind: "chapter", number, title: textIn(element.querySelector(".read-chapter-title")) };
}

// A paragraph right after another is indented; the first one and a letter or quote are not.
function textOf(element: Element): PageBlock[] {
  const text = textIn(element);
  if (!text) return [];
  const isFirst = element.previousElementSibling?.tagName !== "P";
  return [{ kind: "text", text, isFirst, isQuoted: false }];
}

// A letter or a quote keeps its own lines, each set in from the margin.
const quotedOf = (element: Element): PageBlock[] =>
  Array.from(element.children)
    .map(textIn)
    .filter(Boolean)
    .map((text) => ({ kind: "text", text, isFirst: true, isQuoted: true }));

function blocksOf(element: Element): PageBlock[] {
  if (element.classList.contains("read-scene")) return [{ kind: "break" }];
  if (element.classList.contains("style")) return quotedOf(element);
  if (element.classList.contains("read-chapter")) return [chapterOf(element)];
  if (element.classList.contains("scene-break")) return [{ kind: "break" }];
  return textOf(element);
}

// A scene after the first in a chapter starts with a break, as the reading view draws it.
function sceneParts(scene: Element): Element[] {
  const parts = Array.from(scene.querySelectorAll(".read-chapter, .read-text > *"));
  const isOpening = scene.classList.contains("opens-chapter") || !scene.previousElementSibling;
  return isOpening ? parts : [scene, ...parts];
}

/** The pages `first` to `first + count - 1`, each with the blocks that start on it. */
export function spreadPages(flow: HTMLElement, first: number, count: number): PageBlock[][] {
  const pageWidth = (flow.parentElement?.clientWidth ?? 1) / count;
  const left = flow.getBoundingClientRect().left;
  const pageOf = (element: Element) =>
    Math.floor((element.getBoundingClientRect().left - left + 1) / pageWidth) - first;
  const pages: PageBlock[][] = Array.from({ length: count }, () => []);
  const parts = Array.from(flow.querySelectorAll(".read-scene")).flatMap(sceneParts);
  for (const part of parts) pages[pageOf(part)]?.push(...blocksOf(part));
  return pages;
}
