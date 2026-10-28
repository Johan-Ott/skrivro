import { describe, expect, it } from "vitest";
import {
  inGroups,
  inResultGroups,
  searchPalette,
  type PaletteEntry,
} from "../src/app/palette/paletteSearch";

const entry = (label: string, group: PaletteEntry["group"] = "Kommandon"): PaletteEntry => ({
  id: label,
  label,
  group,
  run: () => undefined,
});

const ENTRIES = [
  entry("Köket", "Scener"),
  entry("Isen", "Scener"),
  entry("Ny scen"),
  entry("Fokusläge"),
  entry("Större text"),
  entry("Mörkt tema"),
  entry("Brevet", "Kapitel"),
];

const labels = (query: string) => searchPalette(ENTRIES, query).map((found) => found.label);

describe("searchPalette", () => {
  it("lists the commands when nothing is typed, the most used first", () => {
    expect(labels("")).toEqual(["Ny scen", "Fokusläge", "Större text", "Mörkt tema"]);
    const used = searchPalette(ENTRIES, "", { Isen: 3, Fokusläge: 1 });
    expect(used.map((found) => [found.label, found.group]).slice(0, 2)).toEqual([
      ["Isen", "Mest använda"],
      ["Fokusläge", "Mest använda"],
    ]);
  });

  it("puts the more used first among equally good matches", () => {
    expect(searchPalette(ENTRIES, "te", { "Mörkt tema": 2 })[0]?.label).toBe("Mörkt tema");
  });

  it("finds by the start of a word before a match inside a word", () => {
    expect(labels("te")).toEqual(["Större text", "Mörkt tema"]);
  });

  it("puts a match at the very start first", () => {
    expect(labels("s")[0]).toBe("Större text");
  });

  it("does not care about case or Swedish accents when searching", () => {
    expect(labels("KOKET")).toEqual(["Köket"]);
    expect(labels("fokuslage")).toEqual(["Fokusläge"]);
  });

  it("finds letters in order even with gaps", () => {
    expect(labels("nsc")).toEqual(["Ny scen"]);
  });

  it("finds nothing for letters that are not there", () => {
    expect(labels("xyz")).toEqual([]);
  });
});

describe("searchPalette with short queries", () => {
  it("does not match letters spread over a label when only two are typed", () => {
    expect(labels("is")).toEqual(["Isen"]);
  });
});

describe("inGroups", () => {
  it("shows notes first, then scenes and commands, best first within a group", () => {
    const found = [
      entry("Ny anteckning", "Kommandon"),
      entry("Arvid", "Personer"),
      entry("Köket", "Scener"),
      entry("Udden", "Platser"),
    ];

    const labels = inGroups(found).map((result) => result.label);

    expect(labels).toEqual(["Arvid", "Udden", "Köket", "Ny anteckning"]);
  });
});

describe("a name met in the book", () => {
  it("is not found among commands that only have its letters spread out", () => {
    const entries = [
      entry("Kikaren", "Saker"),
      entry("Skrivraden mitt på skärmen av"),
      entry("Kopiera kontaktinformation"),
    ];

    const found = searchPalette(entries, "Kikaren").map((each) => each.label);

    expect(found).toEqual(["Kikaren"]);
  });
});

describe("the results' groups", () => {
  it("come where their best match is, so a scene named Isen beats a lapp that holds the word", () => {
    const entries = [entry("Vem tände ljusen på isen?", "Lappar"), entry("Isen", "Scener")];

    const found = inResultGroups(searchPalette(entries, "Isen")).map((each) => each.label);

    expect(found).toEqual(["Isen", "Vem tände ljusen på isen?"]);
  });

  it("keep notes before scenes when they match as well", () => {
    const entries = [entry("Elins dröm", "Scener"), entry("Elin", "Personer")];

    const found = inResultGroups(searchPalette(entries, "Elin")).map((each) => each.label);

    expect(found).toEqual(["Elin", "Elins dröm"]);
  });

  it("put a scene before a lapp with the same name", () => {
    const lapp = { ...entry("Isen", "Lappar"), id: "lapp", kind: "lapp" as const };
    const entries = [lapp, entry("Isen", "Scener")];

    const found = inResultGroups(searchPalette(entries, "Isen")).map((each) => each.group);

    expect(found).toEqual(["Scener", "Lappar"]);
  });
});
