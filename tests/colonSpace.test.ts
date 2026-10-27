import { describe, expect, it } from "vitest";
import { spaceAfterColon } from "../src/manuscript/colonSpace";

describe("spaceAfterColon", () => {
  it("puts a space between a label and the answer that follows it", () => {
    expect(spaceAfterColon("Första gången:Mässingskikare med spricka")).toBe(
      "Första gången: Mässingskikare med spricka",
    );
  });

  it("leaves a colon that already has a space, or stands in a time or an address, as it is", () => {
    const text = "Vid 12:30 på https://skrivro.se: klart.";

    expect(spaceAfterColon(text)).toBe(text);
  });
});

describe("spaceAfterColon in a novel's ordinary text", () => {
  it.each(["1:a juli", "2:a kapitlet", "3:e gången", "S:t Eriks kyrka", "S:t Göran"])(
    "leaves %s as it is",
    (text) => {
      expect(spaceAfterColon(text)).toBe(text);
    },
  );
});
