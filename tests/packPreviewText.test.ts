import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NoteText } from "../src/app/packs/PackPreview";

const render = (body: string) => renderToStaticMarkup(createElement(NoteText, { body }));

describe("a pack note in the preview", () => {
  it("shows bold and italic as such, so a promise's price is not raw underscores", () => {
    const body =
      "**Brottet kommer tidigt.**\n\n_Kommer brottet sent undrar läsaren vad boken handlar om._";

    const html = render(body);

    expect(html).toContain("<strong>Brottet kommer tidigt.</strong>");
    expect(html).toContain("<em>Kommer brottet sent undrar läsaren vad boken handlar om.</em>");
    expect(html).not.toContain("_");
  });

  it("leaves an unfinished bold or italic as it is", () => {
    const html = render("**ofullständig och _oavslutad");

    expect(html).toContain("**ofullständig och _oavslutad");
    expect(html).not.toContain("<strong>");
    expect(html).not.toContain("<em>");
  });

  it("leaves an underscore inside a word alone", () => {
    expect(render("Filen heter ett_namn_här.")).toContain("ett_namn_här");
  });
});
