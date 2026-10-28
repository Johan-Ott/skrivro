import { withNodeFields } from "../../project/nodeFields.js";
import type { Secret } from "../../project/secrets.js";
import { CHARACTERS_ID, manuscriptSceneIds, sceneIdsIn } from "../../project/tree.js";
import { chapterOf } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import type { SecretProps } from "./SecretPanel.js";
import { t } from "../../i18n/i18n.js";

// Who in the story learns a secret, and in which scene.

export function sceneName(book: Project, sceneId: string) {
  const chapter = chapterOf(book.tree, sceneId);
  const title = book.summaries[sceneId]?.title ?? "";
  return chapter ? `${chapter.number}. ${chapter.title} · ${title}` : title;
}

export function ScenePicker(props: {
  book: Project;
  label: string;
  value: string;
  onPick: (sceneId: string) => void;
}) {
  return (
    <select
      className="secret-scene"
      aria-label={props.label}
      value={props.value}
      onChange={(event) => props.onPick(event.target.value)}
    >
      <option value="">{t("Inte bestämt")}</option>
      {manuscriptSceneIds(props.book.tree).map((id) => (
        <option key={id} value={id}>
          {sceneName(props.book, id)}
        </option>
      ))}
    </select>
  );
}

type SaveKnown = (knownBy: Record<string, string>) => void;

function PersonRow(props: { book: Project; secret: Secret; personId: string; save: SaveKnown }) {
  const { book, secret, personId } = props;
  const name = book.summaries[personId]?.title ?? "";
  const pick = (sceneId: string) =>
    props.save(
      sceneId ? { ...secret.knownBy, [personId]: sceneId } : omit(secret.knownBy, personId),
    );
  return (
    <div className="secret-row">
      <span className="secret-person">{name}</span>
      <ScenePicker
        book={book}
        label={t("När {name} får veta", { name })}
        value={secret.knownBy[personId] ?? ""}
        onPick={pick}
      />
      <button
        className="icon-button"
        aria-label={t("Ta bort {to}", { to: name })}
        onClick={() => props.save(omit(secret.knownBy, personId))}
      >
        ×
      </button>
    </div>
  );
}

// Someone new learns it where the reader does, until the writer picks another scene.
function AddPerson(props: { book: Project; secret: Secret; save: SaveKnown }) {
  const { book, secret } = props;
  const unknowing = sceneIdsIn(book.tree, CHARACTERS_ID).filter((id) => !secret.knownBy[id]);
  if (unknowing.length === 0) return null;
  const start = secret.reveal ?? manuscriptSceneIds(book.tree)[0] ?? "";
  return (
    <select
      className="secret-add"
      aria-label={t("Lägg till en person som får veta")}
      value=""
      onChange={(event) => props.save({ ...secret.knownBy, [event.target.value]: start })}
    >
      <option value="">{t("+ Person som får veta")}</option>
      {unknowing.map((id) => (
        <option key={id} value={id}>
          {book.summaries[id]?.title ?? ""}
        </option>
      ))}
    </select>
  );
}

export function WhoKnows({ props, secret }: { props: SecretProps; secret: Secret }) {
  const { book } = props;
  const save: SaveKnown = (knownBy) =>
    props.onChangeTree(
      withNodeFields(book.tree, secret.id, {
        knownBy: Object.keys(knownBy).length > 0 ? knownBy : undefined,
      }),
    );
  return (
    <div className="secret-people">
      {Object.keys(secret.knownBy).map((personId) => (
        <PersonRow key={personId} book={book} secret={secret} personId={personId} save={save} />
      ))}
      <AddPerson book={book} secret={secret} save={save} />
    </div>
  );
}

const omit = (record: Record<string, string>, key: string) =>
  Object.fromEntries(Object.entries(record).filter(([each]) => each !== key));
