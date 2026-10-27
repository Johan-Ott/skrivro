import { chapterRuns } from "../../project/cards.js";
import { STICKY_ID } from "../../project/sorts.js";
import { GuideTip } from "../guide/GuideTip.js";
import {
  CHARACTERS_ID,
  findNode,
  NOTES_ID,
  PLACES_ID,
  SECRETS_ID,
  THINGS_ID,
} from "../../project/tree.js";
import { chapterOf } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import { mentionedChapters } from "./cardFormat.js";
import type { Notes } from "./useNotes.js";
import { Aliases } from "./Aliases.js";
import { Connections } from "./Connections.js";
import { ResearchFile } from "./ResearchFile.js";
import { t } from "../../i18n/i18n.js";

export interface NotePageProps {
  /** The series or the book: where the note lives. */
  project: Project;
  /** The open book, whose chapters the note is named in. */
  book: Project;
  noteId: string;
  notes: Notes;
  onOpen: (id: string) => void;
  onSaveFields: (fields: Record<string, unknown>) => void;
  /** Writes the note's other names, `aliases:`, to its front matter. */
  onSetAliases: (aliases: string[]) => void;
}

// The fixed sorts in the singular ("PERSON"), the writer's own by their name.
function kindLabel(project: Project, sortId: string) {
  const fixed: Record<string, string> = {
    [CHARACTERS_ID]: t("Person"),
    [PLACES_ID]: t("Plats"),
    [THINGS_ID]: t("Sak"),
    [SECRETS_ID]: t("Hemlighet"),
    [NOTES_ID]: t("Övrigt"),
    [STICKY_ID]: t("Lapp"),
  };
  return fixed[sortId] ?? findNode(project.tree, sortId)?.node.title ?? "";
}

export function noteSortOf(project: Project, id: string) {
  const parent = findNode(project.tree, id)?.parent;
  return parent?.kind === "sort" ? parent.id : null;
}

// A lapp has no title and no other names: it is what was written on it.
function LappHeader({ project, sortId }: { project: Project; sortId: string }) {
  return (
    <header className="note-header">
      <div className="text-eyebrow">
        <span>{kindLabel(project, sortId)}</span>
      </div>
    </header>
  );
}

export function NoteHeader(props: NotePageProps & { sortId: string }) {
  const { project, noteId } = props;
  if (props.sortId === STICKY_ID) return <LappHeader project={project} sortId={props.sortId} />;
  const chapters = mentionedChapters(props.book, props.notes.mentions.get(noteId));
  const file = project.summaries[noteId]?.file;
  return (
    <header className="note-header">
      <div className="text-eyebrow">
        <span>{kindLabel(project, props.sortId)}</span>
        {chapters.length > 0 && (
          <span className="eyebrow-end">
            {t("Nämns i kap. {chapters}", { chapters: chapterRuns(chapters) })}
          </span>
        )}
      </div>
      <h1>{project.summaries[noteId]?.title ?? ""}</h1>
      {file && <ResearchFile dir={project.dir} name={file} />}
      <Connections {...props} />
      <Aliases {...props} />
      <GuideTip step="anteckningar" />
    </header>
  );
}

export function NoteMentions({ book: project, noteId, notes, onOpen }: NotePageProps) {
  const mentions = notes.mentions.get(noteId);
  if (!mentions || mentions.sceneIds.length === 0) return null;
  const placeOf = (id: string) => {
    const chapter = chapterOf(project.tree, id);
    return chapter ? `${chapter.number}. ${chapter.title}` : (project.summaries[id]?.title ?? "");
  };
  return (
    <section className="note-mentions" aria-label={t("Nämns i")}>
      <span className="note-mentions-heading">{t("Nämns i")}</span>
      {mentions.sceneIds.map((id) => (
        <button key={id} className="note-mention" onClick={() => onOpen(id)}>
          <span className="note-mention-place">{placeOf(id)}</span>
          <span className="note-mention-text">{mentions.sentences[id]}</span>
        </button>
      ))}
    </section>
  );
}
