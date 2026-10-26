// Node in tests, Tauri in the app, memory in a browser.
export interface FileSystem {
  readText(path: string): Promise<string>;
  writeText(path: string, text: string): Promise<void>;
  readBytes(path: string): Promise<Uint8Array>;
  writeBytes(path: string, bytes: Uint8Array): Promise<void>;
  /** Replaces `to` if it exists. */
  rename(from: string, to: string): Promise<void>;
  /** File names in `dir`, or an empty list when the folder is missing. */
  list(dir: string): Promise<string[]>;
  /** Milliseconds since 1970, or null when the file is missing. */
  modifiedAt(path: string): Promise<number | null>;
  makeDir(dir: string): Promise<void>;
  /** Each file in `dir` with modifiedAt's time, in one call where one per file is slow. */
  listTimes?(dir: string): Promise<Record<string, number>>;
  /** Many files' text in one call; null for one that cannot be read. */
  readTexts?(paths: string[]): Promise<(string | null)[]>;
  /** Writes many new files, with their folders, in one call. */
  writeTexts?(files: [string, string][]): Promise<void>;
}

/** Each file's text, null where it cannot be read, by readTexts or else one call per file. */
export const readAll = (fileSystem: FileSystem, paths: string[]) =>
  fileSystem.readTexts && paths.length > 1
    ? fileSystem.readTexts(paths)
    : Promise.all(paths.map((path) => fileSystem.readText(path).catch(() => null)));

/** Writes new files, by writeTexts or else one call per file. */
export const writeAll = (fileSystem: FileSystem, files: [string, string][]) =>
  fileSystem.writeTexts
    ? fileSystem.writeTexts(files)
    : Promise.all(files.map(([path, text]) => fileSystem.writeText(path, text))).then(() => {});

/** The files in `dir` with their times, by listTimes or else one call per file. */
export async function timesIn(fileSystem: FileSystem, dir: string) {
  if (fileSystem.listTimes) return fileSystem.listTimes(dir);
  const names = await fileSystem.list(dir);
  const times = await Promise.all(names.map((name) => fileSystem.modifiedAt(joinPath(dir, name))));
  return Object.fromEntries(
    names.flatMap((name, index) => (times[index] === null ? [] : [[name, times[index]]])),
  ) as Record<string, number>;
}

/** Keeps text writes, and renames of them, and writes them all in one call at flush: for files
 * made in a folder of their own, which need no temp file each, where many calls are slow. */
export function collectingWrites(fileSystem: FileSystem) {
  const pending = new Map<string, string>();
  const collecting: FileSystem = {
    ...fileSystem,
    writeText: async (path, text) => void pending.set(path, text),
    readText: async (path) => pending.get(path) ?? fileSystem.readText(path),
    rename: async (from, to) => {
      const text = pending.get(from);
      if (text === undefined) return fileSystem.rename(from, to);
      pending.delete(from);
      pending.set(to, text);
    },
  };
  return { collecting, flush: () => writeAll(fileSystem, [...pending]) };
}

// Forward slashes work on Windows in both Node and Tauri.
export function joinPath(dir: string, name: string): string {
  return `${dir}/${name}`;
}

/** Null only when the file is missing; a file that is there but cannot be read throws. */
export async function readIfThere(fileSystem: FileSystem, path: string) {
  try {
    return await fileSystem.readText(path);
  } catch (error) {
    if ((await fileSystem.modifiedAt(path).catch(() => null)) === null) return null;
    throw error;
  }
}
