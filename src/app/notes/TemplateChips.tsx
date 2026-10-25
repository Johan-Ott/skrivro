import { noteTemplates, type NoteTemplate } from "../../project/packs.js";
import { CHARACTERS_ID, findNode } from "../../project/tree.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

type Form = {
  sortId: string;
  newSort: string | null;
  template: NoteTemplate | null;
  setTemplate: (template: NoteTemplate | null) => void;
};

// Personer is known by its id, a sort of the writer's or a pack's by its name.
const sortKey = (project: Project, sortId: string) =>
  sortId === CHARACTERS_ID ? sortId : (findNode(project.tree, sortId)?.node.title ?? "");

/** The book's packs' templates for the chosen sort, or nothing when it has none. */
export function TemplateChips({ form, project }: { form: Form; project: Project }) {
  const templates =
    form.newSort === null ? noteTemplates(project.fields, sortKey(project, form.sortId)) : [];
  if (templates.length === 0) return null;
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
        {chip(t("Enkel"), null)}
        {templates.map((template) => chip(template.name, template))}
      </div>
    </div>
  );
}
