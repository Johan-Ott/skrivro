const SVG = "http://www.w3.org/2000/svg";
// Space around and between the spreads, in the SVG's own units (points).
const GAP = 24;
// How far the spine's shade reaches into a page, as a share of its width.
const SPINE = 0.12;

function shape(name: string, attributes: Record<string, string | number>) {
  const element = document.createElementNS(SVG, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

// The spine's shade, darkest where the pages meet: a left page's right edge, a right page's left.
function spineShades(svg: SVGSVGElement) {
  const defs = shape("defs", {});
  for (const [id, from, to] of [
    ["print-spine-left", 1, 0],
    ["print-spine-right", 0, 1],
  ] as const) {
    const shade = shape("linearGradient", { id });
    shade.setAttribute("x1", String(from));
    shade.setAttribute("x2", String(to));
    shade.append(
      shape("stop", { offset: 0, "stop-opacity": 0.2 }),
      shape("stop", { offset: 0.35, "stop-opacity": 0.06 }),
      shape("stop", { offset: 1, "stop-opacity": 0 }),
    );
    defs.append(shade);
  }
  svg.prepend(defs);
}

// The paper under the page and the spine's shade over it.
function frame(page: SVGGElement, isRight: boolean, width: number, height: number) {
  const spine = width * SPINE;
  page.prepend(shape("rect", { width, height, class: "print-sheet" }));
  page.append(
    shape("rect", {
      x: isRight ? 0 : width - spine,
      width: spine,
      height,
      fill: `url(#print-spine-${isRight ? "right" : "left"})`,
      "pointer-events": "none",
    }),
  );
}

// Lays Typst's column of pages out as an open book, page 1 alone on the right, and shows the
// spread `row`. Framed once only, as React may run it twice on the same pages.
export function framePages(svg: SVGSVGElement, row: number) {
  const pages = Array.from(svg.querySelectorAll<SVGGElement>(".typst-page"));
  const width = Math.max(0, ...pages.map((page) => Number(page.dataset["pageWidth"])));
  const height = Math.max(0, ...pages.map((page) => Number(page.dataset["pageHeight"])));
  if (!svg.querySelector(".print-sheet")) {
    spineShades(svg);
    pages.forEach((page, index) => {
      const column = (index + 1) % 2;
      const top = Math.floor((index + 1) / 2) * (height + GAP);
      frame(page, column === 1, width, height);
      page.setAttribute("transform", `translate(${column * width}, ${top})`);
    });
  }
  svg.setAttribute("viewBox", `0 ${row * (height + GAP)} ${width * 2} ${height}`);
  // Typst leaves its overflow visible, which would show the other spreads' empty paper.
  svg.style.overflow = "hidden";
  svg.removeAttribute("width");
  svg.removeAttribute("height");
}
