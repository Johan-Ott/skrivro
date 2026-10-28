import { describe, expect, it } from "vitest";
import { colophon } from "../src/project/colophon";

describe("colophon", () => {
  it("tells when the book was written, its longest day and its longest run", () => {
    const stats = { "2026-10-01": 300, "2026-10-02": 900, "2026-10-03": 200, "2026-10-08": 50 };
    expect(colophon("Vintervägen", stats, 1450, "2026-10-09")).toEqual([
      "Vintervägen har skrivits sedan den 1 oktober, på 4 dagar av 9.",
      "Den har 1 450 ord. Den längsta dagen gav 900 av dem, en fredag i oktober.",
      "Som mest skrevs den 3 dagar i rad.",
    ]);
  });

  it("says nothing before the first day of writing", () => {
    expect(colophon("Vintervägen", {}, 0, "2026-10-09")).toEqual([]);
  });
});
