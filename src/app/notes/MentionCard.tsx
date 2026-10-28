import { useEffect, useRef, useState } from "react";
import { firstPictureIn } from "../../manuscript/pictures.js";
import { connectionsOf } from "../../project/connections.js";
import { readSceneBodies } from "../../project/sceneSummaries.js";
import { platform } from "../platform.js";
import { pictureUrlIn } from "../pictureFiles.js";
import type { Project } from "../useProject.js";
import type { Notes } from "./useNotes.js";
import { t } from "../../i18n/i18n.js";

const CARD_WIDTH = 310;
const EDGE = 16;

function placeOf(box: DOMRect) {
  const left = Math.min(Math.max(EDGE, box.left - 24), window.innerWidth - CARD_WIDTH - EDGE);
  return { top: box.bottom + 8, left };
}

function useCloseOnOutside(onClose: () => void) {
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) onClose();
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);
  return cardRef;
}

function connectionLine(project: Project, noteId: string) {
  return connectionsOf(project.fields, noteId)
    .flatMap((connection) => {
      const name = project.summaries[connection.id]?.title;
      if (!name) return [];
      return [connection.role ? `${name}, ${connection.role}` : name];
    })
    .join(" · ");
}

// The note's first picture, such as the place's own, so it is seen from the scene with one click.
function useFirstPicture(note: { dir: string; id: string } | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const key = note ? `${note.dir}|${note.id}` : null;
  useEffect(() => {
    setUrl(null);
    if (!note) return;
    let isCurrent = true;
    void readSceneBodies(platform.fileSystem, [note])
      .then((bodies) => firstPictureIn(bodies[note.id] ?? ""))
      .then((name) => (name ? pictureUrlIn(note.dir, name) : null))
      .then(
        (made) => isCurrent && setUrl(made),
        // A note that cannot be read is shown without its picture.
        () => undefined,
      );
    return () => void (isCurrent = false);
    // The note's place alone says when it is another note.
  }, [key]);
  return url;
}

export function MentionCard(props: {
  notes: Notes;
  /** A note's connections are kept where the note lives: the series or the book. */
  homes: Project[];
  onOpenNote: (id: string) => void;
}) {
  const { notes, homes } = props;
  const cardRef = useCloseOnOutside(notes.hideMention);
  const shown = notes.mention;
  const card = notes.cards.find((candidate) => candidate.id === shown?.id);
  const picture = useFirstPicture(card);
  if (!shown || !card) return null;
  const description = notes.descriptionOf(card.id);
  const home = homes.find((candidate) => candidate.summaries[card.id]);
  const connections = home ? connectionLine(home, card.id) : "";
  const place = placeOf(shown.box);
  return (
    <div ref={cardRef} className="mention-card" role="dialog" aria-label={card.name} style={place}>
      <div className="mention-head">
        <span className="mention-name">{card.name}</span>
        {description && <span className="mention-description">{description}</span>}
      </div>
      {picture && <img className="mention-picture" src={picture} alt="" />}
      {connections && <span className="mention-connections">{connections}</span>}
      <button className="link-button" onClick={() => props.onOpenNote(card.id)}>
        {t("Öppna anteckningen")}
      </button>
    </div>
  );
}
