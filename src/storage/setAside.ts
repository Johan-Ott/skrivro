import { joinPath, type FileSystem } from "@llkit/storage/fileSystem.js";

/** Goes to the project's trash/ folder under a free name, so an older file there is never replaced.
 * Returns the name it got. */
export async function setAside(fileSystem: FileSystem, dir: string, path: string, name: string) {
  const trash = joinPath(dir, "trash");
  await fileSystem.makeDir(trash);
  const taken = await fileSystem.list(trash);
  const dot = name.lastIndexOf(".");
  const [stem, extension] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  let free = name;
  for (let number = 2; taken.includes(free); number++) free = `${stem} (${number})${extension}`;
  await fileSystem.rename(path, joinPath(trash, free));
  return free;
}
