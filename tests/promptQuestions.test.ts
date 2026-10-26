import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { serializeMarkdown } from "../src/manuscript/serializeMarkdown";
import {
  countDocumentWords,
  countMarkdownWords,
  countWordsBetween,
} from "../src/manuscript/wordCount";
import { manuscriptSchema as schema } from "../src/manuscript/schema";

const NOTE = { isNote: true };

const NEW_PERSON = [
  "**Vill:**",
  "",
  "<!-- Vad jagar hen, så konkret att det syns i en scen? -->",
  "",
  "**Rädd för:**",
  "",
  "<!-- Vad undviker hen till varje pris? -->",
  "",
].join("\n");

const answerFirstQuestion = () => {
  const doc = parseMarkdown(NEW_PERSON, NOTE);
  const answer = schema.node("paragraph", doc.child(1).attrs, [schema.text("Komma hem")]);
  return doc.copy(doc.content.replaceChild(1, answer));
};

describe("a template question", () => {
  it("is shown as the hint of an empty answer and is saved as it was read", () => {
    const doc = parseMarkdown(NEW_PERSON, NOTE);

    expect(doc.child(1).textContent).toBe("");
    expect(doc.child(1).attrs["prompt"]).toBe("Vad jagar hen, så konkret att det syns i en scen?");
    expect(serializeMarkdown(doc)).toBe(NEW_PERSON);
  });

  it("is replaced by the writer's answer", () => {
    const markdown = serializeMarkdown(answerFirstQuestion());

    expect(markdown).toContain("**Vill:**\n\nKomma hem\n\n**Rädd för:**");
    expect(markdown).not.toContain("Vad jagar hen");
  });

  it("comes back when the answer is deleted again", () => {
    const answered = answerFirstQuestion();
    const empty = schema.node("paragraph", answered.child(1).attrs);

    const markdown = serializeMarkdown(answered.copy(answered.content.replaceChild(1, empty)));

    expect(markdown).toBe(NEW_PERSON);
  });

  it("is not counted as words, and nor are the labels above unanswered questions", () => {
    expect(countDocumentWords(parseMarkdown(NEW_PERSON, NOTE))).toBe(0);
    expect(countMarkdownWords(NEW_PERSON, true)).toBe(0);
  });

  it("counts the answer and its label, in the document and in the file alike", () => {
    const answered = answerFirstQuestion();

    expect(countDocumentWords(answered)).toBe(3);
    expect(countMarkdownWords(serializeMarkdown(answered), true)).toBe(3);
  });
});

describe("a comment that is not a template question", () => {
  const SCENE = "Hon gick hem.\n\n<!-- skriv om slutet -->\n\nDet snöade.\n";

  it("stays a raw block and is saved as it was", () => {
    const doc = parseMarkdown(SCENE);

    expect(doc.child(1).type.name).toBe("rawBlock");
    expect(serializeMarkdown(doc)).toBe(SCENE);
  });

  it("is no words: the document, the file and a selection count a comment as nothing", () => {
    const doc = parseMarkdown(SCENE);

    expect(countDocumentWords(doc)).toBe(5);
    expect(countMarkdownWords(SCENE)).toBe(5);
    expect(countWordsBetween(doc, 0, doc.content.size)).toBe(5);
  });

  it("is no question when a line holds two comments", () => {
    const markdown = "**Vill:**\n\n<!-- a --> text <!-- b -->\n";

    expect(parseMarkdown(markdown, NOTE).child(1).type.name).toBe("rawBlock");
  });
});

describe("the count of a file with questions", () => {
  it("is the document's count with Windows line breaks and with two blank lines", () => {
    const crlf = NEW_PERSON.replaceAll("\n", "\r\n");
    const spaced = "**Vill:**\n\n\n<!-- Vad jagar hen? -->\n";

    expect(countMarkdownWords(crlf, true)).toBe(countDocumentWords(parseMarkdown(crlf, NOTE)));
    expect(countMarkdownWords(spaced, true)).toBe(countDocumentWords(parseMarkdown(spaced, NOTE)));
    expect(countMarkdownWords(spaced, true)).toBe(0);
  });
});

describe("a comment under a bold line", () => {
  const OWN_NOTE = "**Obs:**\n\n<!-- kom ihåg tidslinjen -->\n";

  it("stays the writer's own comment in a scene, saved as it was", () => {
    const doc = parseMarkdown(OWN_NOTE);

    expect(doc.child(1).type.name).toBe("rawBlock");
    expect(serializeMarkdown(doc)).toBe(OWN_NOTE);
  });

  it("is a template question in a note", () => {
    const doc = parseMarkdown(OWN_NOTE, NOTE);

    expect(doc.child(1).attrs["prompt"]).toBe("kom ihåg tidslinjen");
  });
});

describe("the count of a file", () => {
  const OWN_COMMENT = "Hon gick.\n\n**Obs:**\n\n<!-- kom ihåg tidslinjen -->\n";

  it("leaves a scene's bold line and comment as the document counts them", () => {
    expect(countMarkdownWords(OWN_COMMENT)).toBe(countDocumentWords(parseMarkdown(OWN_COMMENT)));
  });

  it("leaves a note's unanswered question out, as the document does", () => {
    const note = parseMarkdown(OWN_COMMENT, NOTE);

    expect(countMarkdownWords(OWN_COMMENT, true)).toBe(countDocumentWords(note));
    expect(countMarkdownWords(OWN_COMMENT, true)).toBe(2);
  });
});
