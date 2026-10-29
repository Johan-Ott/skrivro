import { useState } from "react";
import { THEME_LABELS, type Theme } from "../../editor/writingSettings.js";
import { BOOK_LANGUAGES } from "../../project/bookLanguage.js";
import { Choice } from "@llkit/controls.js";
import { platform } from "../platform.js";
import { formatNumber, numberLocale, t } from "../../i18n/i18n.js";

// The first start's choices on a card in two steps, beside Skrivro's own book that wears them.
// Each can be changed later in Inställningar.

export interface Choices {
  /** On covers and title pages; empty until written. */
  authorName: string;
  /** The first is a new book's language. */
  languages: string[];
  dailyGoal: number;
}

/** The choices while they are made; the goal is what its field says. */
export type Draft = { authorName: string; languages: string[]; dailyGoal: string };

/** A new writer's first book language, from the language Skrivro is shown in. */
export const firstLanguage = () => numberLocale();

export const freshDraft = (): Draft => ({
  authorName: "",
  languages: [firstLanguage()],
  dailyGoal: "0",
});

export const goalOf = (draft: Draft) => Number(draft.dailyGoal) || 0;

const DAY = 86_400_000;
const NOVEL = 80_000;

/** When a novel is done at the day's goal, or that there is no goal. */
export function goalForecast(goal: number) {
  if (!goal) return t("Inget mål. Du skriver när det passar.");
  const end = new Date(Date.now() + Math.ceil(NOVEL / goal) * DAY);
  return t("Med {words} ord om dagen är en roman på {novel} ord klar i {month}.", {
    words: formatNumber(goal),
    novel: formatNumber(NOVEL),
    month: end.toLocaleDateString(numberLocale(), { month: "long", year: "numeric" }),
  });
}

const THEMES = Object.entries(THEME_LABELS) as [Theme, string][];
// No goal first, two to start from, and the writer's own number.
const OWN = "eget";
const goals = (): [string, string][] => [
  ["0", t("Inget mål")],
  ["500", "500"],
  ["1000", "1000"],
  [OWN, t("Eget")],
];

function DailyGoal(props: { value: string; onChange: (goal: string) => void }) {
  // Back on this step, a number of one's own is still one's own.
  const isListed = goals().some(([goal]) => goal === props.value);
  const [choice, setChoice] = useState(isListed ? props.value : OWN);
  const isOwn = choice === OWN;
  const choose = (next: string) => {
    setChoice(next);
    props.onChange(next === OWN ? "" : next);
  };
  return (
    <>
      <span className="field-label">{t("Ord om dagen")}</span>
      <Choice label={t("Ord om dagen")} value={choice} options={goals()} onSelect={choose} />
      {isOwn && (
        <input
          className="onboarding-goal"
          inputMode="numeric"
          aria-label={t("Eget mål, ord om dagen")}
          placeholder={t("Till exempel 750")}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value.replace(/\D/g, ""))}
        />
      )}
    </>
  );
}

function LanguageChips(props: { chosen: string[]; onChange: (chosen: string[]) => void }) {
  const flip = (tag: string) =>
    props.onChange(
      props.chosen.includes(tag)
        ? props.chosen.filter((each) => each !== tag)
        : [...props.chosen, tag],
    );
  return (
    <>
      <span className="field-label">{t("Vilka språk skriver du på?")}</span>
      <div className="chip-row" aria-label={t("Språk du skriver på")}>
        {BOOK_LANGUAGES.map(([tag, name]) => (
          <button
            key={tag}
            className="chip"
            aria-pressed={props.chosen.includes(tag)}
            onClick={() => flip(tag)}
          >
            {name}
          </button>
        ))}
      </div>
    </>
  );
}

const AuthorField = (props: { value: string; onChange: (name: string) => void }) => (
  <label className="onboarding-field">
    <span className="field-label">{t("Ditt namn som författare")}</span>
    <input
      value={props.value}
      placeholder={t("Står på omslag och titelsida")}
      onChange={(event) => props.onChange(event.target.value)}
    />
  </label>
);

// Only the apps fetch; the browser has what it needs.
const FetchNote = () =>
  platform.spelling ? (
    <p className="setting-hint">
      {t("Ordlistorna och det som gör boken tryckfärdig hämtas medan du börjar, cirka 13 MB.")}
    </p>
  ) : null;

const choicesOf = (draft: Draft): Choices => ({
  authorName: draft.authorName.trim(),
  languages: draft.languages,
  dailyGoal: goalOf(draft),
});

type Props = {
  draft: Draft;
  onDraft: (change: Partial<Draft>) => void;
  theme: Theme;
  onTheme: (theme: Theme) => void;
  /** After Klar, while the book shows what was chosen. */
  isLeaving: boolean;
  onDone: (choices: Choices) => void;
  onBack: () => void;
};

// Step one: who writes, and in which languages.
const Who = ({ draft, onDraft }: Props) => (
  <>
    <AuthorField value={draft.authorName} onChange={(authorName) => onDraft({ authorName })} />
    <LanguageChips chosen={draft.languages} onChange={(languages) => onDraft({ languages })} />
  </>
);

// Step two: how Skrivro looks, and how much a day.
const How = ({ draft, onDraft, theme, onTheme }: Props) => (
  <>
    <span className="field-label">{t("Utseende")}</span>
    <Choice label={t("Utseende")} value={theme} options={THEMES} onSelect={onTheme} />
    <DailyGoal value={draft.dailyGoal} onChange={(dailyGoal) => onDraft({ dailyGoal })} />
    <p className="first-choices-forecast">{goalForecast(goalOf(draft))}</p>
    <FetchNote />
  </>
);

type FootProps = { step: number; canGoOn: boolean; onBack: () => void; onNext: () => void };

const Foot = ({ step, canGoOn, onBack, onNext }: FootProps) => (
  <div className="nb-foot">
    <span className="nb-dots">
      <i className="on" />
      <i className={step === 2 ? "on" : ""} />
      <span>{t("Steg {step} av {steps}", { step, steps: 2 })}</span>
    </span>
    <span className="spacer" />
    <button className="button ghost" onClick={onBack}>
      {t("Tillbaka")}
    </button>
    <button className="button primary" disabled={!canGoOn} onClick={onNext}>
      {step === 1 ? t("Fortsätt") : t("Klar")}
    </button>
  </div>
);

// The why under each heading tells what the answers do to the book beside the card.
export function FirstChoices(props: Props) {
  const [step, setStep] = useState(1);
  const isFirst = step === 1;
  return (
    <div className={props.isLeaving ? "first-choices leaving" : "first-choices"}>
      <h2>{isFirst ? t("Gör Skrivro till din") : t("Hur vill du skriva?")}</h2>
      <p className="first-choices-why">
        {isFirst
          ? t("Namnet präglas på omslaget, och varje språk får ett eget läsband.")
          : t(
              "Ju mer du vill skriva om dagen, desto tjockare blir boken. Allt går att ändra senare.",
            )}
      </p>
      <div key={step} className="first-choices-step">
        {isFirst ? <Who {...props} /> : <How {...props} />}
      </div>
      <Foot
        step={step}
        canGoOn={props.draft.languages.length > 0}
        onBack={isFirst ? props.onBack : () => setStep(1)}
        onNext={() => (isFirst ? setStep(2) : props.onDone(choicesOf(props.draft)))}
      />
    </div>
  );
}
