import {
  composeTemplate,
  GENRES,
  structures,
  templatePieces,
  type BookTemplate,
} from "../../project/templates.js";
import { ImportLink, PieceToggles, StructureList } from "../templates/TemplateChoices.js";
import { packsFor, type Pack } from "../../project/packs.js";
import { Dropdown } from "@llkit/controls.js";
import { defaultLabels } from "../../project/labels.js";
import { useOwnTemplates } from "../templates/templateFiles.js";
import { withStructure, withSuggestion } from "./books.js";
import type { FieldProps } from "./BookQuestions.js";
import { t } from "../../i18n/i18n.js";

// The book's shape in one step: the genre that gives it a structure, what is blended in, and
// whether the writer plans first or writes their way forward. What the book gets shows below.

const hasGenre = (type: string) => type === "roman" || type === "noveller";

function GenreChoice({ details, onChange }: FieldProps) {
  const genres = templatePieces().filter((piece) => GENRES.includes(piece.id));
  const choose = (genre: string) =>
    onChange(
      withSuggestion({ ...details, genre, pieces: details.pieces.filter((id) => id !== genre) }),
    );
  const options: [string, string][] = [
    ["", t("Ingen särskild")],
    ...genres.map((genre): [string, string] => [genre.id, genre.name]),
  ];
  return (
    <Dropdown label={t("Genre")} value={details.genre ?? ""} options={options} onSelect={choose} />
  );
}

const WAYS: [boolean, string, string][] = [
  [true, t("Jag planerar först"), t("Ett kapitel för varje steg i strukturen.")],
  [false, t("Jag skriver mig fram"), t("Ett första kapitel, och stegen som en anteckning.")],
];

function WritingWay({ details, onChange }: FieldProps) {
  return (
    <div className="template-list" role="radiogroup" aria-label={t("Hur skriver du?")}>
      {WAYS.map(([isPlanned, label, hint]) => (
        <button
          key={label}
          role="radio"
          className="template-choice"
          aria-checked={(details.isPlanned !== false) === isPlanned}
          onClick={() => onChange({ ...details, isPlanned })}
        >
          <span className="template-name">{label}</span>
          <span className="choice-hint">{hint}</span>
        </button>
      ))}
    </div>
  );
}

const chapterCount = (book: BookTemplate) =>
  book.parts.reduce((count, part) => count + part.chapters.length, 0);

const addedLabels = (book: BookTemplate) => {
  const standard = defaultLabels().map((label) => label.name);
  return book.labels.map(([name = ""]) => name).filter((name) => !standard.includes(name));
};

// The genre packs the book takes its guides and templates from.
function FromPacks({ packs }: { packs: Pack[] }) {
  if (packs.length === 0) return null;
  const names = packs.map((pack) => pack.name).join(", ");
  return (
    <>
      <dt>{t("Ur paketen")}</dt>
      <dd>{t("Guider och mallar från {packs}", { packs: names })}</dd>
    </>
  );
}

// What the choices give the book, so that each one shows what it does.
function WhatItGets(props: {
  book: BookTemplate;
  isPlanned: boolean;
  packs: Pack[];
  onSwap: () => void;
}) {
  const { book } = props;
  const added = addedLabels(book);
  const count = props.isPlanned ? chapterCount(book) : Math.min(1, chapterCount(book));
  return (
    <dl className="book-gets" aria-label={t("Boken får")}>
      <dt>{t("Struktur")}</dt>
      <dd>
        {book.name} · {t("{count} kapitel", { count })}{" "}
        <button className="link-button" onClick={props.onSwap}>
          {t("Byt")}
        </button>
      </dd>
      {book.sorts.length > 0 && <dt>{t("Anteckningar")}</dt>}
      {book.sorts.length > 0 && <dd>{book.sorts.join(", ")}</dd>}
      {added.length > 0 && <dt>{t("Etiketter")}</dt>}
      {added.length > 0 && <dd>{added.join(", ")}</dd>}
      <FromPacks packs={props.packs} />
    </dl>
  );
}

type ShapeProps = FieldProps & { libraryDir: string };

function StructureSwap(
  props: ShapeProps & { own: BookTemplate[]; reload: () => Promise<void>; onDone: () => void },
) {
  return (
    <>
      <StructureList
        details={props.details}
        own={props.own}
        onChange={(next) => (props.onDone(), props.onChange(withStructure(next, next.structure)))}
      />
      <ImportLink libraryDir={props.libraryDir} onImported={() => void props.reload()} />
    </>
  );
}

function Choices(props: FieldProps & { hasSteps: boolean }) {
  const { details, onChange } = props;
  return (
    <>
      {hasGenre(details.type) && <span className="field-label">{t("Genre")}</span>}
      {hasGenre(details.type) && <GenreChoice {...props} />}
      <span className="field-label">{t("Blanda i")}</span>
      <PieceToggles
        chosen={details.pieces}
        except={details.genre ?? ""}
        onChange={(pieces) => onChange(withSuggestion({ ...details, pieces }))}
      />
      {props.hasSteps && <span className="field-label">{t("Hur skriver du?")}</span>}
      {props.hasSteps && <WritingWay {...props} />}
    </>
  );
}

/** `isSwapping`: the list of structures is open in place of the summary, held by the dialog so its
 * Tillbaka closes the list first. */
export function BookShape(
  props: ShapeProps & { isSwapping: boolean; setSwapping: (isSwapping: boolean) => void },
) {
  const { details, isSwapping, setSwapping } = props;
  const { own, reload } = useOwnTemplates(props.libraryDir);
  const all = [...structures(), ...own];
  const structure = all.find((each) => each.id === details.structure) ?? all[0];
  if (!structure) return null;
  if (isSwapping)
    return <StructureSwap {...props} own={own} reload={reload} onDone={() => setSwapping(false)} />;
  return (
    <>
      <Choices {...props} hasSteps={structure.parts.length > 0} />
      <WhatItGets
        book={composeTemplate(structure, [details.genre ?? "", ...details.pieces])}
        isPlanned={details.isPlanned !== false}
        packs={packsFor([details.structure, details.genre ?? "", ...details.pieces]).filter(
          (pack) => pack.notes.length > 0,
        )}
        onSwap={() => setSwapping(true)}
      />
    </>
  );
}
