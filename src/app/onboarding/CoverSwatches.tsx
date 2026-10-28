import { GENRES, templatePieces } from "../../project/templates.js";
import { COVER_CHOICES, COVER_LOOKS } from "../../project/shelfLook.js";
import { hasGenre, withSuggestion } from "./books.js";
import type { FieldProps } from "./BookQuestions.js";
import { t } from "../../i18n/i18n.js";

// The genre is chosen by its cover, and a book without one chooses a plain colour. The open book
// around the questions wears what is chosen.

type Swatch = { id: string; name: string; look: string };

function Swatches(props: {
  label: string;
  swatches: Swatch[];
  chosen: string;
  onChoose: (id: string) => void;
}) {
  return (
    <div className="nb-swatches" role="radiogroup" aria-label={props.label}>
      {props.swatches.map((swatch) => (
        <button
          key={swatch.id}
          type="button"
          role="radio"
          className="nb-swatch"
          aria-checked={swatch.id === props.chosen}
          onClick={() => props.onChoose(swatch.id)}
        >
          <span className={`book-cover nb-mini ${swatch.look}`} />
          {swatch.name}
        </button>
      ))}
    </div>
  );
}

/** The plain look a book without a genre wears, Skog until the writer picks another. */
export const plainOf = (details: { coverLook?: string }) => details.coverLook ?? "skog";

function GenreSwatches({ details, onChange }: FieldProps) {
  const genres = templatePieces().filter((piece) => GENRES.includes(piece.id));
  const swatches = [
    { id: "", name: t("Ingen särskild"), look: `cover-${plainOf(details)}` },
    ...genres.map((genre) => ({ id: genre.id, name: genre.name, look: `cover-${genre.id}` })),
  ];
  const choose = (genre: string) =>
    onChange(
      withSuggestion({ ...details, genre, pieces: details.pieces.filter((id) => id !== genre) }),
    );
  return (
    <div className="nb-field">
      <span className="nb-label">{t("Genre")}</span>
      <Swatches
        label={t("Genre")}
        swatches={swatches}
        chosen={details.genre ?? ""}
        onChoose={choose}
      />
    </div>
  );
}

const PLAINS = COVER_CHOICES.filter(([id]) => COVER_LOOKS.includes(`cover-${id}`)).map(
  ([id, name]) => ({ id, name, look: `cover-${id}` }),
);

function PlainSwatches({ details, onChange }: FieldProps) {
  return (
    <div className="nb-field">
      <span className="nb-label">{hasGenre(details.type) ? t("Färg") : t("Omslag")}</span>
      <Swatches
        label={t("Omslagets färg")}
        swatches={PLAINS}
        chosen={plainOf(details)}
        onChoose={(coverLook) => onChange({ ...details, coverLook })}
      />
    </div>
  );
}

/** A novel or short stories choose a genre, and a plain colour while they have none. */
export function CoverChoices(props: FieldProps) {
  const withGenre = hasGenre(props.details.type);
  return (
    <>
      {withGenre && <GenreSwatches {...props} />}
      {!(withGenre && props.details.genre) && <PlainSwatches {...props} />}
    </>
  );
}
