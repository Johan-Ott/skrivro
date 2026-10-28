import { THEME_LABELS, type Theme } from "../../editor/writingSettings.js";
import { FetchedRow } from "./FetchedRow.js";
import { BOOK_LANGUAGES } from "../../project/bookLanguage.js";
import { platform } from "../platform.js";
import { Choice, Dropdown, Row } from "@llkit/controls.js";
import { UiLanguageChoice } from "./UiLanguageChoice.js";
import { REMINDER_HOURS } from "../reminder.js";
import type { TabProps } from "./settingsTabs.js";
import { wholeNumber } from "../progress/GoalsDialog.js";
import { t } from "../../i18n/i18n.js";

function BookLanguage({ book }: Pick<TabProps, "book">) {
  if (!book) return null;
  return (
    <Row
      label={t("Bokens språk")}
      hint={t("Stavningskontroll och e-bokens språk. Skrivro startar om vid byte.")}
    >
      <Dropdown
        label={t("Bokens språk")}
        value={book.language}
        options={BOOK_LANGUAGES}
        onSelect={book.onChangeLanguage}
      />
    </Row>
  );
}

const THEMES = Object.entries(THEME_LABELS) as [Theme, string][];
async function changeLibrary(update: TabProps["updatePreferences"]) {
  const folder = await platform.pickFolder();
  if (folder) update((current) => ({ ...current, libraryDir: folder }));
}

function GoalInput({ preferences, updatePreferences }: TabProps) {
  return (
    <input
      className="settings-number"
      type="number"
      min={1}
      step={100}
      aria-label={t("Dagligt ordmål")}
      value={preferences.defaultDailyGoal}
      onChange={(event) => {
        const goal = wholeNumber(event.target.value);
        if (goal) updatePreferences((current) => ({ ...current, defaultDailyGoal: goal }));
      }}
    />
  );
}

function AuthorInput({ preferences, updatePreferences }: TabProps) {
  return (
    <input
      className="settings-text"
      placeholder={t("Namn eller pseudonym")}
      aria-label={t("Författarnamn")}
      value={preferences.authorName}
      onChange={(event) =>
        updatePreferences((current) => ({ ...current, authorName: event.target.value }))
      }
    />
  );
}

function LibraryButton({ updatePreferences }: TabProps) {
  return (
    <button
      className="button secondary small"
      onClick={() => void changeLibrary(updatePreferences)}
    >
      {t("Ändra…")}
    </button>
  );
}

const hourLabel = (hour: number | null) => (hour === null ? t("Av") : `${hour}:00`);

function ReminderChoice({ preferences, updatePreferences }: TabProps) {
  return (
    <Choice
      label={t("Påminnelse")}
      value={hourLabel(preferences.reminderHour)}
      options={REMINDER_HOURS.map((hour) => [hourLabel(hour), hourLabel(hour)])}
      onSelect={(label) => {
        const reminderHour = REMINDER_HOURS.find((hour) => hourLabel(hour) === label) ?? null;
        updatePreferences((current) => ({ ...current, reminderHour }));
      }}
    />
  );
}

function LibraryRows(props: TabProps) {
  const hint = t("Där nya projekt skapas. Lägg den i din molnmapp för synk.");
  return (
    <>
      {!platform.isPhone && (
        <Row label={t("Bokhyllans mapp")} hint={props.preferences.libraryDir ?? hint}>
          <LibraryButton {...props} />
        </Row>
      )}
      <Row label={t("Dagligt ordmål")} hint={t("Standard för nya projekt.")}>
        <GoalInput {...props} />
      </Row>
      <Row label={t("Påminnelse")} hint={t("Lokal notis om du inte skrivit idag.")}>
        <ReminderChoice {...props} />
      </Row>
    </>
  );
}

export function GeneralTab(props: TabProps) {
  const { settings, onChangeSettings } = props;
  return (
    <>
      <Row label={t("Författarnamn")} hint={t("Används i export. Kan ändras per projekt.")}>
        <AuthorInput {...props} />
      </Row>
      <Row label={t("Språk")} hint={t("Appens språk. Manusets typografi väljs vid export.")}>
        <UiLanguageChoice />
      </Row>
      <BookLanguage book={props.book} />
      <FetchedRow
        languages={[props.preferences.bookLanguage, props.book?.language ?? ""].filter(Boolean)}
      />
      <Row label={t("Utseende")} hint={t("Följer systemet om inget annat väljs.")}>
        <Choice
          label={t("Utseende")}
          value={settings.theme}
          options={THEMES}
          onSelect={(theme) => onChangeSettings((current) => ({ ...current, theme }))}
        />
      </Row>
      <LibraryRows {...props} />
    </>
  );
}
