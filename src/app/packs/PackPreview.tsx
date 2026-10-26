import { CHARACTERS_ID } from "../../project/sorts.js";
import { guidesOf, type Pack } from "../../project/packs.js";
import { t } from "../../i18n/i18n.js";

// A small drawing of a book with the pack in it, drawn from the pack itself: the sidebar with its
// parts, chapters and notes, and a page with the first guide. No pictures to keep up to date.

const CHAPTERS_SHOWN = 1;

// The notes' Markdown is plain: paragraphs, "- " lists, **bold** and _italic_.
const EMPHASIS = /(\*\*.+?\*\*|(?<![\p{L}\p{N}])_.+?_(?![\p{L}\p{N}]))/u;
const inline = (text: string) =>
  text.split(EMPHASIS).map((part, index) => {
    if (index % 2 === 0) return part;
    if (part.startsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    return <em key={index}>{part.slice(1, -1)}</em>;
  });

/** A note's text, all of it or its first few paragraphs, saying so if the rest is in the pack. */
export function NoteText(props: { body: string; most?: number; isTeaser?: boolean }) {
  const blocks = props.body.split(/\n\s*\n/).filter((block) => block.trim());
  const shown = blocks.slice(0, props.most ?? blocks.length);
  return (
    <div className="pack-note-text">
      {shown.map((block) =>
        block.startsWith("- ") ? (
          <ul key={block}>
            {block.split("\n").map((line) => (
              <li key={line}>{inline(line.replace(/^- /, ""))}</li>
            ))}
          </ul>
        ) : (
          <p key={block}>{inline(block)}</p>
        ),
      )}
      {props.isTeaser && shown.length < blocks.length && (
        <p className="pack-more">{t("Resten ingår i paketet.")}</p>
      )}
    </div>
  );
}

const Chapters = ({ pack }: { pack: Pack }) =>
  (pack.structures[0]?.parts ?? []).map((part) => (
    <div key={part.title} className="pack-preview-part">
      {part.title && <span className="pack-preview-kicker">{part.title}</span>}
      {part.chapters.slice(0, CHAPTERS_SHOWN).map(([title]) => (
        <span key={title}>{title}</span>
      ))}
      {part.chapters.length > CHAPTERS_SHOWN && <span className="pack-preview-dim">…</span>}
    </div>
  ));

function Sorts({ pack }: { pack: Pack }) {
  const counts = new Map<string, number>();
  for (const note of pack.notes) counts.set(note.sort, (counts.get(note.sort) ?? 0) + 1);
  // The guides are notes; the templates wait under Mall in Ny anteckning for their sort.
  const amount = (sort: string, count: number) => {
    if (sort === "Guide") return String(count);
    return count === 1 ? t("1 mall") : t("{count} mallar", { count });
  };
  return [...counts].map(([sort, count]) => (
    <span key={sort} className="pack-preview-sort">
      {sort === CHARACTERS_ID ? t("Personer") : sort}
      <span className="pack-preview-dim">{amount(sort, count)}</span>
    </span>
  ));
}

/** The pack's labels as they look on a scene, or the first few of them. */
export const LabelChips = ({ pack, most }: { pack: Pack; most?: number }) => (
  <span className="pack-labels">
    {pack.pieces
      .flatMap((piece) => piece.labels)
      .slice(0, most)
      .map(([name, colour]) => (
        <span key={name} className="pack-label">
          <span className="pack-label-dot" style={{ background: colour }} />
          {name}
        </span>
      ))}
  </span>
);

// The first guide, or else the first chapter as the book will open on it.
function opening(pack: Pack) {
  const note = guidesOf(pack)[0] ?? pack.notes[0];
  if (note) return note;
  const [title = "", body = ""] = pack.structures[0]?.parts[0]?.chapters[0] ?? [];
  return { title, body };
}

function Page({ pack }: { pack: Pack }) {
  const { title, body } = opening(pack);
  return (
    <div className="pack-preview-page">
      <LabelChips pack={pack} most={3} />
      <h3>{title}</h3>
      <NoteText body={body} most={2} />
    </div>
  );
}

/** How the book looks with the pack added, shown before it is. */
export function PackPreview({ pack }: { pack: Pack }) {
  if (pack.structures.length === 0 && pack.notes.length === 0) return null;
  return (
    <div className="pack-preview" aria-label={t("Så ser det ut i boken")} role="img">
      <div className="pack-preview-side">
        <strong>{t("Din bok")}</strong>
        <Chapters pack={pack} />
        {pack.notes.length > 0 && <span className="pack-preview-kicker">{t("Anteckningar")}</span>}
        <Sorts pack={pack} />
      </div>
      <Page pack={pack} />
    </div>
  );
}
