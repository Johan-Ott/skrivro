import { useState } from "react";
import type { ProjectDetails } from "../../project/newProject.js";
import { structures, templatePieces, type BookTemplate } from "../../project/templates.js";
import { importTemplateFile } from "./templateFiles.js";
import { packOf } from "../../project/packs.js";
import { t } from "../../i18n/i18n.js";

type Props = {
  details: ProjectDetails;
  onChange: (details: ProjectDetails) => void;
  libraryDir: string | null;
};

// The pack a structure comes in, beside its name; the basics have none.
function PackTag({ templateId }: { templateId: string }) {
  const pack = packOf(templateId);
  return pack ? <span className="pack-tag">{t("{pack}-paketet", { pack: pack.name })}</span> : null;
}

export function StructureList(props: Omit<Props, "libraryDir"> & { own: BookTemplate[] }) {
  const { details, onChange } = props;
  return (
    <div className="template-list" role="radiogroup" aria-label={t("Struktur")}>
      {[...structures(), ...props.own].map((structure) => (
        <button
          key={structure.id}
          role="radio"
          className="template-choice"
          aria-checked={details.structure === structure.id}
          onClick={() => onChange({ ...details, structure: structure.id })}
        >
          <span className="template-name">
            {structure.name}
            <PackTag templateId={structure.id} />
          </span>
          <span className="choice-hint">{structure.hint || t("Din egen mall")}</span>
        </button>
      ))}
    </div>
  );
}

/** Pieces to add to the structure, as many as the book needs. */
export function PieceToggles(props: {
  chosen: string[];
  except?: string;
  /** Only the free basics, where the genres come as packs beside them. */
  isFreeOnly?: boolean;
  onChange: (pieces: string[]) => void;
}) {
  const isOn = (id: string) => props.chosen.includes(id);
  const flip = (id: string) =>
    props.onChange(isOn(id) ? props.chosen.filter((each) => each !== id) : [...props.chosen, id]);
  const shown = templatePieces().filter(
    (piece) => piece.id !== props.except && (!props.isFreeOnly || packOf(piece.id) === null),
  );
  return (
    <div className="chip-row piece-row" aria-label={t("Bitar")}>
      {shown.map((piece) => (
        <button
          key={piece.id}
          className="chip"
          aria-pressed={props.chosen.includes(piece.id)}
          title={[piece.hint, packOf(piece.id)?.name].filter(Boolean).join(" · ")}
          onClick={() => flip(piece.id)}
        >
          {piece.name}
        </button>
      ))}
    </div>
  );
}

export function ImportLink(props: { libraryDir: string | null; onImported: () => void }) {
  const [problem, setProblem] = useState("");
  const importOne = () =>
    void importTemplateFile(props.libraryDir)
      .then(() => (setProblem(""), props.onImported()))
      .catch((error: unknown) =>
        setProblem(error instanceof Error ? error.message : String(error)),
      );
  return (
    <>
      <button className="link-button quiet" onClick={importOne}>
        {t("Importera mall…")}
      </button>
      {problem && <span className="setting-hint">{problem}</span>}
    </>
  );
}
