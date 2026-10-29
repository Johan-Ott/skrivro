import type { NoteCard } from "../notes/useNotes.js";
import type { Command } from "prosemirror-state";
import {
  changeSize,
  DEFAULT_SETTINGS,
  nextLineHeight,
  nextWidth,
  THEME_LABELS,
  type Theme,
  type FocusMode,
  type ProseFont,
  type WritingSettings,
} from "../../editor/writingSettings.js";
import { manuscriptSceneIds, numberNodes, findNode, type NodeKind } from "../../project/tree.js";
import { chapterOf } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import type { SettingsChange } from "../useWritingSettings.js";
import type { PaletteEntry } from "./paletteSearch.js";
import { cardEntries, labelled, sceneEntries } from "./bookEntries.js";
import { VIEWS, type Step, type View } from "../useWritingMode.js";
import { formatEntries } from "./formatEntries.js";
import { shortcutOf, shortcutText } from "../shortcuts.js";
import { t } from "../../i18n/i18n.js";

export interface PaletteContext {
  project: Project;
  settings: WritingSettings;
  openScene: (id: string) => void;
  add: (kind: NodeKind) => void;
  run: (command: Command) => void;
  changeSettings: (change: SettingsChange) => void;
  toggleFocusMode: () => void;
  openSearch: () => void;
  /** Null on a phone, where Skrivro keeps its books in its own folder. */
  chooseFolder: (() => void) | null;
  showShelf: () => void;
  /** Null when no scene is open. */
  showSnapshots: (() => void) | null;
  /** For the open text's chapter, or the whole book. */
  showDrafts: () => void;
  openSettings: () => void;
  /** Null on a phone, which has its own screens instead of the views. */
  showView: ((to: View | Step) => void) | null;
  cards: NoteCard[];
  /** The first sentence of a note, shown beside its name. */
  describe: (id: string) => string;
  openCard: (id: string) => void;
  newNote: () => void;
  /** A research file, into Övrigt. */
  addFile: () => void;
  /** Null when there is nothing to split or merge. */
  splitScene: (() => void) | null;
  mergeScene: (() => void) | null;
  /** Null when no text is open. */
  insertPicture: (() => void) | null;
  /** A chapter, or the whole book when null. Null on a phone, which has no reading view. */
  read: ((chapterId: string | null) => void) | null;
  openChapterId: string | null;
  /** Null without a text, or where the computer has no voice. */
  readAloud: (() => void) | null;
  /** Förslagsläge on or off; null when no text is open. */
  toggleSuggesting: (() => void) | null;
}

export const command = (label: string, run: () => void, shortcut?: string): PaletteEntry => ({
  id: `kommando:${label}`,
  label,
  group: "Kommandon",
  run,
  ...(shortcut ? { shortcut } : {}),
});

function placeEntries({ project, openScene }: PaletteContext): PaletteEntry[] {
  const scenes = manuscriptSceneIds(project.tree).map((id): PaletteEntry => {
    const chapter = chapterOf(project.tree, id);
    return {
      id: `scen:${id}`,
      label: project.summaries[id]?.title ?? t("Namnlös scen"),
      group: "Scener",
      run: () => openScene(id),
      ...(chapter ? { hint: t("Kapitel {number}", { number: chapter.number }) } : {}),
      ...labelled(project.tree, id),
    };
  });
  const chapters = [...numberNodes(project.tree, "chapter")].flatMap(
    ([id, number]): PaletteEntry[] => {
      const chapter = findNode(project.tree, id)?.node;
      const firstScene = chapter?.children?.find((child) => child.kind === "scene");
      if (!chapter || !firstScene) return [];
      return [
        {
          id: `kapitel:${id}`,
          label: `${number}. ${chapter.title ?? ""}`,
          group: "Kapitel",
          run: () => openScene(firstScene.id),
          ...labelled(project.tree, id),
        },
      ];
    },
  );
  return [...scenes, ...chapters];
}

function writingEntries(context: PaletteContext): PaletteEntry[] {
  return [
    command(t("Ny scen"), () => context.add("scene"), shortcutOf("newScene")),
    command(t("Nytt kapitel"), () => context.add("chapter")),
    command(t("Ny del"), () => context.add("part")),
    command(t("Ny mapp"), () => context.add("folder")),
    command(t("Ny anteckning"), context.newNote),
    command(t("Lägg till fil bland anteckningarna…"), context.addFile),
    ...sceneEntries(context),
    command(t("Sök och ersätt"), context.openSearch, shortcutOf("search")),
    command(t("Fokusläge"), context.toggleFocusMode, shortcutOf("focus")),
    command(t("Visa som ark eller löptext"), () =>
      context.changeSettings((now) => ({ ...now, paper: !now.paper })),
    ),
    ...(context.showSnapshots
      ? [command(t("Versioner av den här texten"), context.showSnapshots)]
      : []),
    command(t("Utkast…"), context.showDrafts),
    command(t("Inställningar"), context.openSettings, shortcutOf("settings")),
    ...viewEntries(context.showView),
    ...formatEntries(context),
  ];
}

const onOff = (isOn: boolean) => (isOn ? t("av") : t("på"));

const FONTS: [ProseFont, string][] = [
  ["serif", "Serif"],
  ["sans", "Sans"],
  ["mono", "Mono"],
];
const FOCUS_MODES: [FocusMode, string][] = [
  ["av", t("Av")],
  ["mening", t("Mening")],
  ["stycke", t("Stycke")],
];

const changeTo =
  (changes: Partial<WritingSettings>): SettingsChange =>
  (current) => ({ ...current, ...changes });

function textEntries({ changeSettings: change }: PaletteContext): PaletteEntry[] {
  return [
    command(
      t("Större text"),
      () => change((current) => changeSize(current, 1)),
      shortcutText({ key: "+" }),
    ),
    command(
      t("Mindre text"),
      () => change((current) => changeSize(current, -1)),
      shortcutText({ key: "-" }),
    ),
    command(
      t("Standardstorlek på texten"),
      () => change(changeTo({ size: DEFAULT_SETTINGS.size })),
      shortcutText({ key: "0" }),
    ),
    ...FONTS.map(([font, label]) =>
      command(t("Typsnitt: {font}", { font: label }), () => change(changeTo({ font }))),
    ),
    command(t("Radavstånd: nästa"), () =>
      change((current) => ({ ...current, lineHeight: nextLineHeight(current.lineHeight) })),
    ),
    command(t("Textbredd: nästa"), () =>
      change((current) => ({ ...current, width: nextWidth(current.width) })),
    ),
  ];
}

// Publicera is also found by what a writer wants from it.
const viewEntries = (showView: PaletteContext["showView"]) =>
  showView
    ? [
        ...VIEWS.map(([view, label, keys]) =>
          command(t("Gå till {view}", { view: label }), () => showView(view), keys),
        ),
        command(t("Exportera som PDF, e-bok eller Word"), () => showView("publicera")),
      ]
    : [];

function switchEntries({
  settings,
  changeSettings: change,
  chooseFolder,
  showShelf,
}: PaletteContext): PaletteEntry[] {
  const flip = (label: string, key: "indent" | "typewriter") =>
    command(`${label} ${onOff(settings[key])}`, () => change(changeTo({ [key]: !settings[key] })));
  return [
    ...(Object.keys(THEME_LABELS) as Theme[]).map((theme) =>
      command(`Utseende: ${THEME_LABELS[theme]}`, () => change(changeTo({ theme }))),
    ),
    flip(t("Indrag första rad"), "indent"),
    flip(t("Skrivraden mitt på skärmen"), "typewriter"),
    ...FOCUS_MODES.map(([focus, label]) =>
      command(`Fokus: ${label}`, () => change(changeTo({ focus }))),
    ),
    command(t("Bokhylla"), showShelf),
    ...(chooseFolder ? [command(t("Öppna projektmapp…"), chooseFolder)] : []),
  ];
}

export function paletteEntries(context: PaletteContext): PaletteEntry[] {
  return [
    ...placeEntries(context),
    ...cardEntries(context),
    ...writingEntries(context),
    ...textEntries(context),
    ...switchEntries(context),
  ];
}
