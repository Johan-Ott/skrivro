import { createStore } from "@llkit/store.js";
import { useState } from "react";
import { isLinkedByDefault } from "../../project/cards.js";
import { CHARACTERS_ID, findNode, sortsOf } from "../../project/tree.js";
import { nodeLabel } from "../../project/treeLabels.js";
import type { NoteTemplate } from "../../project/packs.js";
import { TemplateChips } from "./TemplateChips.js";
import { bookLanguage } from "../../project/bookLanguage.js";
import { NameSuggestions } from "./NameSuggestions.js";
import { Choice, DialogActions, Switch } from "@llkit/controls.js";
import { useEscape } from "@llkit/keys.js";
import type { Project } from "../useProject.js";
import type { NewNote } from "./useNoteActions.js";
import { t } from "../../i18n/i18n.js";

interface NewNoteDialogProps {
  project: Project;
  /** Where the writer's own note templates are kept. */
  libraryDir: string | null;
  /** The note goes to the series unless the writer keeps it to the book. */
  series: Project | null;
  sortId: string | null;
  onCreate: (note: NewNote, isInSeries: boolean) => void;
  onClose: () => void;
}

type SortChipsProps = {
  project: Project;
  sortId: string | null;
  newSort: string | null;
  onPick: (sortId: string) => void;
  onNewSort: (title: string) => void;
};

function NewSortChip(props: SortChipsProps) {
  if (props.newSort === null) {
    return (
      <button type="button" className="chip dashed" onClick={() => props.onNewSort("")}>
        {t("+ Egen sort")}
      </button>
    );
  }
  return (
    <input
      className="chip-input"
      autoFocus
      aria-label={t("Namn på den nya sorten")}
      placeholder={t("Till exempel Ledtrådar")}
      value={props.newSort}
      onChange={(event) => props.onNewSort(event.target.value)}
    />
  );
}

function SortChips(props: SortChipsProps) {
  const { tree, summaries } = props.project;
  return (
    <div className="note-sorts" role="radiogroup" aria-label={t("Sort")}>
      {sortsOf(tree).map((sort) => (
        <button
          key={sort.id}
          type="button"
          role="radio"
          aria-checked={props.newSort === null && sort.id === props.sortId}
          className="chip"
          onClick={() => props.onPick(sort.id)}
        >
          {nodeLabel(sort, tree, summaries)}
        </button>
      ))}
      <NewSortChip {...props} />
    </div>
  );
}

type Form = ReturnType<typeof useNoteForm>;

// Names link in the text, so a second Elin is most likely a slip; it is still allowed.
const hasNote = ({ tree, summaries }: Project, name: string) =>
  name !== "" &&
  sortsOf(tree)
    .flatMap((sort) => sort.children ?? [])
    .some((note) => nodeLabel(note, tree, summaries).toLowerCase() === name.toLowerCase());

function LinkRow({ form }: { form: Form }) {
  const hint = form.isLinked
    ? t("”{name}” blir klickbart överallt i manuset.", { name: form.note.name || t("Namnet") })
    : t("Av för övriga anteckningar. Går att slå på.");
  return (
    <div className="note-link-row">
      <span className="setting-text">
        <span>{t("Koppla namnet i texten")}</span>
        <span className="setting-hint">{hint}</span>
      </span>
      <Switch label={t("Koppla namnet i texten")} isOn={form.isLinked} onFlip={form.flip} />
    </div>
  );
}

function NoteFields(props: { form: Form; project: Project; libraryDir: string | null }) {
  const { form, project } = props;
  return (
    <>
      <label className="field">
        <span className="field-label">{t("Namn")}</span>
        <input
          className="note-name"
          autoFocus
          value={form.name}
          onChange={(event) => form.setName(event.target.value)}
        />
        {hasNote(project, form.note.name) && (
          <span className="setting-hint">
            {t("Det finns redan en anteckning som heter {name}.", { name: form.note.name })}
          </span>
        )}
      </label>
      {form.sortId === CHARACTERS_ID && form.newSort === null && (
        <NameSuggestions language={bookLanguage(project.fields)} onPick={form.setName} />
      )}
      <div className="field">
        <span className="field-label">{t("Sort")}</span>
        <SortChips project={project} {...form} onPick={form.pick} onNewSort={form.setNewSort} />
      </div>
      <TemplateChips form={form} project={project} libraryDir={props.libraryDir} />
      <LinkRow form={form} />
    </>
  );
}

// A name chosen in the text, waiting for the dialog it opens.
const offeredName = createStore("");

/** Opens Ny anteckning with this name already written, as Gör till anteckning does. */
export const offerNoteName = offeredName.set;

function useNoteForm(initialSort: string) {
  const [name, setName] = useState(() => {
    const offered = offeredName.get();
    offeredName.set("");
    return offered;
  });
  const [sortId, setSortId] = useState(initialSort);
  const [newSort, setNewSort] = useState<string | null>(null);
  const [linkChoice, setLinkChoice] = useState<boolean | null>(null);
  const [template, setTemplate] = useState<NoteTemplate | null>(null);
  const isLinked = linkChoice ?? (newSort !== null || isLinkedByDefault(sortId));
  const note: NewNote = {
    name: name.trim(),
    sortId,
    newSortTitle: newSort?.trim() ? newSort.trim() : null,
    isLinked,
    body: null,
  };
  const isReady = note.name !== "" && (newSort === null || note.newSortTitle !== null);
  const pick = (id: string) => (setSortId(id), setNewSort(null), setTemplate(null));
  const flip = () => setLinkChoice(!isLinked);
  return {
    ...{ name, setName, sortId, pick, newSort, setNewSort, isLinked, flip, note, isReady },
    ...{ template, setTemplate },
  };
}

const startsInSeries = ({ series, sortId }: NewNoteDialogProps) =>
  series !== null && (sortId === null || findNode(series.tree, sortId) !== null);

function HomeChoice(props: {
  series: Project;
  isInSeries: boolean;
  onChange: (isInSeries: boolean) => void;
}) {
  return (
    <div className="field">
      <span className="field-label">{t("Var")}</span>
      <Choice
        label={t("Var")}
        value={props.isInSeries ? "serie" : "bok"}
        options={[
          ["serie", props.series.name],
          ["bok", t("Bara den här boken")],
        ]}
        onSelect={(value) => props.onChange(value === "serie")}
      />
    </div>
  );
}

// Changing folder starts over on Personer, which both have.
function useHome(props: NewNoteDialogProps, form: Form) {
  const [isInSeries, setInSeries] = useState(() => startsInSeries(props));
  const home = isInSeries && props.series ? props.series : props.project;
  const changeHome = (next: boolean) => (setInSeries(next), form.pick(CHARACTERS_ID));
  return { isInSeries, home, changeHome };
}

export function NewNoteDialog(props: NewNoteDialogProps) {
  const form = useNoteForm(props.sortId ?? CHARACTERS_ID);
  const { isInSeries, home, changeHome } = useHome(props, form);
  useEscape(props.onClose);
  const note = { ...form.note, body: form.template?.body ?? null };
  const create = () => form.isReady && (props.onCreate(note, isInSeries), props.onClose());
  return (
    <div className="dialog-backdrop" onClick={props.onClose}>
      <form
        className="dialog note-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("Ny anteckning")}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => (event.preventDefault(), create())}
      >
        <span className="dialog-title">{t("Ny anteckning")}</span>
        {props.series && (
          <HomeChoice series={props.series} isInSeries={isInSeries} onChange={changeHome} />
        )}
        <NoteFields form={form} project={home} libraryDir={props.libraryDir} />
        <DialogActions isReady={form.isReady} onClose={props.onClose} />
      </form>
    </div>
  );
}
