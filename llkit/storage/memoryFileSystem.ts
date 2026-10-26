import type { FileSystem } from "./fileSystem.js";

type Content = string | Uint8Array;

interface Disk {
  files: Map<string, { content: Content; modifiedAt: number }>;
  folders: Set<string>;
  /** Each write is later than the one before, as on a disk, even within a millisecond. */
  lastTime: number;
}

const missing = (path: string) =>
  Object.assign(new Error(`No such file: ${path}`), { code: "ENOENT" });

function addFolderWithParents(disk: Disk, dir: string) {
  for (let end = dir.length; end > 0; end = dir.lastIndexOf("/", end - 1)) {
    disk.folders.add(dir.slice(0, end));
  }
}

function store(disk: Disk, path: string, content: Content) {
  disk.lastTime = Math.max(Date.now(), disk.lastTime + 1);
  disk.files.set(path, { content, modifiedAt: disk.lastTime });
  addFolderWithParents(disk, path.slice(0, path.lastIndexOf("/")));
}

function childNames(disk: Disk, dir: string): string[] {
  const prefix = `${dir}/`;
  const children = [...disk.files.keys(), ...disk.folders]
    .filter((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes("/"))
    .map((path) => path.slice(prefix.length));
  return [...new Set(children)];
}

// A folder moves with everything in it, as on a disk.
function renameFolder(disk: Disk, from: string, to: string) {
  if (!disk.folders.has(from)) throw missing(from);
  const moved = (path: string) => to + path.slice(from.length);
  const inside = (path: string) => path === from || path.startsWith(`${from}/`);
  for (const [path, file] of [...disk.files].filter(([path]) => inside(path))) {
    disk.files.delete(path);
    store(disk, moved(path), file.content);
  }
  for (const folder of [...disk.folders].filter(inside)) {
    disk.folders.delete(folder);
    addFolderWithParents(disk, moved(folder));
  }
}

function renameFile(disk: Disk, from: string, to: string) {
  const file = disk.files.get(from);
  if (!file) return renameFolder(disk, from, to);
  disk.files.delete(from);
  store(disk, to, file.content);
}

function read(disk: Disk, path: string): Content {
  const file = disk.files.get(path);
  if (!file) throw missing(path);
  return file.content;
}

const asText = (content: Content) =>
  typeof content === "string" ? content : new TextDecoder().decode(content);
const asBytes = (content: Content) =>
  typeof content === "string" ? new TextEncoder().encode(content) : content.slice();

/** Used when Skrivro runs in a plain browser without Tauri. */
export function createMemoryFileSystem(initialFiles: Record<string, string>): FileSystem {
  const disk: Disk = { files: new Map(), folders: new Set(), lastTime: 0 };
  Object.entries(initialFiles).forEach(([path, text]) => store(disk, path, text));
  return {
    readText: async (path) => asText(read(disk, path)),
    writeText: async (path, text) => store(disk, path, text),
    readBytes: async (path) => asBytes(read(disk, path)),
    writeBytes: async (path, bytes) => store(disk, path, bytes.slice()),
    rename: async (from, to) => renameFile(disk, from, to),
    list: async (dir) => childNames(disk, dir),
    modifiedAt: async (path) => disk.files.get(path)?.modifiedAt ?? null,
    listTimes: async (dir) =>
      Object.fromEntries(
        childNames(disk, dir).flatMap((name) => {
          const file = disk.files.get(`${dir}/${name}`);
          return file ? [[name, file.modifiedAt]] : [];
        }),
      ),
    makeDir: async (dir) => addFolderWithParents(disk, dir),
  };
}
