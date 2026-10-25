import { newSceneText, withField } from "../manuscript/sceneFile.js";
import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { type FileSystem } from "@llkit/storage/fileSystem.js";
import { newSceneId, scenePath } from "../storage/sceneId.js";
import { t } from "../i18n/i18n.js";
import type { BookTemplate } from "./templates.js";

// Every new book starts with a welcome: a note under Övrigt, never part of the book, that says
// where to begin and goes when the writer removes it. project.json keeps its id as `welcome`.

const text = () =>
  [
    t(
      "Det här är en anteckning, inte en del av boken. Den syns inte när du läser eller exporterar.",
    ),
    t(
      "**Börja skriva.** Lägg till ett kapitel och en scen med + Lägg till i trädet, på telefonen under Boken.",
    ),
    t(
      "**Anteckningar.** Personer, platser och saker lägger du till med + Ny anteckning. Deras namn blir länkar i texten.",
    ),
    t(
      "**Hjälp på vägen.** Exempelboken på bokhyllan visar allt Skrivro kan, med exempel. Hjälp finns under Inställningar.",
    ),
    t("När du inte behöver den här längre tar du bort den längst ner."),
  ].join("\n\n");

export async function writeNote(fileSystem: FileSystem, dir: string, title: string, body: string) {
  const id = newSceneId();
  const head = withField(newSceneText(id, title), "link", "false");
  await writeAtomic(fileSystem, scenePath(dir, id), `${head}\n${body}\n`);
  return id;
}

/** Writes the welcome note and gives its id. */
export const writeWelcome = (fileSystem: FileSystem, dir: string) =>
  writeNote(fileSystem, dir, t("Välkommen"), text());

// The manuscript keeps a bullet list as Skrivro's punktlista style, each item a paragraph.
export const asList = (block: string) =>
  `::: punktlista\n${block
    .split("\n")
    .map((line) => line.replace(/^- /, ""))
    .join("\n\n")}\n:::`;

export const blocksOf = (text: string) => text.split(/\n\s*\n/);

/** A note's Markdown, with "- " lists, as a scene's text. */
export const asManuscript = (body: string) =>
  blocksOf(body)
    .map((block) => (block.startsWith("- ") ? asList(block) : block))
    .join("\n\n");

const partText = (part: BookTemplate["parts"][number]) =>
  [
    part.title && `**${part.title}**`,
    asList(part.chapters.map(([title = "", what = ""]) => `- ${title}: ${what}`).join("\n")),
  ]
    .filter(Boolean)
    .join("\n\n");

/** The structure's steps as a note, for a writer who finds the story while writing it. */
export const writeStepsNote = (fileSystem: FileSystem, dir: string, template: BookTemplate) =>
  writeNote(
    fileSystem,
    dir,
    t("Strukturen"),
    [
      t("{name}, att stämma av mot när du har skrivit en bit.", { name: template.name }),
      ...template.parts.map(partText),
    ].join("\n\n"),
  );
