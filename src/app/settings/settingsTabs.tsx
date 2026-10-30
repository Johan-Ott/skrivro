import { platform } from "../platform.js";
import {
  changeSize,
  REPEAT_WINDOWS,
  type ProseFont,
  type WritingSettings,
} from "../../editor/writingSettings.js";
import type { AppPreferences } from "../appPreferences.js";
import type { PreferenceChange } from "../useStartup.js";
import type { SettingsChange } from "../useWritingSettings.js";
import { Choice, Row, Switch } from "@llkit/controls.js";
import { GroupTitle, SwitchRows } from "./editorSwitches.js";
import type { DriveSync } from "../useDriveSync.js";
import { t } from "../../i18n/i18n.js";

export interface TabProps {
  preferences: AppPreferences;
  updatePreferences: (change: PreferenceChange) => void;
  settings: WritingSettings;
  onChangeSettings: (change: SettingsChange) => void;
  /** Null on the bookshelf. */
  book: {
    language: string;
    onChangeLanguage: (language: string) => void;
    onExportZip: () => void;
    /** Where the open book keeps its versions. */
    snapshotsDir: string;
    drive: DriveSync;
    /** How many changes the last syncs brought, and the list of them. */
    syncChanges: number;
    onShowSyncChanges: () => void;
  } | null;
}

const FONTS: [ProseFont, string][] = [
  ["serif", "Serif"],
  ["sans", "Sans"],
  ["mono", "Mono"],
];

function SizeStepper({ settings, onChangeSettings }: TabProps) {
  const step = (direction: 1 | -1) => () =>
    onChangeSettings((current) => changeSize(current, direction));
  return (
    <span className="stepper">
      <button aria-label={t("Mindre")} onClick={step(-1)}>
        –
      </button>
      <span>{settings.size}</span>
      <button aria-label={t("Större")} onClick={step(1)}>
        +
      </button>
    </span>
  );
}

const WINDOWS = REPEAT_WINDOWS.map((sentences): [string, string] => [
  String(sentences),
  String(sentences),
]);

function RepeatWindowRow({ settings, onChangeSettings }: TabProps) {
  return (
    <Row
      label={t("Upprepningsfönster")}
      hint={t("Hur många meningar som ska skilja samma ord åt.")}
    >
      <Choice
        label={t("Upprepningsfönster")}
        value={String(settings.repeatWindow)}
        options={WINDOWS}
        onSelect={(value) =>
          onChangeSettings((current) => ({ ...current, repeatWindow: Number(value) }))
        }
      />
    </Row>
  );
}

function FontRow({ settings, onChangeSettings }: TabProps) {
  return (
    <Row label={t("Typsnitt")} hint={t("Bara för skrivandet. Boken formges i Bokdesign.")}>
      <Choice
        label={t("Typsnitt")}
        value={settings.font}
        options={FONTS}
        onSelect={(font) => onChangeSettings((current) => ({ ...current, font }))}
      />
    </Row>
  );
}

export function EditorTab(props: TabProps) {
  return (
    <>
      <GroupTitle title={t("Sidan")} />
      <FontRow {...props} />
      <Row
        label={t("Textstorlek")}
        hint={t("Ctrl och plus eller minus ändrar den medan du skriver.")}
      >
        <SizeStepper {...props} />
      </Row>
      <SwitchRows {...props} keys={["paper", "bookType"]} />
      <GroupTitle title={t("Medan du skriver")} />
      <SwitchRows {...props} keys={["typewriter", "typography", "autocorrect", "completion"]} />
      <GroupTitle title={t("Granskning")} />
      <SwitchRows {...props} keys={["spellcheck", "review"]} />
      <RepeatWindowRow {...props} />
      <GroupTitle title={t("Sidomenyn")} />
      <SwitchRows {...props} keys={["tableOfContents", "followOpenText"]} />
    </>
  );
}

// Versions are files in the book's folder, so the writer can go and look.
function WhereVersionsAre({ book }: Pick<TabProps, "book">) {
  return (
    <Row
      label={t("Var versionerna sparas")}
      hint={t("I bokens egen mapp, i mappen snapshots. Skrivro raderar aldrig en version.")}
    >
      {book && platform.showInFolder && (
        <button
          className="button secondary small"
          onClick={() => void platform.showInFolder?.(book.snapshotsDir)}
        >
          {t("Visa mappen")}
        </button>
      )}
    </Row>
  );
}

export function VersionsTab({ preferences, updatePreferences, book }: TabProps) {
  return (
    <>
      <Row label={t("Automatiska versioner")} hint={t("Sparas när en text har ändrats mycket.")}>
        <Switch
          label={t("Automatiska versioner")}
          isOn={preferences.isAutoSnapshotOn}
          onFlip={() =>
            updatePreferences((current) => ({
              ...current,
              isAutoSnapshotOn: !current.isAutoSnapshotOn,
            }))
          }
        />
      </Row>
      <WhereVersionsAre book={book} />
      {book && <ZipRow onExportZip={book.onExportZip} />}
    </>
  );
}

function ZipRow({ onExportZip }: { onExportZip: () => void }) {
  return (
    <Row
      label={t("Exportera allt som zip")}
      hint={t(
        "Hela projektmappen med versioner och kommentarer, och seriens mapp om boken har en.",
      )}
    >
      <button className="button secondary small" onClick={onExportZip}>
        {t("Spara som zip…")}
      </button>
    </Row>
  );
}
