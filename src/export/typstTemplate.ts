import { LEADING_EM, type BookDesign, type BookTheme } from "./bookDesign.js";
import { escapeTypst, typstString } from "./typstText.js";
import { BLEED_MM, CHAPTER_STARTS, PAGE_PARTS, pageSetup } from "./typstPage.js";

const HEADINGS: Record<BookTheme, string> = {
  klassisk: `weight: 600, style: "normal"`,
  modern: `weight: 600, style: "normal"`,
  luftig: `weight: 400, style: "italic"`,
};

// Typst measures how many words fit beside the two-line anfang.
const ANFANG = `#let leadin(words) = text(size: 0.8em, tracking: 0.06em, upper(words))
#let leadin-par(words) = {
  let small = calc.min(3, words.len())
  par[#leadin(words.slice(0, small).join([ ]))#if words.len() > small [ #words.slice(small).join([ ])]]
}
#let anfang(letter, words) = layout(size => {
  set par(first-line-indent: 0pt)
  let two-lines = measure(block(width: size.width, [M#linebreak()M])).height
  let one-cap = measure(text(top-edge: "cap-height", bottom-edge: "baseline", letter)).height
  let cap = text(size: 1em * (two-lines / one-cap), top-edge: "cap-height", bottom-edge: "baseline", letter)
  let cap-width = measure(cap).width + 0.15em.to-absolute()
  let opening(count) = {
    let small = calc.min(3, count)
    leadin(words.slice(0, small).join([ ]))
    if count > small [ #words.slice(small, count).join([ ])]
  }
  let fits(count) = measure(block(width: size.width - cap-width, opening(count))).height <= two-lines
  let count = 0
  while count < words.len() and fits(count + 1) { count += 1 }
  let more = words.len() > count
  grid(columns: (cap-width, 1fr), cap, [#opening(count)#if more { linebreak(justify: true) }])
  if more { par(words.slice(count).join([ ])) }
})`;

// The space under a heading belongs to its own block; a v() would be lost at a page break.
const CLASSIC_PARTS = `#let scenbrytning(mark) = align(center, block(above: 1.4em, below: 1.4em, mark))
#let stil(name, body) = {
  set par(first-line-indent: 0pt)
  let sides = (left: 1.6em, right: 1.6em)
  if name == "brev" { block(inset: sides, above: 1.2em, below: 1.2em, emph(body)) }
  else if name == "dikt" { set par(justify: false); block(inset: (left: 2.4em), above: 1.2em, below: 1.2em, body) }
  else if name == "meddelande" or name == "meddelande-ut" {
    set text(font: "Geist", size: 0.85em)
    show par: it => block(fill: if name == "meddelande" { luma(238) } else { luma(222) }, inset: (x: 8pt, y: 5pt), radius: 6pt, above: 0.5em, below: 0.5em, it)
    let inset = if name == "meddelande" { (right: 25%) } else { (left: 25%) }
    block(inset: inset, above: 1.2em, below: 1.2em, body)
  }
  else if name == "motto" { set par(justify: false); align(right, block(width: 70%, above: 1.2em, below: 2em, align(right, emph(body)))) }
  else if name == "centrerat" { set par(justify: false); align(center, body) }
  else if name == "hoger" { set par(justify: false); align(right, body) }
  else if name == "utan-indrag" { body }
  else if name == "kapitaler" { text(size: 0.82em, tracking: 0.06em, upper(body)) }
  else if name == "punktlista" or name == "numrerad" {
    let punkt = counter("punkt")
    punkt.update(0)
    show par: it => {
      punkt.step()
      let mark = if name == "punktlista" { [•] } else { context punkt.display("1.") }
      block(above: 0.5em, below: 0.5em, grid(columns: (1.4em, 1fr), mark, it))
    }
    block(above: 1.2em, below: 1.2em, body)
  }
  else if name == "indrag" { block(inset: (left: 2em), body) }
  else if name == "underrubrik" { block(above: 1.6em, below: 0.8em, sticky: true, strong(body)) }
  else if name == "ruta" { block(stroke: 0.5pt + luma(120), inset: 0.9em, radius: 2pt, width: 100%, above: 1.2em, below: 1.2em, body) }
  else if name == "hangande-indrag" { set par(hanging-indent: 2em); block(above: 1.2em, below: 1.2em, body) }
  else { block(inset: sides, above: 1.2em, below: 1.2em, body) }
}
// Small capitals drawn the same in every typeface: lower-case letters as smaller capitals.
#let small-caps(words) = words.clusters().map(letter => if lower(letter) == letter and upper(letter) != letter { text(size: 0.78em, upper(letter)) } else { letter }).join()
#let cased(title) = if heading-style.case == "versaler" { upper(title) } else if heading-style.case == "kapitaler" { small-caps(title) } else { title }
// The picture as large as fits in the given share of the width and height, keeping its shape.
#let fitted(path, width, height) = layout(size => {
  let natural = measure(image(path))
  let scale = calc.min(width * size.width / natural.width, height.to-absolute() / natural.height)
  image(path, width: natural.width * scale)
})
// Templates are drawn as a right-hand page; on a left-hand page they are mirrored, like the margins.
#let picture-at(shown) = context {
  let is-right = calc.odd(here().page())
  let side = if is-right { margin.inside } else { margin.outside }
  let x = if is-right { shown.x } else { trim-width - shown.x - shown.width }
  let area = box(width: shown.width, height: shown.height, clip: true, image(shown.path, width: 100%, height: 100%, fit: shown.fit))
  place(top + left, dx: x - side, dy: shown.y - margin.top, area)
}
// A picture in the text: part of the width, all of it, or a page of its own.
#let bild(path, size, caption) = {
  let shown = if size == "sida" { image(path, width: 100%, height: 85%, fit: "contain") } else { image(path, width: if size == "smal" { 60% } else { 100% }) }
  let figure = align(center, block({
    shown
    if caption != none { v(0.5em); text(size: 0.85em, style: "italic", caption) }
  }))
  if size == "sida" { align(horizon, figure); pagebreak(weak: true) } else { block(above: 1.4em, below: 1.4em, figure) }
}
#let no-extra = (subtitle: none, epigraph: none, by: none)
#let epigraph(words, by, side) = align(side, block(width: 75%, below: 2.4em, {
  set par(first-line-indent: 0pt, justify: false)
  set align(side)
  text(size: 0.9em, style: "italic", words)
  if by != none { linebreak(); v(0.2em); text(size: 0.85em)[#sym.dash.em #by] }
}))
#let opening(label, title, toc, layout, extra) = {
  [#metadata(none) <chapter-end>]
  pagebreak(weak: true, to: chapter-start)
  // Its sheet from 0 and its printed number, so Publicera can turn to it and name its page.
  context [#metadata((sheet: here().page() - 1, folio: counter(page).get().first())) <opening>]
  chapter-title.update(if title == none { toc } else { title })
  heading(level: 1, toc)
  for shown in layout.pictures { picture-at(shown) }
  v(layout.drop)
  align(layout.align, block(below: 2.4em)[
    #set par(first-line-indent: 0pt, justify: false)
    #if label != none { text(size: 0.75em, tracking: 0.18em, upper(label)) }
    #if label != none and title != none { linebreak(); v(0.4em) }
    #if title != none {
      text(font: heading-style.font, size: 1.7em, weight: heading-style.weight, style: heading-style.style, cased(title))
    }
    #if extra.subtitle != none { linebreak(); v(0.3em); text(size: 0.95em, style: "italic", extra.subtitle) }
  ])
  if extra.epigraph != none { epigraph(extra.epigraph, extra.by, layout.align) }
}
// Invisible: the printed book is byte for byte the same with or without page marks.
#let pagemark(scene, block) = context [#metadata((scene: scene, block: block, page: counter(page).get().first())) <pm>]
#let kapitel(label, title, toc, layout: plain-layout, extra: no-extra) = opening(label, title, toc, layout, extra)
#let del(label, title, toc, extra: no-extra) = opening(label, title, toc, part-layout, extra)`;

/** What setting the book needs beyond its design. */
export interface TemplateOptions {
  /** The scene break: Typst content, such as the stars or a picture. */
  breakMark: string;
  /** Layouts for chapters that use the standard template plainly, and for parts. */
  plainLayout: string;
  partLayout: string;
  hasBleed: boolean;
}

function headingSetup(design: BookDesign, options: TemplateOptions) {
  const style = `font: ${typstString(design.headingFont)}, ${HEADINGS[design.theme]}`;
  return `#let heading-style = (${style}, case: ${typstString(design.titleCase)})
#let plain-layout = ${options.plainLayout}
#let part-layout = ${options.partLayout}`;
}

export const textMark = (mark: string) => `[${escapeTypst(mark)}]`;

export function bookTemplate(
  design: BookDesign,
  book: { title: string; author: string },
  language: string,
  options: TemplateOptions,
) {
  return `#let book-title = ${typstString(book.title)}
#let book-author = ${typstString(book.author)}
#let chapter-start = ${CHAPTER_STARTS[design.chapterStart]}
#let in-story = state("in-story", false)
#let chapter-title = state("chapter-title", none)
${headingSetup(design, options)}
${PAGE_PARTS}
#set document(title: book-title)
${pageSetup(design, options.hasBleed ? BLEED_MM : 0)}
#set text(font: ${typstString(design.bodyFont)}, size: ${design.bodySize}pt, lang: ${typstString(language.slice(0, 2))}, hyphenate: true)
// A paragraph's single first or last line alone on a page (orphan, widow) is avoided harder.
#set text(costs: (widow: 300%, orphan: 300%))
#set par(justify: true, leading: ${LEADING_EM[design.leading]}em, spacing: ${LEADING_EM[design.leading]}em, first-line-indent: 1.2em)
#show heading: none

${ANFANG}
${CLASSIC_PARTS}
#let break-mark = ${options.breakMark}`;
}
