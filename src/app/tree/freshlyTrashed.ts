import { STICKY_ID } from "../../project/sorts.js";
import type { TreeNode } from "../../project/tree.js";

/** What has come into Papperskorg since `known`. A lapp thrown from over the text is left out: it
 * has its own Ångra there, and one is enough. */
export const freshlyTrashed = (known: Set<string>, inTrash: TreeNode[]) =>
  inTrash.find((node) => !known.has(node.id) && node.trashedFrom !== STICKY_ID);
