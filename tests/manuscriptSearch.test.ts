import { SearchQuery } from "prosemirror-search";
import { describe, expect, it } from "vitest";
import {
  countMatches,
  nextSceneWith,
  replaceAllInText,
  searchableScene,
} from "../src/editor/manuscriptSearch";

const scene = (body: string) => `---\nid: 01J9Z4K2QX\ntitle: Köket\n---\n${body}`;

describe("countMatches", () => {
  it("counts the same way as the search in the open scene", () => {
    const state = searchableScene(
      scene("Sjöbergh kom. *Sjöbergh* gick.\n\nSjöberghs båt låg kvar.\n"),
    );

    const counts = [
      countMatches(state, new SearchQuery({ search: "Sjöbergh" })),
      countMatches(state, new SearchQuery({ search: "Sjöbergh", wholeWord: true })),
      countMatches(state, new SearchQuery({ search: "sjöbergh", caseSensitive: true })),
    ];

    expect(counts).toEqual([3, 2, 0]);
  });

  it("finds nothing for an empty search", () => {
    const state = searchableScene(scene("Text.\n"));

    const count = countMatches(state, new SearchQuery({ search: "" }));

    expect(count).toBe(0);
  });
});

describe("replaceAllInText", () => {
  it("replaces in the body and keeps the front matter and untouched blocks byte for byte", () => {
    const text = scene("Sjöbergh kom.\n\nEn rad  med två mellanslag.\n\n*Sjöbergh* gick.\n");

    const result = replaceAllInText(
      text,
      new SearchQuery({ search: "Sjöbergh", replace: "Sjöberg" }),
    );

    expect(result.count).toBe(2);
    expect(result.text).toBe(
      scene("Sjöberg kom.\n\nEn rad  med två mellanslag.\n\n*Sjöberg* gick.\n"),
    );
  });

  it("leaves a scene without matches exactly as it was", () => {
    const text = scene("Inget att byta.\n");

    const result = replaceAllInText(text, new SearchQuery({ search: "Sjöbergh", replace: "x" }));

    expect(result).toEqual({ text, count: 0 });
  });
});

describe("nextSceneWith", () => {
  const ids = ["a", "b", "c", "d"];
  const withMatch = new Set(["a", "c"]);
  const hasMatch = (id: string) => withMatch.has(id);

  it("goes forward and backward, round the end", () => {
    const found = [
      nextSceneWith(ids, "a", false, hasMatch),
      nextSceneWith(ids, "c", false, hasMatch),
      nextSceneWith(ids, "a", true, hasMatch),
      nextSceneWith(ids, null, false, hasMatch),
    ];

    expect(found).toEqual(["c", "a", "c", "a"]);
  });

  it("comes back to the scene itself when only it has matches, and null when none has", () => {
    const found = [
      nextSceneWith(ids, "c", false, (id) => id === "c"),
      nextSceneWith(ids, "b", false, () => false),
    ];

    expect(found).toEqual(["c", null]);
  });
});
