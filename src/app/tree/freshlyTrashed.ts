import type { TreeNode } from "../../project/tree.js";

/** What has come into Papperskorg since `known`. */
export const freshlyTrashed = (known: Set<string>, inTrash: TreeNode[]) =>
  inTrash.find((node) => !known.has(node.id));
