import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { joinPath, readIfThere, type FileSystem } from "@llkit/storage/fileSystem.js";
import { HEADING_FIELDS, rebuildTree, type NodeKind, type TreeNode } from "./tree.js";

export interface ProjectFile {
  fields: Record<string, unknown>;
  tree: TreeNode[];
  /** Null when project.json could be read. */
  repairCopy: string | null;
  /** Opened read-only, so this version never writes over it. */
  isNewerFormat: boolean;
}

// The project.json format this Skrivro writes. A newer format needs a migration step per version.
const FORMAT_VERSION = 1;

const KINDS: NodeKind[] = ["part", "chapter", "scene", "folder", "sort"];

const isOptionalString = (value: unknown) => value === undefined || typeof value === "string";
const isOptionalNodeList = (value: unknown): boolean =>
  value === undefined || (Array.isArray(value) && value.every(isTreeNode));

const isTextRecord = (value: unknown) =>
  typeof value === "object" &&
  value !== null &&
  Object.values(value).every((text) => typeof text === "string");

// Pictures by area, and label ids as a list.
const isOptionalTextRecord = (value: unknown) => value === undefined || isTextRecord(value);

// The node's own values, not its children's.
function isNodeItself(node: Record<string, unknown>) {
  const hasIdAndKind = typeof node["id"] === "string" && KINDS.includes(node["kind"] as NodeKind);
  const texts = [
    "title",
    "summary",
    "when",
    "pov",
    "opening",
    "reveal",
    "addedIn",
    ...HEADING_FIELDS,
  ].every((key) => isOptionalString(node[key]));
  const records = ["pictures", "labels", "knownBy"].every((key) => isOptionalTextRecord(node[key]));
  return hasIdAndKind && texts && records;
}

function isTreeNode(value: unknown): value is TreeNode {
  if (typeof value !== "object" || value === null) return false;
  const node = value as Record<string, unknown>;
  return isNodeItself(node) && isOptionalNodeList(node["children"]);
}

const asRecord = (value: unknown) =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

/** Every node that can be read is kept; a broken one gives way to its children. */
export function salvageTree(nodes: unknown[]): TreeNode[] {
  return nodes.flatMap((value): TreeNode[] => {
    const node = asRecord(value);
    if (!node) return [];
    const children = Array.isArray(node["children"]) ? salvageTree(node["children"]) : undefined;
    if (!isNodeItself(node)) return children ?? [];
    return [{ ...(node as unknown as TreeNode), ...(children ? { children } : {}) }];
  });
}

function parseProject(text: string): { fields: Record<string, unknown>; tree: unknown[] } | null {
  try {
    const parsed = asRecord(JSON.parse(text));
    if (!parsed) return null;
    const { tree, ...fields } = parsed;
    return Array.isArray(tree) ? { fields, tree } : null;
  } catch {
    return null;
  }
}

const projectPath = (dir: string) => joinPath(dir, "project.json");

export async function writeProjectFile(
  fileSystem: FileSystem,
  dir: string,
  fields: Record<string, unknown>,
  tree: TreeNode[],
) {
  await writeAtomic(
    fileSystem,
    projectPath(dir),
    `${JSON.stringify({ ...fields, formatVersion: FORMAT_VERSION, tree }, null, 2)}\n`,
  );
}

/** project.json could not be read and was left as it is, as a half-written file may be. */
export class UnreadableProject extends Error {}

// To the second, so two repairs never share a copy.
const repairName = () =>
  `project.json.trasig-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}`;

// The broken file is kept as a copy; what could be read of it is written back, the fields kept.
async function repair(fileSystem: FileSystem, dir: string, brokenText: string, read: Read) {
  const repairCopy = repairName();
  await writeAtomic(fileSystem, joinPath(dir, repairCopy), brokenText);
  await writeProjectFile(fileSystem, dir, read.fields, read.tree);
  return { fields: read.fields, tree: read.tree, repairCopy, isNewerFormat: false };
}

type Read = {
  fields: Record<string, unknown>;
  tree: TreeNode[];
  isNewer: boolean;
  isWhole: boolean;
};

// What can be read of the text: the valid nodes, or a tree from the scene files.
function readText(text: string, sceneIds: string[]): Read {
  const parsed = parseProject(text);
  const { formatVersion, ...fields } = parsed?.fields ?? {};
  return {
    fields,
    tree: parsed ? salvageTree(parsed.tree) : rebuildTree(sceneIds),
    isNewer: typeof formatVersion === "number" && formatVersion > FORMAT_VERSION,
    isWhole: parsed !== null && parsed.tree.every(isTreeNode),
  };
}

/**
 * A newer format opens read-only, as it is. A broken file is repaired only when `mayRepair`:
 * the folder watch may see a file another program is still writing, and only retries.
 */
export async function readProjectFile(
  fileSystem: FileSystem,
  dir: string,
  sceneIds: string[],
  mayRepair = true,
): Promise<ProjectFile> {
  const text = await readIfThere(fileSystem, projectPath(dir));
  if (text === null) {
    return { fields: {}, tree: rebuildTree(sceneIds), repairCopy: null, isNewerFormat: false };
  }
  const read = readText(text, sceneIds);
  if (read.isNewer || read.isWhole) {
    return { fields: read.fields, tree: read.tree, repairCopy: null, isNewerFormat: read.isNewer };
  }
  if (!mayRepair) throw new UnreadableProject(projectPath(dir));
  return repair(fileSystem, dir, text, read);
}

/** A book's new title, written into project.json with everything else in it left as it was. */
/** Changes fields of a book that is not open, such as its title from the shelf. */
export async function changeBookFile(
  fileSystem: FileSystem,
  dir: string,
  change: Record<string, unknown>,
) {
  const text = await readIfThere(fileSystem, projectPath(dir));
  if (text === null) throw new Error(`${projectPath(dir)} finns inte`);
  const project = JSON.parse(text) as Record<string, unknown>;
  await writeAtomic(
    fileSystem,
    projectPath(dir),
    `${JSON.stringify({ ...project, ...change }, null, 2)}\n`,
  );
}

export const retitleBook = (fileSystem: FileSystem, dir: string, title: string) =>
  changeBookFile(fileSystem, dir, { title });
