import { describe, expect, it } from "vitest";
import { sceneTypst } from "../src/export/typstText";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { manuscriptSchema as schema } from "../src/manuscript/schema";
import { serializeMarkdown } from "../src/manuscript/serializeMarkdown";

describe("underline and strikethrough", () => {
  const marksOf = (markdown: string) => {
    const marks: string[] = [];
    parseMarkdown(markdown).descendants((node) => {
      if (node.isText)
        marks.push(`${node.text}:${node.marks.map((mark) => mark.type.name).join("+")}`);
    });
    return marks;
  };

  it("reads <u> and <s> as underline and strikethrough", () => {
    expect(marksOf("Ett <u>viktigt</u> och <s>struket</s> ord.")).toEqual([
      "Ett :",
      "viktigt:underline",
      " och :",
      "struket:strike",
      " ord.:",
    ]);
  });

  it("writes them back as <u> and <s>, also inside italic", () => {
    const underline = schema.marks["underline"]?.create();
    const strike = schema.marks["strike"]?.create();
    const italic = schema.marks["italic"]?.create();
    if (!underline || !strike || !italic) throw new Error("marks missing");
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [
        schema.text("Ett "),
        schema.text("viktigt", [underline]),
        schema.text(" och "),
        schema.text("struket", [italic, strike]),
      ]),
    ]);

    const markdown = serializeMarkdown(doc);

    expect(markdown).toBe("Ett <u>viktigt</u> och *<s>struket</s>*\n");
    expect(serializeMarkdown(parseMarkdown(markdown))).toBe(markdown);
  });
});

describe("superscript, subscript and links", () => {
  const roundTrip = (markdown: string) => serializeMarkdown(parseMarkdown(markdown));
  const linksOf = (markdown: string) => {
    const links: string[] = [];
    parseMarkdown(markdown).descendants((node) => {
      const link = node.marks.find((mark) => mark.type.name === "link");
      if (link) links.push(`${node.text}:${String(link.attrs["href"])}`);
    });
    return links;
  };

  it("reads and writes <sup> and <sub> as raised and lowered text", () => {
    const markdown = "H<sub>2</sub>O och 10<sup>3</sup> liter.\n";

    expect(roundTrip(markdown)).toBe(markdown);
    expect(parseMarkdown(markdown).textContent).toBe("H2O och 103 liter.");
  });

  it("reads a link as linked text, not as raw Markdown, and writes it back the same", () => {
    const markdown = "Läs mer på [Skrivro](https://skrivro.se) i dag.\n";

    expect(linksOf(markdown)).toEqual(["Skrivro:https://skrivro.se"]);
    expect(parseMarkdown(markdown).textContent).toBe("Läs mer på Skrivro i dag.");
    expect(roundTrip(markdown)).toBe(markdown);
  });

  it("keeps two links side by side apart", () => {
    const markdown = "[Ett](https://ett.se)[Två](https://tva.se)\n";

    expect(linksOf(markdown)).toEqual(["Ett:https://ett.se", "Två:https://tva.se"]);
    expect(roundTrip(markdown)).toBe(markdown);
  });

  it("raises, lowers and links the text in the PDF too", () => {
    const doc = parseMarkdown(
      "H<sub>2</sub>O och 10<sup>3</sup> på [Skrivro](https://skrivro.se).\n",
    );

    expect(sceneTypst(doc, { typography: "svensk", hasDropCap: false })).toContain(
      'H#sub[2]O och 10#super[3] på #link("https://skrivro.se")[Skrivro]',
    );
  });
});
