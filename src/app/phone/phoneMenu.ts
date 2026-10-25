import type { AppState } from "../App.js";
import type { MenuItem } from "@llkit/Menu.js";
import { collaborationItems } from "../exporting/collaboration.js";
import { HELP_TAB } from "../settings/SettingsDialog.js";
import { group, helpItems } from "../shell/appMenu.js";
import { openPacks } from "../packs/PackList.js";
import { setPanelOpen } from "../sprint/sprint.js";
import type { useMenuDialogs } from "../shell/useAppMenu.js";
import { t } from "../../i18n/i18n.js";

// A phone has no keyboard shortcuts or folders to pick, so the menu is short.
const versionsItem = (app: AppState): MenuItem[] => {
  const sceneId = app.scene?.id;
  return sceneId
    ? [{ label: t("Versioner av den här texten"), onSelect: () => app.snapshots.show(sceneId) }]
    : [];
};

const sharingAndCopies = (app: AppState, dialogs: ReturnType<typeof useMenuDialogs>) => [
  ...group(t("Dela och samarbeta"), [
    ...(app.project ? collaborationItems(app.project, app.zip.run) : []),
    { label: t("Läs in kommenterad Word-fil…"), onSelect: dialogs.revision.open },
  ]),
  ...group(t("Kopior och export"), [
    ...versionsItem(app),
    { label: t("Exportera allt som zip"), onSelect: app.zip.backup },
    ...(dialogs.backups.open
      ? [{ label: t("Säkerhetskopior…"), onSelect: dialogs.backups.open }]
      : []),
  ]),
];

type BookDialogs = Record<"theme" | "templates", { open: () => void }>;

export function phoneMenu(
  app: AppState,
  dialogs: ReturnType<typeof useMenuDialogs>,
  book: BookDialogs,
): MenuItem[] {
  const help = { label: t("Hjälp"), onSelect: () => app.writingMode.settingsDialog.open(HELP_TAB) };
  return [
    { label: t("Bokhylla"), onSelect: () => void app.showShelf() },
    { label: t("Skrivsprint"), onSelect: () => setPanelOpen(true) },
    ...group(
      t("Boken"),
      [
        { label: t("Tema…"), onSelect: book.theme.open },
        { label: t("Mallar och bitar…"), onSelect: book.templates.open },
        { label: t("Genrepaket…"), onSelect: () => openPacks() },
        { label: t("Serie…"), onSelect: dialogs.series.open },
      ],
      true,
    ),
    ...sharingAndCopies(app, dialogs),
    {
      label: t("Inställningar"),
      separatorBefore: true,
      onSelect: () => app.writingMode.settingsDialog.open(),
    },
    ...group(t("Hjälp"), helpItems(help, dialogs.feedback.open)),
  ];
}
