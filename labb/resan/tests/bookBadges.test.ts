import { describe, expect, it } from "vitest";
import { bookBadgesHeld, reachedBookBadges, type Book } from "../src/project/bookBadges";
import type { SceneSummary } from "../src/project/sceneSummaries";
import { withSpecialFolders, type TreeNode } from "../src/project/tree";

const summary = (status: SceneSummary["status"], words: number) =>
  ({ title: "", words, status }) as SceneSummary;

const tree: TreeNode[] = withSpecialFolders([
  {
    id: "del",
    kind: "part",
    title: "Vintern",
    children: [
      { id: "k1", kind: "chapter", title: "Ett", children: [{ id: "scen1", kind: "scene" }] },
      { id: "k2", kind: "chapter", title: "Två", children: [{ id: "scen2", kind: "scene" }] },
    ],
  },
]);

const book = (fields: Record<string, unknown>): Book => ({
  tree,
  summaries: { scen1: summary("klar", 30_000), scen2: summary("utkast", 1000) },
  fields,
});

describe("book badges", () => {
  it("are reached by what the book holds: a done chapter, a part, its length and its goal", () => {
    const ids = reachedBookBadges(book({ totalGoal: 60_000 }), {}).map((badge) => badge.id);

    expect(ids).toEqual(["forsta-kapitlet", "forsta-delen", "halvvags", "hundra-sidor"]);
  });

  it("are not reached twice, and a book never counted has none held", () => {
    expect(reachedBookBadges(book({}), { "forsta-kapitlet": "2026-10-09" })[0]?.id).toBe(
      "forsta-delen",
    );
    expect(bookBadgesHeld({})).toBeNull();
    expect(bookBadgesHeld({ badges: { halvvags: "2026-10-09", x: 3 } })).toEqual({
      halvvags: "2026-10-09",
    });
  });
});
