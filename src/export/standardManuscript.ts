import {
  AlignmentType,
  Bookmark,
  Document,
  Header,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
  type IParagraphOptions,
  type ParagraphChild,
} from "docx";
import type { Node } from "prosemirror-model";
import type { BookDetails, OutlineItem, Typography } from "./book.js";
import { runs, type TextSettings, type WordNotes } from "./wordRuns.js";
import { bookWords, headingLabel, roundedWords, titleBesideLabel } from "./bookWords.js";
import { sceneEndMark, sceneStartMark } from "./sceneMarks.js";
import { listItem, listNumbering, LIST_STYLES, type WordLists } from "./wordLists.js";

interface ManuscriptInput {
  book: BookDetails;
  outline: OutlineItem[];
  scenes: Map<string, Node>;
  typography: Typography;
  language: string;
  hasTitlePage: boolean;
}

// The standard manuscript: Times New Roman 12 pt, double spacing, 2.5 cm margins, 1.27 cm indent.
const FONT = "Times New Roman";
const HALF_POINTS = 24;
const DOUBLE_SPACING = 480;
const MARGIN = 1418;
const INDENT = 720;
// Parts and chapters start a third of the way down a new page.
const HEADING_DROP = 3600;
const SCENE_BREAK = "* * *";
const HEADING_RUN = { font: FONT, size: HALF_POINTS, bold: false, italics: false, color: "000000" };

// Paragraphs are kept as options until the scene is done, so its marks can go inside them.
type ParagraphOptions = { children: ParagraphChild[] } & Omit<IParagraphOptions, "children">;

const centeredOptions = (text: string): ParagraphOptions => ({
  alignment: AlignmentType.CENTER,
  children: [new TextRun(text)],
});

const centered = (text: string, extra: object = {}) =>
  new Paragraph({ ...centeredOptions(text), ...extra });

const RIGHT = { alignment: AlignmentType.RIGHT };
const UNINDENTED = { indent: { firstLine: 0 } };

// Centrerat, the right-hand styles, Utan indrag and Kapitäler only set the line; the others are
// inset. Agents get no small capitals, and an Underrubrik is plain text as the headings are.
const LAYOUTS: Record<string, object> = {
  centrerat: { alignment: AlignmentType.CENTER },
  hoger: RIGHT,
  "meddelande-ut": RIGHT,
  motto: RIGHT,
  "utan-indrag": UNINDENTED,
  kapitaler: UNINDENTED,
  underrubrik: { ...UNINDENTED, spacing: { before: DOUBLE_SPACING / 2 }, keepNext: true },
  "hangande-indrag": { indent: { left: INDENT, hanging: INDENT } },
};

function paragraphLayout(isFirst: boolean, style: string | null) {
  if (!style) return { indent: { firstLine: isFirst ? 0 : INDENT } };
  return LAYOUTS[style] ?? { indent: { left: INDENT } };
}

type BlockSettings = TextSettings & { lists: WordLists };

// A list is Word's own: its items carry the list, not an indent or a typed mark of their own.
function styledParagraphs(block: Node, settings: BlockSettings): ParagraphOptions[] {
  const style = String(block.attrs["style"]);
  const isList = LIST_STYLES.has(style);
  if (isList) settings.lists.count += 1;
  const inner: ParagraphOptions[] = [];
  block.forEach((child) =>
    inner.push(
      ...(isList
        ? [{ children: runs(child, settings), ...listItem(settings.lists, style) }]
        : blockParagraphs(child, { isFirst: true, style }, settings)),
    ),
  );
  return inner;
}

function blockParagraphs(
  block: Node,
  place: { isFirst: boolean; style: string | null },
  settings: BlockSettings,
): ParagraphOptions[] {
  const name = block.type.name;
  if (name === "sceneBreak") return [centeredOptions(SCENE_BREAK)];
  if (name === "rawBlock") return [{ children: [new TextRun(String(block.attrs["source"]))] }];
  // A manuscript for agents and editors carries no pictures; it says where one goes.
  if (name === "picture") {
    return [centeredOptions(`[${block.attrs["caption"] || block.attrs["name"]}]`)];
  }
  if (name === "styleBlock") return styledParagraphs(block, settings);
  const children = runs(block, settings);
  return [{ children, ...paragraphLayout(place.isFirst, place.style) }];
}

// Invisible, at the start of the scene's first paragraph and the end of its last.
function withSceneMarks(paragraphs: ParagraphOptions[], sceneId: string): Paragraph[] {
  const last = paragraphs.length - 1;
  return paragraphs.map((options, index) => {
    const start = index === 0 ? [new Bookmark({ id: sceneStartMark(sceneId), children: [] })] : [];
    const end = index === last ? [new Bookmark({ id: sceneEndMark(sceneId), children: [] })] : [];
    return new Paragraph({ ...options, children: [...start, ...options.children, ...end] });
  });
}

/** The first paragraph, and the one after a scene break, are not indented. */
function sceneParagraphs(doc: Node, settings: BlockSettings): ParagraphOptions[] {
  const paragraphs: ParagraphOptions[] = [];
  let isFirst = true;
  doc.forEach((block) => {
    paragraphs.push(...blockParagraphs(block, { isFirst, style: null }, settings));
    isFirst = block.type.name === "sceneBreak";
  });
  return paragraphs;
}

// A chapter is Heading 1, as Word's navigation and Docs' outline expect; under parts, Heading 2.
function headingLevel(item: OutlineItem, hasParts: boolean) {
  return item.kind === "chapter" && hasParts ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_1;
}

function headingParagraphs(
  item: Extract<OutlineItem, { kind: "part" | "chapter" }>,
  language: string,
  hasParts: boolean,
) {
  const label = headingLabel(item, language);
  const title = titleBesideLabel(item.title, label);
  // One heading in Word's own style, label and title on two lines, so its navigation lists it.
  return [
    new Paragraph({
      heading: headingLevel(item, hasParts),
      alignment: AlignmentType.CENTER,
      pageBreakBefore: true,
      spacing: { before: HEADING_DROP },
      children: [new TextRun(label), ...(title ? [new TextRun({ text: title, break: 1 })] : [])],
    }),
  ];
}

function bodyParagraphs(input: ManuscriptInput, notes: WordNotes): Paragraph[] {
  const { outline, scenes, typography, language } = input;
  const settings = { typography, notes, lists: { count: 0 } };
  const hasParts = outline.some((item) => item.kind === "part");
  const paragraphs: Paragraph[] = [];
  let previous: OutlineItem["kind"] | null = null;
  for (const item of outline) {
    if (item.kind !== "scene") paragraphs.push(...headingParagraphs(item, language, hasParts));
    else {
      const doc = scenes.get(item.id);
      if (previous === "scene") paragraphs.push(centered(SCENE_BREAK));
      if (doc) paragraphs.push(...withSceneMarks(sceneParagraphs(doc, settings), item.id));
    }
    previous = item.kind;
  }
  return paragraphs;
}

function titlePage(book: BookDetails, language: string): Paragraph[] {
  return [
    new Paragraph(book.author),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun(roundedWords(book.words, language))],
    }),
    centered(book.title.toLocaleUpperCase(language), { spacing: { before: HEADING_DROP } }),
    ...(book.subtitle ? [centered(book.subtitle)] : []),
    ...(book.author ? [centered(bookWords(language).byAuthor(book.author))] : []),
  ];
}

function pageHeader(book: BookDetails) {
  const surname = book.author.trim().split(/\s+/).pop() ?? "";
  const text = [surname, book.title].filter((part) => part !== "").join(" / ");
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun(`${text} / `), new TextRun({ children: [PageNumber.CURRENT] })],
      }),
    ],
  });
}

const manuscriptStyles = (language: string) => ({
  default: {
    document: {
      // Word spellchecks the manuscript in the book's language.
      run: { font: FONT, size: HALF_POINTS, language: { value: language } },
      paragraph: { spacing: { line: DOUBLE_SPACING } },
    },
    // Headings look as the text does; Word's own blue and large type is not a manuscript's.
    heading1: { run: HEADING_RUN },
    heading2: { run: HEADING_RUN },
  },
});

/** Built whole in memory before anything is saved. */
export async function standardManuscript(input: ManuscriptInput): Promise<Uint8Array> {
  const page = { margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } };
  const notes: WordNotes = { entries: {}, count: 0 };
  const body = bodyParagraphs(input, notes);
  const document = new Document({
    footnotes: notes.entries,
    numbering: listNumbering,
    creator: input.book.author,
    title: input.book.title,
    styles: manuscriptStyles(input.language),
    sections: [
      ...(input.hasTitlePage
        ? [{ properties: { page }, children: titlePage(input.book, input.language) }]
        : []),
      {
        properties: { page: { ...page, pageNumbers: { start: 1 } } },
        headers: { default: pageHeader(input.book) },
        children: body,
      },
    ],
  });
  return new Uint8Array(await Packer.toArrayBuffer(document));
}
