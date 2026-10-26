import { describe, expect, it } from "vitest";
import { aliasesOf, withAliases } from "../src/project/aliases";

const FRONT = "---\nid: ERIK\ntitle: Erik Holm\n---\n";

describe("aliases in a note's front matter", () => {
  it("are read with brackets, as other tools write them, or without", () => {
    expect(aliasesOf(`---\naliases: [Broarna, Tredje distriktet]\n---\n`)).toEqual([
      "Broarna",
      "Tredje distriktet",
    ]);
    expect(aliasesOf("---\naliases: Eken, Kommissarien\n---\n")).toEqual(["Eken", "Kommissarien"]);
  });

  it("are read without quotes, and none twice", () => {
    expect(aliasesOf(`---\naliases: ["Eken", 'Eken', Holm]\n---\n`)).toEqual(["Eken", "Holm"]);
    expect(aliasesOf(FRONT)).toEqual([]);
  });

  it("are written with brackets after the other lines, and read back", () => {
    const written = withAliases(FRONT, ["Eken", "Holm"]);

    expect(written).toBe("---\nid: ERIK\ntitle: Erik Holm\naliases: [Eken, Holm]\n---\n");
    expect(aliasesOf(written)).toEqual(["Eken", "Holm"]);
  });

  it("replace the old line, and leave it out when there are none", () => {
    const written = withAliases(FRONT, ["Eken"]);

    expect(withAliases(written, ["Holm"])).toContain("aliases: [Holm]");
    expect(withAliases(written, [])).toBe(FRONT);
  });

  it("never hold a comma, which would split a name", () => {
    expect(aliasesOf(withAliases(FRONT, ["Erik, kallad Eken"]))).toEqual(["Erik kallad Eken"]);
  });
});
