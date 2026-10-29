import { describe, expect, it } from "vitest";
import {
  cardsOf,
  chapterRuns,
  countMentions,
  everyName,
  mentionPattern,
  namesOf,
  notesOf,
} from "../src/project/cards";
import type { SceneSummary } from "../src/project/sceneSummaries";
import {
  CHARACTERS_ID,
  NOTES_ID,
  PLACES_ID,
  withSpecialFolders,
  type TreeNode,
} from "../src/project/tree";

const tree: TreeNode[] = withSpecialFolders([
  { id: "kap1", kind: "chapter", title: "Brevet", children: [{ id: "koket", kind: "scene" }] },
  {
    id: CHARACTERS_ID,
    kind: "folder",
    children: [
      { id: "arvid", kind: "scene" },
      {
        id: "familjen",
        kind: "folder",
        title: "Familjen",
        children: [{ id: "elin", kind: "scene" }],
      },
    ],
  },
  { id: PLACES_ID, kind: "sort", children: [{ id: "udden", kind: "scene" }] },
  {
    id: NOTES_ID,
    kind: "sort",
    children: [
      { id: "slutet", kind: "scene" },
      { id: "brevet", kind: "scene" },
    ],
  },
]);
const summary = (title: string, link?: boolean) => ({
  title,
  words: 10,
  status: "idé" as const,
  ...(link === undefined ? {} : { link }),
});
const summaries = {
  koket: summary("Köket"),
  arvid: summary("Arvid"),
  elin: summary("Elin Berg"),
  udden: summary("Udden", false),
  slutet: summary("Idéer om slutet"),
  brevet: summary("Brevet", true),
};

describe("cardsOf", () => {
  it("links every note's name in the text, but Övrigt only when the note asks", () => {
    const cards = cardsOf(tree, summaries);

    expect(cards).toEqual([
      { id: "arvid", sortId: CHARACTERS_ID, name: "Arvid" },
      { id: "elin", sortId: CHARACTERS_ID, name: "Elin Berg" },
      { id: "brevet", sortId: NOTES_ID, name: "Brevet" },
    ]);
  });

  it("leaves out a scene whose file is not here yet", () => {
    const cards = cardsOf(tree, { arvid: summary("Arvid") });

    expect(cards.map((card) => card.name)).toEqual(["Arvid"]);
  });
});

describe("countMentions", () => {
  const arvid = { id: "arvid", sortId: CHARACTERS_ID, name: "Arvid" };
  const elin = { id: "elin", sortId: CHARACTERS_ID, name: "Elin" };
  const scenes = {
    koket: "Arvid såg upp. Elin satte sig. Arvids händer skakade.",
    isen: "Elinor var inte Elin.",
    fyren: "Ingen här.",
  };

  it("counts the name as a whole word, with the Swedish genitive s", () => {
    const mentions = countMentions([arvid, elin], scenes);

    expect(mentions.get("arvid")).toMatchObject({ count: 2, sceneIds: ["koket"] });
    expect(mentions.get("elin")).toMatchObject({ count: 2, sceneIds: ["koket", "isen"] });
  });

  it("keeps the first sentence in each scene where the name is said, for Nämns i", () => {
    const mentions = countMentions([arvid, elin], scenes);

    expect(mentions.get("arvid")?.sentences).toEqual({ koket: "Arvid såg upp." });
    expect(mentions.get("elin")?.sentences).toEqual({
      koket: "Elin satte sig.",
      isen: "Elinor var inte Elin.",
    });
  });

  it("finds nothing for an empty name", () => {
    const pattern = mentionPattern("  ");

    expect(pattern).toBeNull();
  });
});

describe("chapterRuns", () => {
  it("writes runs as ranges and the rest as a list", () => {
    const labels = [
      chapterRuns([1, 2, 3, 4, 5, 6, 7, 8]),
      chapterRuns([8, 1, 2, 5, 2]),
      chapterRuns([]),
    ];

    expect(labels).toEqual(["1–8", "1, 2, 5, 8", ""]);
  });
});

describe("the names a note is linked by", () => {
  const erik = {
    id: "erik",
    sortId: CHARACTERS_ID,
    name: "Erik Holm",
    aliases: ["Holm", "Erik", "Eken"],
  };

  it("are its title and its aliases, with the genitive s", () => {
    const text = "Holm teg. Erik log. Eriks hand. Eken log. Erik Holms rygg. Eker.";

    const found = text.match(mentionPattern(namesOf(erik)) ?? /^$/g);

    expect(found).toEqual(["Holm", "Erik", "Eriks", "Eken", "Erik Holms"]);
  });

  it("never include a part of the title that the writer has not listed", () => {
    const doctor = { id: "doktor", sortId: CHARACTERS_ID, name: "Doktor Holm" };

    const found = "Doktor Holm kom. Doktorn sa Holm. En doktor.".match(
      mentionPattern(namesOf(doctor)) ?? /^$/g,
    );

    expect(namesOf(doctor)).toEqual(["Doktor Holm"]);
    expect(found).toEqual(["Doktor Holm"]);
  });

  it("link a person by the full title and its s form only, not by the first or last name alone", () => {
    const plain = { id: "plain", sortId: CHARACTERS_ID, name: "Erik Holm" };
    const text = "Erik Holm kom. Erik Holms hatt. Holm gick. Erik log.";

    const found = text.match(mentionPattern(namesOf(plain)) ?? /^$/g);

    expect(found).toEqual(["Erik Holm", "Erik Holms"]);
  });

  it("are counted as mentions of the one note", () => {
    const mentions = countMentions([erik], { scene: "Holm kom. Erik gick. Han sa inget." });

    expect(mentions.get("erik")?.count).toBe(2);
  });

  it("list every name once for spelling and the name check", () => {
    const place = { id: "udden", sortId: "platser", name: "Holm", aliases: ["Erik"] };

    expect(everyName([erik, place])).toEqual(["Erik Holm", "Holm", "Erik", "Eken"]);
  });
});

describe("notesOf, what Ctrl+K finds", () => {
  it("is every note in every sort, linked or not, files too, but nothing thrown away", () => {
    const book: TreeNode[] = withSpecialFolders([]).map((node) => {
      const children = { anteckningar: ["filen", "tom"], karaktarer: ["elin"] }[
        node.id as "anteckningar" | "karaktarer"
      ];
      if (node.id === "trash") return { ...node, children: [{ id: "slängd", kind: "scene" }] };
      return children ? { ...node, children: children.map((id) => ({ id, kind: "scene" })) } : node;
    });
    const summaries: Record<string, SceneSummary> = {
      filen: { title: "mini", words: 0, status: "idé", file: "mini.pdf" },
      tom: { title: "Tom anteckning", words: 0, status: "idé" },
      elin: { title: "Elin", words: 3, status: "idé" },
      slängd: { title: "Slängd", words: 1, status: "idé" },
    };

    expect(
      notesOf(book, summaries)
        .map((note) => note.id)
        .sort(),
    ).toEqual(["elin", "filen", "tom"]);
    expect(cardsOf(book, summaries).map((card) => card.id)).toEqual(["elin"]);
  });
});
