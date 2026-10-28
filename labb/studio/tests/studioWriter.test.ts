import { describe, expect, it } from "vitest";
import { FRAME_RINGS } from "../src/app/studio/studioSignature";
import { writerFacts } from "../src/app/studio/studioWriter";
import { flairs } from "../src/project/flair";
import { NO_JOURNEY } from "../src/project/journey";

describe("the writer's card", () => {
  it("draws every frame a writer can unlock", () => {
    const frames = flairs().filter((flair) => flair.kind === "ram");

    const missing = frames.filter((frame) => !FRAME_RINGS[frame.id]);

    expect(missing).toEqual([]);
  });

  it("shows the level, the words, the longest run and the badges", () => {
    const journey = {
      ...NO_JOURNEY,
      words: { "2026-10-12": 600, "2026-10-13": 900 },
      badges: { "forsta-orden": "2026-10-12", "en-sida": "2026-10-12" },
    };

    const facts = writerFacts(journey, "2026-10-13");

    expect(facts.map(([, label]) => label)).toEqual([
      "nivå",
      "ord",
      "dagar i rad, rekord",
      "märken",
    ]);
    expect(facts[1]?.[0]).toMatch(/1\s500/);
    expect(facts[2]?.[0]).toBe("2");
    expect(facts[3]?.[0]).toBe("2");
  });
});
