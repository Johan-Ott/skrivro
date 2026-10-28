import { MANUSCRIPT_FILES, importManuscript } from "../../import/importManuscript.js";
import {
  copyExampleProject,
  createProject,
  type ProjectDetails,
} from "../../project/newProject.js";
import { structures, suggestedStructure } from "../../project/templates.js";
import { libraryOf as journeyLibrary } from "../libraryFolder.js";
import { platform } from "../platform.js";

// How a book comes to the shelf: made new from a title and its kind, read in from a manuscript,
// or the example. Each lands in the writer's library and is opened by the caller.

/** The writer's library, made if it is not there yet. */
export async function libraryOf(libraryDir: string | null) {
  const dir = await journeyLibrary(libraryDir);
  await platform.fileSystem.makeDir(dir);
  return dir;
}

/** What a new book starts from, before the writer has answered anything. */
export const startDetails = (dailyGoal: number, language = "sv-SE"): ProjectDetails => ({
  title: "",
  type: "roman",
  structure: suggestedStructure("roman", "", []),
  genre: "",
  pieces: [],
  isPlanned: true,
  totalGoal: null,
  dailyGoal,
  deadline: "",
  narration: null,
  language,
});

/** The details with the structure Skrivro suggests for them, and that structure's goal. */
export function withSuggestion(details: ProjectDetails): ProjectDetails {
  const structure = suggestedStructure(details.type, details.genre ?? "", details.pieces);
  return withStructure(details, structure);
}

export const withStructure = (details: ProjectDetails, structure: string): ProjectDetails => ({
  ...details,
  structure,
  totalGoal: structures().find((each) => each.id === structure)?.totalGoal ?? null,
});

export async function newBook(libraryDir: string, details: ProjectDetails) {
  return (await createProject(platform.fileSystem, libraryDir, details)).dir;
}

/** Null when the writer closes the file dialog without choosing. */
export async function importedBook(libraryDir: string, goal: number) {
  const picked = await platform.pickFile(MANUSCRIPT_FILES);
  if (!picked) return null;
  const { title, book } = await importManuscript(platform.fileSystem, picked);
  const made = await createProject(
    platform.fileSystem,
    libraryDir,
    { ...startDetails(goal), title },
    book,
  );
  return made.dir;
}

export const exampleBook = (libraryDir: string) =>
  copyExampleProject(platform.fileSystem, libraryDir);
