import type { TreeNode } from "./tree.js";

/** The node's own fields, such as its title, goal or summary; not its id, kind or children. */
export type NodeFields = {
  [Key in Exclude<keyof TreeNode, "id" | "kind" | "children">]?: TreeNode[Key] | undefined;
};

const withFields = (node: TreeNode, fields: NodeFields) =>
  Object.fromEntries(
    Object.entries({ ...node, ...fields }).filter(([, value]) => value !== undefined),
  ) as unknown as TreeNode;

/** The one way to change a node's fields. An undefined field is removed from the node. */
export function withNodeFields(tree: TreeNode[], id: string, fields: NodeFields): TreeNode[] {
  return tree.map((node) => {
    if (node.id === id) return withFields(node, fields);
    return node.children ? { ...node, children: withNodeFields(node.children, id, fields) } : node;
  });
}

export const renameNode = (tree: TreeNode[], id: string, title: string) =>
  withNodeFields(tree, id, { title });
