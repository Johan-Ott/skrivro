import { t } from "../../i18n/i18n.js";

// Publicera's parts as tabs along its top: one click changes part, and there is no way back to
// find, since every part is always one click away.

export type Step = "design" | "details" | "export" | "forlag";

const STEPS: [Step, string][] = [
  ["design", t("Design")],
  ["details", t("Bokuppgifter")],
  ["export", t("Exportera")],
  ["forlag", t("Till förlag")],
];

export function PublishTabs(props: { step: Step; onStep: (step: Step) => void }) {
  return (
    <nav className="publish-tabs" aria-label={t("Delar")}>
      {STEPS.map(([step, label]) => (
        <button
          key={step}
          className={step === props.step ? "publish-tile chosen" : "publish-tile"}
          aria-current={step === props.step ? "page" : undefined}
          onClick={() => props.onStep(step)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
