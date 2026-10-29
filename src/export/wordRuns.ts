import {
  ExternalHyperlink,
  FootnoteReferenceRun,
  Paragraph,
  TextRun,
  type ParagraphChild,
} from "docx";
import type { Node } from "prosemirror-model";
import { quoteConverter, type Typography } from "./book.js";
import { footnoteParagraph } from "./footnoteText.js";

// The standard manuscript's text, run by run: its marks as Word has them, and its footnotes.

// Word numbers footnotes through the whole document, in the order they are added.
export interface WordNotes {
  entries: Record<number, { children: Paragraph[] }>;
  count: number;
}

// The note's text keeps its italics and bold, as the text around it does.
function noteReference(settings: TextSettings, text: string) {
  const { notes } = settings;
  notes.count += 1;
  const children = runs(footnoteParagraph(text), settings);
  notes.entries[notes.count] = { children: [new Paragraph({ children, style: "FootnoteText" })] };
  return new FootnoteReferenceRun(notes.count);
}

export interface TextSettings {
  typography: Typography;
  notes: WordNotes;
}

// A link is Word's own, in Word's link style.
function textRun(text: string, child: Node): ParagraphChild {
  const marks = new Set(child.marks.map((mark) => mark.type.name));
  const link = child.marks.find((mark) => mark.type.name === "link");
  const run = new TextRun({
    text,
    italics: marks.has("italic"),
    bold: marks.has("bold"),
    ...(marks.has("underline") && { underline: {} }),
    strike: marks.has("strike"),
    superScript: marks.has("superscript"),
    subScript: marks.has("subscript"),
    ...(link && { style: "Hyperlink" }),
  });
  return link ? new ExternalHyperlink({ link: String(link.attrs["href"]), children: [run] }) : run;
}

export function runs(paragraph: Node, settings: TextSettings): ParagraphChild[] {
  const convert = quoteConverter(settings.typography);
  const children: ParagraphChild[] = [];
  paragraph.forEach((child) => {
    if (child.type.name === "lineBreak") return void children.push(new TextRun({ break: 1 }));
    if (child.type.name === "footnote") {
      return void children.push(noteReference(settings, String(child.attrs["text"])));
    }
    children.push(textRun(convert(child.text ?? ""), child));
  });
  return children;
}
