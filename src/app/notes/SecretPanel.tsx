import { withNodeFields } from "../../project/nodeFields.js";
import { earlyMentions, secretsKnownBy, secretsOf, type Secret } from "../../project/secrets.js";
import type { TreeNode } from "../../project/tree.js";
import type { Project } from "../useProject.js";
import type { Notes } from "./useNotes.js";
import { ScenePicker, sceneName, WhoKnows } from "./SecretPeople.js";
import { t } from "../../i18n/i18n.js";

export interface SecretProps {
  book: Project;
  noteId: string;
  notes: Notes;
  onOpen: (id: string) => void;
  onChangeTree: (tree: TreeNode[]) => void;
}

function EarlyWarning({ props, secret }: { props: SecretProps; secret: Secret }) {
  const early = earlyMentions(
    props.book.tree,
    secret,
    props.notes.mentions.get(secret.id)?.sceneIds ?? [],
  );
  if (early.length === 0) return null;
  return (
    <div className="secret-warning" role="note">
      <span>{t("Nämns före avslöjandet:")}</span>
      {early.map((sceneId) => (
        <button key={sceneId} className="link-button" onClick={() => props.onOpen(sceneId)}>
          {sceneName(props.book, sceneId)}
        </button>
      ))}
    </div>
  );
}

/** A secret's page: where the reader learns it, who learns it when, and where it slips out early. */
export function SecretPanel(props: SecretProps) {
  const secret = secretsOf(props.book.tree, props.book.summaries).find(
    (each) => each.id === props.noteId,
  );
  if (!secret) return null;
  const reveal = (sceneId: string) =>
    props.onChangeTree(
      withNodeFields(props.book.tree, secret.id, { reveal: sceneId || undefined }),
    );
  return (
    <section className="secret-panel" aria-label={t("Vem vet vad")}>
      <label className="secret-row">
        <span className="secret-person">{t("Läsaren får veta i")}</span>
        <ScenePicker
          book={props.book}
          label={t("Läsaren får veta i")}
          value={secret.reveal ?? ""}
          onPick={reveal}
        />
      </label>
      <WhoKnows props={props} secret={secret} />
      <EarlyWarning props={props} secret={secret} />
    </section>
  );
}

/** A person's page: the secrets they learn, and from which scene. */
export function PersonSecrets(props: SecretProps) {
  const known = secretsKnownBy(
    props.book.tree,
    secretsOf(props.book.tree, props.book.summaries),
    props.noteId,
  );
  if (known.length === 0) return null;
  return (
    <section className="secret-panel" aria-label={t("Vet om")}>
      <span className="note-mentions-heading">{t("Vet om")}</span>
      {known.map(({ secret, from }) => (
        <button key={secret.id} className="note-mention" onClick={() => props.onOpen(secret.id)}>
          <span className="note-mention-place">
            {t("från {scene}", { scene: sceneName(props.book, from) })}
          </span>
          <span className="note-mention-text">{secret.name}</span>
        </button>
      ))}
    </section>
  );
}

/** In Granska: the secrets this scene names before the reader is meant to learn them. */
export function SceneSecretWarnings(
  props: Pick<SecretProps, "book" | "notes" | "onOpen"> & { sceneId: string },
) {
  const { book, notes } = props;
  const early = secretsOf(book.tree, book.summaries).filter((secret) =>
    earlyMentions(book.tree, secret, notes.mentions.get(secret.id)?.sceneIds ?? []).includes(
      props.sceneId,
    ),
  );
  if (early.length === 0) return null;
  return (
    <section className="review-section" aria-label={t("Hemligheter före avslöjandet")}>
      <span className="review-heading">{t("Hemligheter före avslöjandet")}</span>
      {early.map((secret) => (
        <button
          key={secret.id}
          className="review-item book-task"
          onClick={() => props.onOpen(secret.id)}
        >
          <span>{secret.name}</span>
          <span className="kpi-sub">
            {t("Läsaren får veta först i {scene}", { scene: sceneName(book, secret.reveal ?? "") })}
          </span>
        </button>
      ))}
    </section>
  );
}
