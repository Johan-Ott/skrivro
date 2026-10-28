import { useState } from "react";
import { projectGoals } from "../../project/progress.js";
import { useEscape } from "@llkit/keys.js";
import { t } from "../../i18n/i18n.js";

interface GoalsDialogProps {
  fields: Record<string, unknown>;
  onSave: (fields: Record<string, unknown>) => void;
  onClose: () => void;
}

type GoalKey = "dailyGoal" | "totalGoal" | "deadline";
type GoalForm = Record<GoalKey, string>;

const FIELDS: [GoalKey, string, string][] = [
  ["dailyGoal", t("Dagligt ordmål"), t("Det som räknas i Idag.")],
  ["totalGoal", t("Slutmål"), t("Hur långt manuset ska bli, i ord.")],
  ["deadline", t("Deadline"), t("Lämna tom om det inte finns någon.")],
];

// Only digits, so 2,5 and 2.5 are slips and not rounded; "80 000" is a number.
export const wholeNumber = (text: string) => {
  const digits = text.replace(/\s/g, "");
  const value = /^\d+$/.test(digits) ? Number(digits) : 0;
  return value > 0 ? value : undefined;
};

// A goal of -5 or 2,5 is a slip, not a wish to remove the goal; an empty field is that wish.
const isWrong = (key: GoalKey, text: string) =>
  key !== "deadline" && text.trim() !== "" && wholeNumber(text) === undefined;

// An empty field removes that goal; undefined values are left out of project.json.
const fieldsOf = (form: GoalForm) => ({
  dailyGoal: wholeNumber(form.dailyGoal),
  totalGoal: wholeNumber(form.totalGoal),
  deadline: form.deadline || undefined,
});

function formOf(fields: Record<string, unknown>): GoalForm {
  const goals = projectGoals(fields);
  return {
    dailyGoal: String(goals.dailyGoal ?? ""),
    totalGoal: String(goals.totalGoal ?? ""),
    deadline: goals.deadline ?? "",
  };
}

function GoalFields({ form, onChange }: { form: GoalForm; onChange: (form: GoalForm) => void }) {
  return FIELDS.map(([key, label, hint]) => (
    <label key={key} className="onboarding-field">
      <span className="field-label">{label}</span>
      <input
        // Text, so what shows is what is read, whatever the browser's language.
        type={key === "deadline" ? "date" : "text"}
        inputMode={key === "deadline" ? undefined : "numeric"}
        aria-invalid={isWrong(key, form[key])}
        value={form[key]}
        onChange={(event) => onChange({ ...form, [key]: event.target.value })}
      />
      <span className="setting-hint">
        {isWrong(key, form[key]) ? t("Skriv ett helt antal ord, större än noll.") : hint}
      </span>
    </label>
  ));
}

function SaveButton({ form, onSave }: { form: GoalForm; onSave: () => void }) {
  const isReady = !FIELDS.some(([key]) => isWrong(key, form[key]));
  return (
    <button className="button primary" disabled={!isReady} onClick={onSave}>
      {t("Spara")}
    </button>
  );
}

export function GoalsDialog({ fields, onSave, onClose }: GoalsDialogProps) {
  const [form, setForm] = useState(() => formOf(fields));
  useEscape(onClose);
  const save = () => {
    onSave(fieldsOf(form));
    onClose();
  };
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog goals-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("Mål för projektet")}
        onClick={(event) => event.stopPropagation()}
      >
        <span className="dialog-title">{t("Mål för projektet")}</span>
        <GoalFields form={form} onChange={setForm} />
        <div className="dialog-actions">
          <button className="button secondary" onClick={onClose}>
            {t("Avbryt")}
          </button>
          <SaveButton form={form} onSave={save} />
        </div>
      </div>
    </div>
  );
}
