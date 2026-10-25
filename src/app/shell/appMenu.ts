import { openPacks } from "../packs/PackList.js";
import type { MenuItem } from "@llkit/Menu.js";
import { checkForUpdates } from "@llkit/updates.js";
import { restartGuide } from "../guide/guide.js";
import { shortcutOf } from "../shortcuts.js";
import { t } from "../../i18n/i18n.js";

export interface AppMenuActions {
  showShelf: () => void;
  newProject: () => void;
  openFolder: () => void;
  /** A book from Skrivro/ in Google Drive; left out where there is no Drive or no library. */
  /** Null when no text is open, or on the bookshelf. */
  showVersions: (() => void) | null;
  /** Null on the bookshelf, where there is no book to pack. */
  exportZip: (() => void) | null;
  /** Null on the bookshelf, where there is no book to read changes into. */
  importRevision: (() => void) | null;
  /** Skicka till redaktör and Läsarexemplar; empty on the bookshelf. */
  sharing: MenuItem[];
  /** Null where Skrivro keeps no copies, as in the browser. */
  showBackups: (() => void) | null;
  /** The book's own: Tema, Serie and Mallar och bitar; empty on the bookshelf. */
  book: MenuItem[];
  openSettings: () => void;
  openShortcuts: () => void;
  openAbout: () => void;
  sendFeedback: () => void;
}

// What only a book has, shown when there is one.
type BookAction = "showVersions" | "exportZip" | "importRevision" | "showBackups";
const BOOK_ITEMS: [BookAction, string][] = [
  ["showVersions", t("Versioner av den här texten")],
  ["exportZip", t("Exportera allt som zip")],
  ["importRevision", t("Läs in kommenterad Word-fil…")],
  ["showBackups", t("Säkerhetskopior…")],
];

/** A row that opens its items beside it; none when it has nothing to hold. */
export const group = (label: string, items: MenuItem[], separatorBefore = false): MenuItem[] =>
  items.length > 0 ? [{ label, submenu: items, separatorBefore }] : [];

// The Store updates its own build, so that build has nothing to look for.
const updateItem: MenuItem[] = __STORE__
  ? []
  : [{ label: t("Sök efter uppdateringar…"), onSelect: () => void checkForUpdates(true) }];

/** Hjälp, feedback and updates: the same under Hjälp on the computer and the phone. */
export const helpItems = (help: MenuItem, sendFeedback: () => void): MenuItem[] => [
  help,
  { label: t("Visa guiden igen"), onSelect: restartGuide },
  { label: t("Skicka feedback…"), onSelect: sendFeedback },
  ...updateItem,
];

const bookItem = (actions: AppMenuActions, key: BookAction): MenuItem[] => {
  const onSelect = actions[key];
  const label = BOOK_ITEMS.find(([item]) => item === key)?.[1] ?? "";
  return onSelect ? [{ label, onSelect }] : [];
};

// Sharing and copies, which only a book has.
const bookGroups = (actions: AppMenuActions): MenuItem[] => [
  ...group(
    t("Dela och samarbeta"),
    [...actions.sharing, ...bookItem(actions, "importRevision")],
    true,
  ),
  ...group(t("Kopior och export"), [
    ...bookItem(actions, "showVersions"),
    ...bookItem(actions, "exportZip"),
  ]),
];

/** The menu beside the logo: the books, and what the open one holds. */
export function appMenu(actions: AppMenuActions): MenuItem[] {
  return [
    { label: t("Bokhylla"), shortcut: shortcutOf("shelf"), onSelect: actions.showShelf },
    { label: t("Ny bok"), shortcut: shortcutOf("newBook"), onSelect: actions.newProject },
    { label: t("Öppna bok…"), onSelect: actions.openFolder },
    ...group(t("Boken"), actions.book, true),
    ...bookGroups(actions),
  ];
}

/** The menu under the logo: Skrivro itself, the same whichever book is open. */
export function programMenu(actions: AppMenuActions): MenuItem[] {
  const help = {
    label: t("Hjälp och kortkommandon"),
    shortcut: "?",
    onSelect: actions.openShortcuts,
  };
  return [
    { label: t("Om Skrivro"), onSelect: actions.openAbout },
    {
      label: t("Inställningar"),
      shortcut: shortcutOf("settings"),
      separatorBefore: true,
      onSelect: actions.openSettings,
    },
    ...bookItem(actions, "showBackups"),
    { label: t("Genrepaket…"), onSelect: () => openPacks() },
    ...helpItems(help, actions.sendFeedback).map((item, index) => ({
      ...item,
      separatorBefore: index === 0,
    })),
  ];
}

// A phone has no folders to pick and no shortcuts, so its menu is short.
export const phoneShelfMenu = (actions: AppMenuActions): MenuItem[] => [
  ...(actions.showBackups ? [{ label: t("Säkerhetskopior…"), onSelect: actions.showBackups }] : []),
  { label: t("Inställningar"), onSelect: actions.openSettings },
  { label: t("Genrepaket…"), onSelect: () => openPacks() },
  { label: t("Hjälp"), onSelect: actions.openShortcuts },
  { label: t("Skicka feedback…"), onSelect: actions.sendFeedback },
  ...updateItem,
];
