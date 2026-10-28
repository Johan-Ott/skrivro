import type { Node } from "prosemirror-model";
import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { manuscriptSchema as schema } from "../src/manuscript/schema";
import { serializeMarkdown } from "../src/manuscript/serializeMarkdown";

const NOTE = { isNote: true };

// The second item of the first block, written again with other words.
function withSecondItem(doc: Node, text: string) {
  const list = doc.child(0);
  const item = schema.node("paragraph", list.child(1).attrs, [schema.text(text)]);
  const changed = list.copy(list.content.replaceChild(1, item));
  return doc.copy(doc.content.replaceChild(0, changed));
}

describe("a list in a note", () => {
  const BULLETS = "- Kaffe\n- Te\n- Mjölk\n";

  it("is saved as it was while it is untouched", () => {
    expect(serializeMarkdown(parseMarkdown(BULLETS, NOTE), NOTE)).toBe(BULLETS);
  });

  it("stays a Markdown list when an item changes, so another editor reads it", () => {
    const changed = withSecondItem(parseMarkdown(BULLETS, NOTE), "Choklad");

    expect(serializeMarkdown(changed, NOTE)).toBe("- Kaffe\n- Choklad\n- Mjölk\n");
  });

  it("stays numbered when an item changes", () => {
    const changed = withSecondItem(parseMarkdown("1. Ett\n2. Två\n3. Tre\n", NOTE), "Fyra");

    expect(serializeMarkdown(changed, NOTE)).toBe("1. Ett\n2. Fyra\n3. Tre\n");
  });

  it("keeps a list made in the editor as a Markdown list too", () => {
    const item = (text: string) => schema.node("paragraph", null, [schema.text(text)]);
    const list = schema.node("styleBlock", { style: "punktlista" }, [item("Ett"), item("Två")]);
    const doc = schema.node("doc", { trailing: "\n" }, [list]);

    expect(serializeMarkdown(doc, NOTE)).toBe("- Ett\n- Två\n");
  });

  it("keeps the fence while an item is still empty", () => {
    const empty = schema.node("paragraph", null, []);
    const first = schema.node("paragraph", null, [schema.text("Ett")]);
    const list = schema.node("styleBlock", { style: "punktlista" }, [first, empty]);
    const doc = schema.node("doc", { trailing: "\n" }, [list]);

    expect(serializeMarkdown(doc, NOTE)).toContain("::: punktlista");
  });
});

describe("a list in a scene", () => {
  it("is written in Skrivro's own form when it changes", () => {
    const changed = withSecondItem(parseMarkdown("- Kaffe\n- Te\n"), "Choklad");

    expect(serializeMarkdown(changed)).toContain("::: punktlista");
  });
});

describe("a list in a note that is not plain", () => {
  it("keeps its first number when an item changes", () => {
    const changed = withSecondItem(parseMarkdown("3. Ett\n4. Två\n5. Tre\n", NOTE), "Fyra");

    expect(serializeMarkdown(changed, NOTE)).toBe("3. Ett\n4. Fyra\n5. Tre\n");
  });

  it("keeps the blank lines between its items when an item changes", () => {
    const changed = withSecondItem(parseMarkdown("- Ett\n\n- Två\n\n- Tre\n", NOTE), "Fyra");

    expect(serializeMarkdown(changed, NOTE)).toBe("- Ett\n\n- Fyra\n\n- Tre\n");
  });

  it("is a raw block when an item holds two paragraphs, saved as it was", () => {
    const text = "- Första stycket\n\n  Andra stycket\n- Nästa\n";
    const doc = parseMarkdown(text, NOTE);

    expect(doc.child(0).type.name).toBe("rawBlock");
    expect(serializeMarkdown(doc, NOTE)).toBe(text);
  });

  it("stays as it was when the text around it changes", () => {
    const list = "- Första stycket\n\n  Andra stycket\n- Nästa\n";
    const doc = parseMarkdown(`Intro\n\n${list}`, NOTE);
    const intro = schema.node("paragraph", doc.child(0).attrs, [schema.text("Ny intro")]);
    const changed = doc.copy(doc.content.replaceChild(0, intro));

    expect(serializeMarkdown(changed, NOTE)).toBe(`Ny intro\n\n${list}`);
  });

  it("is a raw block when an item is a checkbox, which a plain item cannot hold", () => {
    const text = "- [ ] Köp mjölk\n- [x] Köp bröd\n";

    expect(parseMarkdown(text, NOTE).child(0).type.name).toBe("rawBlock");
    expect(serializeMarkdown(parseMarkdown(text, NOTE), NOTE)).toBe(text);
  });
});

describe("a list in a note whose item looks like Markdown", () => {
  const listOf = (...texts: string[]) =>
    schema.node("doc", { trailing: "\n" }, [
      schema.node(
        "styleBlock",
        { style: "punktlista" },
        texts.map((text) => schema.node("paragraph", null, [schema.text(text)])),
      ),
    ]);

  it.each(["# Rubrik", "1. Ett", "- Kaffe"])(
    "is read back as the same list for an item %s",
    (text) => {
      const written = serializeMarkdown(listOf("Vanlig", text), NOTE);

      const back = parseMarkdown(written, NOTE);

      expect(back.childCount).toBe(1);
      expect(back.child(0).type.name).toBe("styleBlock");
      expect(back.child(0).children.map((item) => item.textContent)).toEqual(["Vanlig", text]);
    },
  );

  it("is still one list of the same items after another item changes, is written and read again", () => {
    const first = parseMarkdown(
      serializeMarkdown(listOf("# Rubrik", "Två", "1. Ett", "- Kaffe"), NOTE),
      NOTE,
    );

    const changed = withSecondItem(first, "Tre");
    const back = parseMarkdown(serializeMarkdown(changed, NOTE), NOTE);

    expect(back.childCount).toBe(1);
    expect(back.child(0).children.map((item) => item.textContent)).toEqual([
      "# Rubrik",
      "Tre",
      "1. Ett",
      "- Kaffe",
    ]);
  });

  it("writes a plain item as Markdown", () => {
    expect(serializeMarkdown(listOf("Kaffe", "Te"), NOTE)).toBe("- Kaffe\n- Te\n");
  });
});

describe("a list written inside a style fence", () => {
  const FENCED = "::: punktlista\n- Mjöl\n- Ägg\n:::\n";

  it("opens as that style with the list's items, and is saved as it was", () => {
    const doc = parseMarkdown(FENCED, NOTE);

    expect(doc.child(0).attrs["style"]).toBe("punktlista");
    expect(doc.child(0).childCount).toBe(2);
    expect(serializeMarkdown(doc, NOTE)).toBe(FENCED);
  });

  it("keeps a list in a fence of another style as it was, also when an item is changed", () => {
    const text = "::: citat\n- ett\n- två\n:::\n";
    const doc = parseMarkdown(text, NOTE);

    expect(doc.child(0).type.name).toBe("rawBlock");
    expect(serializeMarkdown(doc, NOTE)).toBe(text);
  });

  it("keeps a fence in a fence, with a list innermost, as it was", () => {
    const text = "::: citat\n::: punktlista\n- ett\n:::\n:::\n";

    expect(serializeMarkdown(parseMarkdown(text, NOTE), NOTE)).toBe(text);
  });

  it("keeps the fence and the dashes when an item changes", () => {
    const changed = withSecondItem(parseMarkdown(FENCED, NOTE), "Ägggula");

    expect(serializeMarkdown(changed, NOTE)).toBe("::: punktlista\n- Mjöl\n- Ägggula\n:::\n");
    expect(serializeMarkdown(changed)).toBe("::: punktlista\n- Mjöl\n- Ägggula\n:::\n");
  });

  it("keeps any other block inside a fence as it was, so the file still opens", () => {
    const text = "::: citat\n# Rubrik\n\nBrödtext\n:::\n";

    expect(serializeMarkdown(parseMarkdown(text, NOTE), NOTE)).toBe(text);
  });
});

describe("a fence in a fence", () => {
  it("is saved as it was, with no blank line before the outer close", () => {
    const text = "Före.\n\n::: citat\n::: citat\nInne\n:::\n:::\n\nEfter.\n";

    expect(serializeMarkdown(parseMarkdown(text))).toBe(text);
  });

  it("is saved as it was around a list fence", () => {
    const text = "::: citat\n::: punktlista\n- ett\n:::\n:::\n";

    expect(serializeMarkdown(parseMarkdown(text))).toBe(text);
  });
});
