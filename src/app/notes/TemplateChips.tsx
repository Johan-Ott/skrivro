import { createStore } from "@llkit/store.js";
import { useEffect } from "react";
import {
  readNoteTemplates,
  saveNoteTemplate,
  type OwnNoteTemplate,
} from "../../project/ownNoteTemplates.js";
import { noteTemplates, type NoteTemplate } from "../../project/packs.js";
import { splitSceneFile } from "../../manuscript/sceneFile.js";
import { sortKey } from "../../project/sorts.js";
import { findNode } from "../../project/tree.js";
import { scenePath } from "../../storage/sceneId.js";
import { libraryOf } from "../libraryFolder.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";
import { templateSaved } from "./TemplateSavedToast.js";

// The templates a new note can start from: the book's packs' and the writer's own.

type Form = {
  sortId: string;
  newSort: string | null;
  template: NoteTemplate | null;
  setTemplate: (template: NoteTemplate | null) => void;
};

const own = createStore<OwnNoteTemplate[]>([]);

// Without a chosen Skrivro folder, the one in Dokument, as the book templates use.
const loadOwn = async (libraryDir: string | null) =>
  own.set(
    await readNoteTemplates(platform.fileSystem, await libraryOf(libraryDir)).catch(() => []),
  );

/** Spara som mall: the note's text, under its name, for new notes in its sort in every book. */
export async function saveNoteAsTemplate(project: Project, libraryDir: string | null, id: string) {
  const parent = findNode(project.tree, id)?.parent;
  if (parent?.kind !== "sort") return;
  const text = await platform.fileSystem.readText(scenePath(project.dir, id));
  const name = project.summaries[id]?.title ?? t("Mall");
  const template = { name, sort: sortKey(parent), body: splitSceneFile(text).body };
  await saveNoteTemplate(platform.fileSystem, await libraryOf(libraryDir), template);
  await loadOwn(libraryDir);
  templateSaved.set(name);
}

function templatesFor(project: Project, form: Form, mine: OwnNoteTemplate[]) {
  const sort = form.newSort === null ? findNode(project.tree, form.sortId)?.node : undefined;
  if (!sort) return [];
  const key = sortKey(sort);
  return [...noteTemplates(project.fields, key), ...mine.filter((each) => each.sort === key)];
}

/** The chip for no pick wears the sort's standard's name, as that is what the note starts as. */
export function chipsOf(templates: NoteTemplate[]) {
  const standard = templates.find((template) => template.isStandard);
  const others = templates.filter((template) => !template.isStandard);
  return { plain: standard?.name ?? t("Enkel"), others };
}

/** The templates for the chosen sort, or nothing when it has none. */
export function TemplateChips(props: { form: Form; project: Project; libraryDir: string | null }) {
  const { form } = props;
  useEffect(() => void loadOwn(props.libraryDir), [props.libraryDir]);
  const { plain, others } = chipsOf(templatesFor(props.project, form, own.use()));
  if (others.length === 0) return null;
  const chip = (label: string, template: NoteTemplate | null) => (
    <button
      key={label}
      type="button"
      role="radio"
      aria-checked={form.template?.name === template?.name}
      className="chip"
      onClick={() => form.setTemplate(template)}
    >
      {label}
    </button>
  );
  return (
    <div className="field">
      <span className="field-label">{t("Mall")}</span>
      <div className="note-sorts" role="radiogroup" aria-label={t("Mall")}>
        {chip(plain, null)}
        {others.map((template) => chip(template.name, template))}
      </div>
    </div>
  );
}
