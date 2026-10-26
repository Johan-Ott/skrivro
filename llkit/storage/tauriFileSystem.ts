import {
  mkdir,
  readDir,
  readFile,
  readTextFile,
  rename,
  stat,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import type { FileSystem } from "./fileSystem.js";
import { TEMP_SUFFIX } from "./atomicWrite.js";

export const tauriFileSystem: FileSystem = {
  readText: (path) => readTextFile(path),
  // A temp file goes all the way to the disk before writeAtomic renames it over the real file.
  writeText: (path, text) =>
    path.endsWith(TEMP_SUFFIX)
      ? invoke("write_temp_text", { path, text })
      : writeTextFile(path, text),
  readBytes: (path) => readFile(path),
  writeBytes: (path, bytes) => writeFile(path, bytes),
  rename: (from, to) => rename(from, to),
  makeDir: (dir) => mkdir(dir, { recursive: true }),

  // One call each, not a second one to ask whether the file is there: a missing one fails.
  list: (dir) =>
    readDir(dir).then(
      (entries) => entries.map((entry) => entry.name),
      () => [],
    ),

  readTexts: (paths) => invoke("read_texts", { paths }),
  writeTexts: (files) => invoke("write_texts", { files }),

  listTimes: async (dir) =>
    Object.fromEntries(await invoke<[string, number][]>("folder_times", { dir })),

  modifiedAt: (path) =>
    stat(path).then(
      (info) => info.mtime?.getTime() ?? null,
      () => null,
    ),
};
