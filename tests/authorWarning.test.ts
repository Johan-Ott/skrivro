import { describe, expect, it } from "vitest";
import { authorWarning } from "../src/app/exporting/ExportPanels";

const book = { title: "Exportprov", subtitle: "", author: "", words: 120 };

describe("the export panel before a standard manuscript", () => {
  it("says to fill in the writer when the book has none, before anything is made", () => {
    expect(authorWarning(book, "manus")).toBe("Författarnamnet saknas.");
  });

  it("says nothing when there is a writer, or for any other format than the manuscript", () => {
    expect(authorWarning({ ...book, author: "Elin Berg" }, "manus")).toBeNull();
    for (const format of ["text", "ebok", "tryck"] as const) {
      expect(authorWarning(book, format)).toBeNull();
    }
  });
});
