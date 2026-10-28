import { useState } from "react";
import { withNodeFields } from "../../project/nodeFields.js";
import {
  findNode,
  HEADING_FIELDS,
  type ChapterHeading,
  type TreeNode,
} from "../../project/tree.js";
import { designOf } from "../../export/bookDesign.js";
import { Dialog, DialogButtons } from "@llkit/controls.js";
import {
  ChapterOpeningFields,
  chapterOpeningOf,
  type OpeningChoice,
} from "./ChapterOpeningFields.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

type HeadingForm = Record<keyof ChapterHeading, string>;

const formOf = (node: TreeNode | undefined) =>
  Object.fromEntries(HEADING_FIELDS.map((key) => [key, node?.[key] ?? ""])) as HeadingForm;

// An emptied field is removed from project.json rather than kept as "".
const fieldsOf = (form: HeadingForm): ChapterHeading =>
  Object.fromEntries(HEADING_FIELDS.map((key) => [key, form[key].trim() || undefined]));

function TextField(props: {
  label: string;
  hint?: string;
  value: string;
  isLong?: boolean;
  onChange: (value: string) => void;
}) {
  const Field = props.isLong ? "textarea" : "input";
  return (
    <label className="onboarding-field">
      <span className="field-label">{props.label}</span>
      <Field
        value={props.value}
        rows={3}
        onChange={(event) => props.onChange(event.target.value)}
      />
      {props.hint && <span className="setting-hint">{props.hint}</span>}
    </label>
  );
}

const TEXT_FIELDS: { key: keyof HeadingForm; label: string; hint?: string; isLong?: boolean }[] = [
  {
    key: "subtitle",
    label: t("Undertitel"),
    hint: t("Under titeln, till exempel vems perspektiv kapitlet har, eller plats och tid."),
  },
  { key: "epigraph", label: t("Citat före texten"), isLong: true },
  { key: "epigraphBy", label: t("Citatets källa") },
];

function HeadingFields(props: { form: HeadingForm; onChange: (form: HeadingForm) => void }) {
  const { form } = props;
  const field = (key: keyof HeadingForm) => (value: string) =>
    props.onChange({ ...form, [key]: value });
  return TEXT_FIELDS.map(({ key, ...shown }) => (
    <TextField key={key} {...shown} value={form[key]} onChange={field(key)} />
  ));
}

const choiceOf = (node: TreeNode | undefined): OpeningChoice => ({
  opening: node?.opening ?? "",
  pictures: node?.pictures ?? {},
});

function useChapterForm(project: Project, chapterId: string) {
  const design = designOf(project.fields);
  const node = findNode(project.tree, chapterId)?.node;
  const [form, setForm] = useState(() => formOf(node));
  const [choice, setChoice] = useState(() => choiceOf(node));
  const fields = () => ({ ...fieldsOf(form), ...chapterOpeningOf(design, choice) });
  return { design, form, setForm, choice, setChoice, fields };
}

type DialogProps = {
  project: Project;
  chapterId: string;
  chapterName: string;
  onChangeTree: (tree: TreeNode[]) => void;
  onClose: () => void;
};

/** What one chapter prints around its title, beyond the book's design. */
export function ChapterHeadingDialog(props: DialogProps) {
  const { project, chapterId } = props;
  const chapter = useChapterForm(project, chapterId);
  const save = () => {
    props.onChangeTree(withNodeFields(project.tree, chapterId, chapter.fields()));
    props.onClose();
  };
  const label = t("Rubriken för {chapter}", { chapter: props.chapterName });
  return (
    <Dialog label={label} onClose={props.onClose}>
      <ChapterOpeningFields
        design={chapter.design}
        dir={project.dir}
        choice={chapter.choice}
        onChange={chapter.setChoice}
      />
      <HeadingFields form={chapter.form} onChange={chapter.setForm} />
      <DialogButtons onCancel={props.onClose} onConfirm={save} />
    </Dialog>
  );
}
