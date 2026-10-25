import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { joinPath, type FileSystem } from "@llkit/storage/fileSystem.js";
import { noteOf, type NoteTemplate } from "./packs.js";

// A note saved as a template: a Markdown file in the Skrivro folder's mallar/anteckningar/, in a
// pack's form, offered in Ny anteckning for its sort in every book.

export type OwnNoteTemplate = NoteTemplate & { sort: string };

const folderOf = (library: string) => joinPath(library, "mallar/anteckningar");
const fileName = (name: string) => `${name.replace(/[\\/:*?"<>|]/g, "").trim() || "Mall"}.md`;

export async function saveNoteTemplate(
  fileSystem: FileSystem,
  library: string,
  template: OwnNoteTemplate,
) {
  await fileSystem.makeDir(folderOf(library));
  const text = `---\nsort: ${template.sort}\n---\n# ${template.name}\n\n${template.body.trim()}\n`;
  await writeAtomic(fileSystem, joinPath(folderOf(library), fileName(template.name)), text);
}

export async function readNoteTemplates(fileSystem: FileSystem, library: string) {
  const names = (await fileSystem.list(folderOf(library))).filter((name) => name.endsWith(".md"));
  const read = async (name: string): Promise<OwnNoteTemplate> => {
    const note = noteOf(await fileSystem.readText(joinPath(folderOf(library), name)));
    return { name: note.title, body: note.body, sort: note.sort };
  };
  return Promise.all(names.map(read));
}
