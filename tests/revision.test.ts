import { Document, Packer } from "docx";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { documentText } from "../src/editor/documentText";
import { createEditorState } from "../src/editor/editorState";
import { acceptChange } from "../src/editor/revisionMarks";
import { standardManuscript } from "../src/export/standardManuscript";
import { editorsFile } from "../src/import/revisionImport";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import {
  revisedPlace,
  revisionChanges,
  sameChange,
  withoutChange,
  writerPlace,
} from "../src/manuscript/revision";
import { serializeMarkdown } from "../src/manuscript/serializeMarkdown";

const MINE = "Isen låg tjock över viken.\nElin gick ut ändå.\n";
const THEIRS = "Isen låg tung över viken.\nElin gick ut.\nMaja väntade.\n";

function firstChange(current: string, revised: string) {
  const [change] = revisionChanges(current, revised);
  if (!change) throw new Error("No change found");
  return change;
}

describe("an editor's changes", () => {
  it("are found word by word, each with what it removes and adds", () => {
    const changes = revisionChanges(MINE, THEIRS);

    expect(changes.map(({ removed, added }) => [removed, added])).toEqual([
      ["tjock", "tung"],
      ["ut ändå.", "ut.\nMaja väntade."],
    ]);
  });

  it("are one change where the editor replaced a phrase, so rejecting it brings the phrase back", () => {
    const mine = "– Det kom i morse, sa Arvid utan att se upp från spisen.";
    const theirs = "– Det kom i morse, sa Arvid vid spisen.";

    const changes = revisionChanges(mine, theirs);

    expect(changes).toHaveLength(1);
    expect(withoutChange(theirs, firstChange(mine, theirs))).toBe(mine);
  });

  it("disappear from the editor's version when rejected", () => {
    const revised = withoutChange(THEIRS, firstChange(MINE, THEIRS));

    expect(revisionChanges(MINE, revised)).toHaveLength(1);
    expect(revised).toContain("tjock");
  });

  it("are written into the text when accepted, a new paragraph where the editor began one", () => {
    let state = createEditorState(
      parseMarkdown("Isen låg tjock över viken.\n\nElin gick ut ändå.\n"),
    );
    for (let round = 0; round < 2; round++) {
      const change = firstChange(documentText(state.doc).text, THEIRS);
      acceptChange(change)(state, (transaction) => (state = state.apply(transaction)));
    }

    expect(serializeMarkdown(state.doc)).toBe(
      "Isen låg tung över viken.\n\nElin gick ut.\n\nMaja väntade.\n",
    );
  });

  it("are found again after other edits by what they remove and add", () => {
    const wanted = firstChange(MINE, THEIRS);

    const later = revisionChanges(`Nu. ${MINE}`, `Nu. ${THEIRS}`);

    expect(sameChange(later, wanted)?.from).toBe(wanted.from + 4);
  });
});

describe("a Word manuscript coming back", () => {
  it("is read scene by scene between the marks Skrivro put in it", async () => {
    const scenes = new Map([
      ["S1AAAAAAAAAAAAAAAAAAAAAAAA", parseMarkdown("Isen låg tjock.\n\nElin gick ut.\n")],
      ["S2AAAAAAAAAAAAAAAAAAAAAAAA", parseMarkdown("Maja väntade.\n")],
    ]);
    const bytes = await standardManuscript({
      book: { title: "Vintervägen", subtitle: "", author: "Elin Berg", words: 10 },
      outline: [
        { kind: "chapter", number: 1, title: "Brevet" },
        { kind: "scene", id: "S1AAAAAAAAAAAAAAAAAAAAAAAA" },
        { kind: "chapter", number: 2, title: "Fyren" },
        { kind: "scene", id: "S2AAAAAAAAAAAAAAAAAAAAAAAA" },
      ],
      scenes,
      typography: "svensk",
      language: "sv-SE",
      hasTitlePage: true,
    });

    const { texts } = await editorsFile(bytes);

    expect(texts.get("S1AAAAAAAAAAAAAAAAAAAAAAAA")).toBe("Isen låg tjock.\nElin gick ut.\n");
    expect(texts.get("S2AAAAAAAAAAAAAAAAAAAAAAAA")).toBe("Maja väntade.\n");
  });

  it("gives nothing for a Word file Skrivro did not make", async () => {
    const bytes = new Uint8Array(
      await Packer.toBuffer(new Document({ sections: [{ children: [] }] })),
    );

    expect((await editorsFile(bytes)).texts.size).toBe(0);
  });

  it("brings the letter the editor wrote on the first page, and who wrote it", async () => {
    const bytes = await standardManuscript({
      book: { title: "Vintervägen", subtitle: "", author: "Elin Berg", words: 10 },
      outline: [],
      scenes: new Map(),
      typography: "svensk",
      language: "sv-SE",
      hasTitlePage: true,
      letter: ["Tack för sist."],
    });
    const zip = await JSZip.loadAsync(bytes);
    const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
    const end = xml.lastIndexOf("<w:p>", xml.indexOf('w:name="skrivroend_BREV"'));
    const written = "<w:p><w:r><w:t>Hej Elin! Isen bär boken.</w:t></w:r></w:p>";
    zip.file("word/document.xml", xml.slice(0, end) + written + xml.slice(end));
    const core = (await zip.file("docProps/core.xml")?.async("string")) ?? "";
    const saver = "<cp:lastModifiedBy>Lena Ek</cp:lastModifiedBy>";
    zip.file(
      "docProps/core.xml",
      core.replace(/<cp:lastModifiedBy>.*?<\/cp:lastModifiedBy>/, saver),
    );

    const file = await editorsFile(await zip.generateAsync({ type: "uint8array" }));

    expect(file.letter).toBe("Hej Elin! Isen bär boken.");
    expect(file.editor).toBe("Lena Ek");
    expect(file.sentAt).toBeGreaterThan(0);
    expect(file.texts.size).toBe(0);
  });
});

describe("what is typed in Redigera", () => {
  const MINE_CAT = "En katt sov.\n";
  const THEIRS_CAT = "En katten sov.\n";

  it("is the letters put in or taken out, not the whole word", () => {
    expect(revisionChanges(MINE_CAT, THEIRS_CAT)).toEqual([
      { from: 7, to: 7, removed: "", added: "en", revisedFrom: 7, revisedTo: 9 },
    ]);
    expect(revisionChanges(THEIRS_CAT, MINE_CAT)).toEqual([
      { from: 7, to: 9, removed: "en", added: "", revisedFrom: 7, revisedTo: 7 },
    ]);
  });

  it("stays a word replaced when it changes in the middle", () => {
    expect(firstChange("En kast.\n", "En katt.\n")).toMatchObject({
      removed: "kast.",
      added: "katt.",
    });
  });

  it("goes on after the letters added, where the caret shows", () => {
    const changes = revisionChanges(MINE_CAT, THEIRS_CAT);

    expect(revisedPlace(changes, 3)).toBe(3);
    expect(revisedPlace(changes, 7)).toBe(9);
    expect(revisedPlace(changes, 10)).toBe(12);
    expect(writerPlace(changes, 9)).toBe(7);
    expect(writerPlace(changes, 12)).toBe(10);
  });

  it("goes before a word replaced when the caret is at its start, and after it inside it", () => {
    const changes = revisionChanges(MINE, THEIRS);

    expect(revisedPlace(changes, 9)).toBe(9);
    expect(revisedPlace(changes, 11)).toBe(13);
  });
});
