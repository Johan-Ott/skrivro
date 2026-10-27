import { describe, expect, it } from "vitest";
import { freshlyTrashed } from "../src/app/tree/freshlyTrashed";
import type { TreeNode } from "../src/project/tree";

const scene = (id: string, trashedFrom?: string): TreeNode =>
  trashedFrom ? { id, kind: "scene", trashedFrom } : { id, kind: "scene" };

describe("freshlyTrashed", () => {
  it("finds what has come into Papperskorg since last time", () => {
    const found = freshlyTrashed(new Set(["gammal"]), [scene("gammal"), scene("ny", "k1")]);

    expect(found?.id).toBe("ny");
  });

  it("leaves out a lapp, which has its own Ångra over the text", () => {
    expect(freshlyTrashed(new Set(), [scene("lapp", "lappar")])).toBeUndefined();
  });
});
