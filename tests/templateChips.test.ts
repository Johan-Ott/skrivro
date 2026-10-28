import { describe, expect, it } from "vitest";
import { chipsOf } from "../src/app/notes/TemplateChips";

const magic = { name: "Magisystemet", body: "", isStandard: true };
const creature = { name: "Varelsen", body: "" };

describe("the template chips", () => {
  it("name the chip for no pick after the sort's standard, and leave it out of the others", () => {
    expect(chipsOf([creature, magic])).toEqual({ plain: "Magisystemet", others: [creature] });
  });

  it("keep Enkel when the sort has no standard", () => {
    expect(chipsOf([creature]).plain).toBe("Enkel");
  });
});
