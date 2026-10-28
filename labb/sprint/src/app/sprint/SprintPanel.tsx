import { BlockPanel } from "../blocks/BlockPanel.js";
import {
  endSprint,
  nextPhase,
  passesBy,
  phasesOf,
  setPanelOpen,
  setPlan,
  startSprint,
  useSprint,
  type Sprint,
  type SprintPlan,
} from "./sprint.js";
import { clock, sprintWords, useTick } from "./sprintClock.js";
import { t } from "../../i18n/i18n.js";

// The sprint's own block: the plan's four numbers to set, as a pomodoro timer has them, and
// while it runs the phase, the clock and the words.

type Setting = {
  key: keyof SprintPlan;
  label: string;
  unit: string;
  step: number;
  range: [number, number];
};

const SETTINGS: Setting[] = [
  { key: "session", label: t("Pass"), unit: t("min"), step: 5, range: [5, 90] },
  { key: "shortBreak", label: t("Kort paus"), unit: t("min"), step: 1, range: [1, 30] },
  { key: "longBreak", label: t("Lång paus"), unit: t("min"), step: 5, range: [5, 60] },
  { key: "rounds", label: t("Varv"), unit: t("gånger"), step: 1, range: [1, 8] },
];

function Stepper({ setting, plan }: { setting: Setting; plan: SprintPlan }) {
  const value = plan[setting.key];
  const [low, high] = setting.range;
  const set = (next: number) =>
    setPlan({ ...plan, [setting.key]: Math.min(high, Math.max(low, next)) });
  return (
    <div className="sprint-setting">
      <span className="sprint-setting-label">{setting.label}</span>
      <button
        aria-label={t("Mer {label}", { label: setting.label })}
        onClick={() => set(value + setting.step)}
      >
        ▲
      </button>
      <span className="sprint-setting-value">{String(value).padStart(2, "0")}</span>
      <span className="sprint-setting-unit">{setting.unit}</span>
      <button
        aria-label={t("Mindre {label}", { label: setting.label })}
        onClick={() => set(value - setting.step)}
      >
        ▼
      </button>
    </div>
  );
}

const PHASE_NAMES = { pass: t("Pass"), kort: t("Kort paus"), lang: t("Lång paus") };

function Running(props: { sprint: Sprint; todayWords: number; onEnd: () => void }) {
  const { sprint, todayWords } = props;
  const now = useTick();
  const words = sprintWords(sprint, todayWords);
  const phase = phasesOf(sprint.plan)[sprint.phase] ?? "pass";
  const where = t("{pass} av {rounds}", {
    pass: passesBy(sprint.phase),
    rounds: sprint.plan.rounds,
  });
  return (
    <div className="sprint-running">
      <span className="sprint-phase">{`${PHASE_NAMES[phase]} · ${where}`}</span>
      <span className="sprint-big-clock">{clock(sprint.endsAt - now)}</span>
      <span className="sprint-words">{t("{words} ord", { words })}</span>
      <div className="sprint-actions">
        <button className="button secondary small" onClick={() => nextPhase(words)}>
          {t("Hoppa över")}
        </button>
        <button
          className="button secondary small"
          onClick={() => (endSprint(words), props.onEnd())}
        >
          {t("Avsluta")}
        </button>
      </div>
    </div>
  );
}

/** Opened from the clock in the top bar, and from the sprint's bar while it runs. */
export function SprintPanel({ todayWords, onEnd }: { todayWords: number; onEnd: () => void }) {
  const { plan, sprint, isPanelOpen } = useSprint();
  if (!isPanelOpen) return null;
  return (
    <BlockPanel id="sprint" title={t("Skrivsprint")} onClose={() => setPanelOpen(false)}>
      {sprint ? (
        <Running sprint={sprint} todayWords={todayWords} onEnd={onEnd} />
      ) : (
        <>
          <div className="sprint-settings">
            {SETTINGS.map((setting) => (
              <Stepper key={setting.key} setting={setting} plan={plan} />
            ))}
          </div>
          <button className="button primary sprint-start" onClick={startSprint}>
            {t("▶ Starta")}
          </button>
        </>
      )}
    </BlockPanel>
  );
}
