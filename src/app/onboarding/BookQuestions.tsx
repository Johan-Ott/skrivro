import type { ReactNode } from "react";
import type { ProjectDetails } from "../../project/newProject.js";
import { NarrationPicker } from "../review/NarrationPicker.js";
import { hasGenre } from "./books.js";
import { t, formatNumber } from "../../i18n/i18n.js";

// The first and last questions of a new book: what kind it is, and its title, voice and goals.
// The step between, its shape, is BookShape.

export type FieldProps = { details: ProjectDetails; onChange: (details: ProjectDetails) => void };

// Each kind of book drawn as a small book of its own.
const GLYPHS: Record<string, ReactNode> = {
  roman: (
    <>
      <rect x="8.5" y="4.5" width="15" height="23" rx="1.5" />
      <path d="M12 4.5v23" />
    </>
  ),
  noveller: (
    <>
      <rect x="5.5" y="9.5" width="5.5" height="18" rx="1" />
      <rect x="13" y="5.5" width="5.5" height="22" rx="1" />
      <rect x="20.5" y="11.5" width="5.5" height="16" rx="1" />
    </>
  ),
  fackbok: (
    <>
      <rect x="7.5" y="4.5" width="17" height="23" rx="1.5" />
      <path d="M11 4.5v23M14.5 11h6.5M14.5 15h6.5M14.5 19h4" />
    </>
  ),
  annat: (
    <>
      <rect x="8.5" y="4.5" width="15" height="23" rx="1.5" strokeDasharray="2.5 2.5" />
      <path d="M16 12.5v7M12.5 16h7" />
    </>
  ),
};

const TYPES: [string, string, string][] = [
  ["roman", t("Roman"), t("En lång berättelse")],
  ["noveller", t("Noveller"), t("En eller flera korta berättelser")],
  ["fackbok", t("Fackbok"), t("Kunskap, minnen eller en idé")],
  ["annat", t("Annat"), t("Något eget, du bygger det själv")],
];

export const typeLabel = (type: string) => TYPES.find(([each]) => each === type)?.[1] ?? "";

export function BookTypes({ details, onChange }: FieldProps) {
  // A book without a genre does not keep the one chosen for a novel before.
  const choose = (type: string) =>
    onChange({ ...details, type, genre: hasGenre(type) ? (details.genre ?? "") : "" });
  return (
    <div className="nb-types" role="radiogroup" aria-label={t("Vad skriver du?")}>
      {TYPES.map(([type, label, hint]) => (
        <button
          key={type}
          type="button"
          role="radio"
          className="nb-choice"
          aria-checked={details.type === type}
          onClick={() => choose(type)}
        >
          <svg className="glyph" viewBox="0 0 32 32" aria-hidden="true">
            {GLYPHS[type]}
          </svg>
          <span className="name">{label}</span>
          <span className="hint">{hint}</span>
        </button>
      ))}
    </div>
  );
}

const WORDS_PER_PAGE = 250;
const numberFrom = (text: string) => Number(text.replace(/\D/g, ""));

// The whole book's goal in words, and in pages, which is how a writer often thinks of it.
function BookGoal({ details, onChange }: FieldProps) {
  const words = details.totalGoal ?? 0;
  return (
    <label className="onboarding-field">
      <span className="field-label">{t("Bokens längd i ord")}</span>
      <input
        inputMode="numeric"
        value={words ? formatNumber(words) : ""}
        placeholder={t("Inget mål")}
        onChange={(event) =>
          onChange({ ...details, totalGoal: numberFrom(event.target.value) || null })
        }
      />
      {words > 0 && (
        <span className="setting-hint">
          {t("Cirka {pages} sidor", { pages: formatNumber(Math.round(words / WORDS_PER_PAGE)) })}
        </span>
      )}
    </label>
  );
}

function GoalFields({ details, onChange }: FieldProps) {
  return (
    <div className="field-pair">
      <label className="onboarding-field">
        <span className="field-label">{t("Dagligt ordmål")}</span>
        <input
          inputMode="numeric"
          value={formatNumber(details.dailyGoal)}
          onChange={(event) => onChange({ ...details, dailyGoal: numberFrom(event.target.value) })}
        />
      </label>
      <label className="onboarding-field">
        <span className="field-label">{t("Deadline (valfritt)")}</span>
        <input
          type="date"
          value={details.deadline}
          onChange={(event) => onChange({ ...details, deadline: event.target.value })}
        />
      </label>
    </div>
  );
}

export function TitleAndGoal(props: FieldProps) {
  return (
    <>
      <label className="onboarding-field">
        <span className="field-label">{t("Titel")}</span>
        <input
          autoFocus
          placeholder={t("Arbetstitel duger")}
          value={props.details.title}
          onChange={(event) => props.onChange({ ...props.details, title: event.target.value })}
        />
      </label>
      <span className="field-label">{t("Hur berättas den?")}</span>
      <NarrationPicker
        value={props.details.narration}
        onChange={(narration) => props.onChange({ ...props.details, narration })}
      />
      <span className="setting-hint">
        {t("Granska håller koll på att texten följer det, till exempel filterord i deep POV.")}
      </span>
      <BookGoal {...props} />
      <GoalFields {...props} />
    </>
  );
}
