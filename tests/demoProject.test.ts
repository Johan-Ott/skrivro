import { describe, expect, it } from "vitest";
import { DEMO_PROJECT_DIR, DEMO_PROJECT_FILES } from "../src/demo/demoProject";
import { sceneIdsIn, type TreeNode } from "../src/project/tree";

const tree = (
  JSON.parse(DEMO_PROJECT_FILES[`${DEMO_PROJECT_DIR}/project.json`] ?? "{}") as {
    tree: TreeNode[];
  }
).tree;

describe("the example book", () => {
  it("has only scene and note ids a book can read, so none shows as Hittas inte", () => {
    const ids = tree.flatMap((node) => sceneIdsIn([node], node.id));

    expect(ids.filter((id) => !/^[0-9A-HJKMNP-TV-Z]{26}$/.test(id))).toEqual([]);
  });
});
