import { describe, expect, it } from "vitest";
import { COVER_LOOKS, coverLookOf, pagesWidth } from "../src/project/shelfLook";

describe("coverLookOf", () => {
  it("gives a book the same look wherever its folder lies and wherever it stands", () => {
    const here = coverLookOf("C:/Users/Elin/Documents/Skrivro/Isen.skrivro");

    const moved = coverLookOf("D:/Böcker/Isen.skrivro");

    expect(moved).toBe(here);
    expect(COVER_LOOKS).toContain(here);
  });

  it("spreads books over the looks", () => {
    const titles = ["Isen", "Vintervägen", "Vardhavn 1", "Fyren", "Stormen", "Brevet"];

    const looks = new Set(titles.map((title) => coverLookOf(`/Skrivro/${title}.skrivro`)));

    expect(looks.size).toBeGreaterThan(1);
  });
});

describe("pagesWidth", () => {
  it("gives a longer book thicker pages, within what still looks like a book", () => {
    const short = pagesWidth(2_000);
    const novel = pagesWidth(90_000);
    const huge = pagesWidth(2_000_000);

    expect(short).toBe(3);
    expect(novel).toBeGreaterThan(short);
    expect(huge).toBe(22);
  });
});
