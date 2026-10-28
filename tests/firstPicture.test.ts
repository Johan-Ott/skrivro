import { describe, expect, it } from "vitest";
import { firstPictureIn } from "../src/manuscript/pictures";

describe("a note's first picture", () => {
  it("is the first picture from bilder/ in its text", () => {
    const text =
      "Fyren står på udden.\n\n![Fyren i dimma](bilder/fyr-natt.png)\n\n![](bilder/b.jpg)";

    expect(firstPictureIn(text)).toBe("fyr-natt.png");
  });

  it("is none for a picture from elsewhere or a note without one", () => {
    expect(firstPictureIn("![](https://example.com/a.png) och ![](../hemligt.png)")).toBeNull();
    expect(firstPictureIn("Bara ord.")).toBeNull();
  });
});
