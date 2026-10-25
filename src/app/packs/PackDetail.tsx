import { Fragment, useLayoutEffect, useRef, type ReactNode } from "react";
import {
  guidesOf,
  isPackOwned,
  templatesOf,
  type Pack,
  type PackNote,
} from "../../project/packs.js";
import { AddButton, PackCover, Status, type Book } from "./PackCard.js";
import { LabelChips, NoteText, PackPreview } from "./PackPreview.js";
import { t } from "../../i18n/i18n.js";

// One pack opened up: its structure chapter by chapter, its guides and templates to read, and its
// labels, so it can be judged before it is bought. Without the pack, each note shows its opening.

const OPENING = 2;

const Notes = ({ pack, notes }: { pack: Pack; notes: PackNote[] }) => (
  <div className="pack-notes">
    {notes.map((note) => (
      <details key={note.title} className="pack-note">
        <summary>{note.title}</summary>
        <NoteText
          body={note.body}
          {...(isPackOwned(pack.id) ? {} : { most: OPENING, isTeaser: true })}
        />
      </details>
    ))}
  </div>
);

const Structures = ({ pack }: { pack: Pack }) =>
  pack.structures.map((structure) => (
    <div key={structure.id} className="pack-structure">
      <strong>{structure.name}</strong>
      <span className="choice-hint">{structure.hint}</span>
      <ol>
        {structure.parts.map((part) => (
          <Fragment key={part.title}>
            {part.title && <li className="pack-part">{part.title}</li>}
            {part.chapters.map(([title, what]) => (
              <li key={title} title={what}>
                {title}
              </li>
            ))}
          </Fragment>
        ))}
      </ol>
    </div>
  ));

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="pack-section">
    <span className="field-label">{title}</span>
    {children}
  </section>
);

function Sections({ pack }: { pack: Pack }) {
  const [guides, templates] = [guidesOf(pack), templatesOf(pack)];
  const hasLabels = pack.pieces.some((piece) => piece.labels.length > 0);
  return (
    <>
      {pack.structures.length > 0 && (
        <Section title={t("Struktur")}>
          <Structures pack={pack} />
        </Section>
      )}
      {guides.length > 0 && (
        <Section title={t("Guider")}>
          <Notes pack={pack} notes={guides} />
        </Section>
      )}
      {templates.length > 0 && (
        <Section title={t("Mallar för karaktärer och värld")}>
          <Notes pack={pack} notes={templates} />
        </Section>
      )}
      {hasLabels && (
        <Section title={t("Etiketter")}>
          <LabelChips pack={pack} />
        </Section>
      )}
    </>
  );
}

/** The pack in full, with the way back to all packs. */
export function PackDetail(props: { pack: Pack; book: Book; onBack: () => void }) {
  // Opened from far down the list, the page still starts at its top.
  const top = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    top.current?.closest(".packs-body")?.scrollTo(0, 0);
  }, [props.pack]);
  return (
    <div className="pack-detail" ref={top}>
      <button className="link-button quiet" onClick={props.onBack}>
        {t("← Alla paket")}
      </button>
      <PackCover pack={props.pack} />
      <p className="pack-tile-hint">{props.pack.hint}</p>
      <PackPreview pack={props.pack} />
      <Sections pack={props.pack} />
      <div className="pack-tile-foot">
        <Status pack={props.pack} />
        <AddButton pack={props.pack} book={props.book} />
      </div>
      <p className="setting-hint">
        {t(
          "Från version 1.0 köps ett paket en gång i appbutiken: Microsoft Store på Windows och Google Play på Android. Det du redan har lagt till i en bok är ditt.",
        )}
      </p>
    </div>
  );
}
