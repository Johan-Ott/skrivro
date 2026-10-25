import { Fragment, Slice } from "prosemirror-model";
import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { manuscriptSchema as schema } from "../src/manuscript/schema";
import { serializeMarkdown } from "../src/manuscript/serializeMarkdown";

const roundTrip = (markdown: string) => serializeMarkdown(parseMarkdown(markdown));

const PENNA_SCENE = [
  "Brevet låg på köksbordet när Elin kom in från *kylan*.",
  "",
  "– Det kom i morse, sa **Arvid**.",
  "",
  "* * *",
  "",
  "::: brev",
  "Kära Elin. Om du läser det här har isen till slut släppt.",
  "",
  "Din Henrik",
  ":::",
  "",
].join("\n");

const FOREIGN_MARKDOWN = [
  "# Kapitel 8",
  "",
  "",
  "Text med _understreck_, __fet__, en [länk](https://example.com) och `kod`.",
  "Rad två i samma stycke.",
  "",
  "- en lista",
  "- med två punkter",
  "",
  "```",
  "kodblock",
  "```",
  "",
  "::: okänd",
  "Egen stil som Skrivro inte har.",
  ":::",
  "",
  "::: brev",
  "Ett brev som aldrig stängs.",
].join("\n");

describe("Markdown round trip without edits", () => {
  it("gives back a Skrivro scene unchanged", () => {
    const result = roundTrip(PENNA_SCENE);

    expect(result).toBe(PENNA_SCENE);
  });

  it("gives back Markdown from other programs unchanged", () => {
    const result = roundTrip(FOREIGN_MARKDOWN);

    expect(result).toBe(FOREIGN_MARKDOWN);
  });

  it("gives back Windows line endings unchanged", () => {
    const markdown = "Första stycket.\r\n\r\nAndra *stycket*.\r\n";

    const result = roundTrip(markdown);

    expect(result).toBe(markdown);
  });

  it("gives back an empty scene unchanged", () => {
    const result = roundTrip("");

    expect(result).toBe("");
  });
});

describe("parseMarkdown", () => {
  it("reads italic and bold as marks", () => {
    const doc = parseMarkdown("Brevet *låg* **där**.");

    const marked = doc.firstChild?.content.content.map((text) => [
      text.text,
      text.marks.map((mark) => mark.type.name),
    ]);

    expect(marked).toEqual([
      ["Brevet ", []],
      ["låg", ["italic"]],
      [" ", []],
      ["där", ["bold"]],
      [".", []],
    ]);
  });

  it("keeps a centred, a right-aligned and an unindented paragraph as written", () => {
    const scene =
      "::: centrerat\nStockholm, 1912\n:::\n\n::: hoger\nDin Henrik\n:::\n\n::: utan-indrag\nSå.\n:::\n";
    const doc = parseMarkdown(scene);

    expect([0, 1, 2].map((index) => doc.child(index).attrs["style"])).toEqual([
      "centrerat",
      "hoger",
      "utan-indrag",
    ]);
    expect(roundTrip(scene)).toBe(scene);
  });

  it("keeps a bulleted list, a numbered list and an indent as style blocks", () => {
    const scene =
      "::: punktlista\nMjöl\n\nÄgg\n:::\n\n::: numrerad\nFörst\n\nSedan\n:::\n\n::: indrag\nInskjutet.\n:::\n";
    const doc = parseMarkdown(scene);

    expect([0, 1, 2].map((index) => doc.child(index).attrs["style"])).toEqual([
      "punktlista",
      "numrerad",
      "indrag",
    ]);
    expect(doc.child(0).childCount).toBe(2);
    expect(roundTrip(scene)).toBe(scene);
  });

  it("shows a Markdown list as a bulleted list, written back as it was until it changes", () => {
    const scene = "Stäm av:\n\n- **Brottet** tidigt?\n- Den skyldige med?\n";
    const doc = parseMarkdown(scene);

    expect(doc.child(1).attrs["style"]).toBe("punktlista");
    expect(doc.child(1).childCount).toBe(2);
    expect(roundTrip(scene)).toBe(scene);
    const edited = doc.replace(
      doc.content.size - 2,
      doc.content.size - 2,
      new Slice(Fragment.from(schema.text("!")), 0, 0),
    );
    expect(serializeMarkdown(edited)).toBe(
      "Stäm av:\n\n::: punktlista\n**Brottet** tidigt?\n\nDen skyldige med?!\n:::\n",
    );
  });

  it("reads a scene break and a style block", () => {
    const doc = parseMarkdown("* * *\n\n::: brev\nKära Elin.\n:::\n");

    expect(doc.child(0).type.name).toBe("sceneBreak");
    expect(doc.child(1).type.name).toBe("styleBlock");
    expect(doc.child(1).attrs["style"]).toBe("brev");
    expect(doc.child(1).textContent).toBe("Kära Elin.");
  });

  it("keeps blocks Skrivro does not know as raw text", () => {
    const doc = parseMarkdown("# Rubrik\n\nText.");

    expect(doc.child(0).type.name).toBe("rawBlock");
    expect(doc.child(0).attrs["source"]).toBe("# Rubrik");
  });

  it("keeps a line break inside a paragraph", () => {
    const doc = parseMarkdown("Kära Elin.\nDin Henrik");

    expect(doc.firstChild?.child(1).type.name).toBe("lineBreak");
  });
});

describe("serializeMarkdown after edits", () => {
  const paragraph = (text: string) => schema.node("paragraph", null, [schema.text(text)]);

  it("writes italic and bold with asterisks", () => {
    const italic = schema.marks["italic"]?.create();
    const bold = schema.marks["bold"]?.create();
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [
        schema.text("Brevet "),
        schema.text("låg", italic ? [italic] : []),
        schema.text(" "),
        schema.text("där", bold ? [bold] : []),
      ]),
    ]);

    const markdown = serializeMarkdown(doc);

    expect(markdown).toBe("Brevet *låg* **där**\n");
  });

  it("keeps spaces outside the asterisks and leaves out spaces at the end of a line", () => {
    const italic = schema.marks["italic"]?.create();
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [
        schema.text("ett "),
        schema.text("ord ", italic ? [italic] : []),
      ]),
    ]);

    const markdown = serializeMarkdown(doc);

    expect(markdown).toBe("ett *ord*\n");
  });

  it("escapes characters that would otherwise become Markdown", () => {
    const typed = [
      "5 * 3 är _inte_ [15]",
      "# inte en rubrik",
      "- inte en lista",
      "::: inte en stil",
    ];
    const doc = schema.node(
      "doc",
      null,
      typed.map((text) => paragraph(text)),
    );

    const reread = parseMarkdown(serializeMarkdown(doc));

    expect(reread.childCount).toBe(typed.length);
    reread.forEach((node, _offset, index) => {
      expect(node.type.name).toBe("paragraph");
      expect(node.textContent).toBe(typed[index]);
    });
  });

  it("rewrites only the paragraph that changed", () => {
    const doc = parseMarkdown("Ett _första_ stycke.\n\nEtt andra stycke.\n");
    const second = doc.child(1);
    const edited = doc.replace(
      doc.child(0).nodeSize + 1,
      doc.child(0).nodeSize + 1 + second.content.size,
      doc.slice(doc.child(0).nodeSize + 1, doc.child(0).nodeSize + 4),
    );

    const markdown = serializeMarkdown(edited);

    expect(markdown).toBe("Ett _första_ stycke.\n\nEtt\n");
  });

  it("keeps two paragraphs apart when one is pasted where it had no gap before", () => {
    const doc = parseMarkdown("Första.\n\nAndra.\n");
    const pasted = doc.copy(doc.content.addToEnd(doc.child(0)));

    const markdown = serializeMarkdown(pasted);

    expect(markdown).toBe("Första.\n\nAndra.\n\nFörsta.\n");
  });

  it("is stable when an edited document is saved twice", () => {
    const doc = schema.node("doc", null, [paragraph("Hon sa: *nej* & gick [ut].")]);

    const once = serializeMarkdown(doc);
    const twice = serializeMarkdown(parseMarkdown(once));

    expect(twice).toBe(once);
  });
});
