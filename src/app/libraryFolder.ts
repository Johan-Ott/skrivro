import { platform } from "./platform.js";

/** The writer's chosen folder, or Skrivro in Documents; Penna there is where the books lived before. */
export async function libraryOf(libraryDir: string | null) {
  if (libraryDir) return libraryDir;
  const { documents } = await platform.knownFolders();
  const before = `${documents}/Penna`;
  return (await platform.fileSystem.modifiedAt(before)) === null ? `${documents}/Skrivro` : before;
}
