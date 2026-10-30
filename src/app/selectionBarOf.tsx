import type { MenuItem } from "@llkit/Menu.js";
import { countWords } from "../countWords.js";
import { t } from "../i18n/i18n.js";
import type { AppState } from "./App.js";
import { FootnotePopover } from "./FootnotePopover.js";
import { LinkPopover } from "./LinkPopover.js";
import { offerNoteName } from "./notes/NewNoteDialog.js";
import { canMoveToCuts, moveToCuts } from "./cuts.js";
import { insertChosenPicture } from "./palette/sceneContext.js";
import { speechContext } from "./ReadAloud.js";
import { SelectionBar } from "./SelectionBar.js";
import { ClickCorrections } from "./spelling/ClickCorrections.js";
import type { Project } from "./useProject.js";
import { WalkBar } from "./review/WalkBar.js";
import { shortcutOf } from "./shortcuts.js";

// A name or a place is a few words; a longer selection is no note's title.
const MOST_NOTE_WORDS = 4;

/** Right-click on chosen words: what can be done with these very words. */
export const wordItemsOf =
  (app: AppState, project: Project) =>
  (text: string): MenuItem[] => {
    const { readAloud } = speechContext(app, project);
    const searchBook = () => {
      app.search.scope.setOn(true);
      app.writingMode.openSearchWith(text);
    };
    const makeNote = () => {
      offerNoteName(text);
      app.setNewNoteSort(null);
    };
    const toCuts = () => void moveToCuts(app, project);
    return [
      { label: t("Kommentera"), shortcut: shortcutOf("comment"), onSelect: app.comments.start },
      ...(readAloud ? [{ label: t("Läs upp"), onSelect: readAloud }] : []),
      { label: t("Sök i boken"), onSelect: searchBook },
      ...(countWords(text) <= MOST_NOTE_WORDS
        ? [{ label: t("Gör till anteckning"), onSelect: makeNote }]
        : []),
      ...(canMoveToCuts(app, project)
        ? [{ label: t("Flytta till Strukna"), onSelect: toCuts }]
        : []),
    ];
  };

// What stands over the text while writing: the format row, or in Redigera the walk, a footnote's
// text, a link's address and a click's help.
export const selectionBarOf = (app: AppState, project: Project) => (
  <>
    {app.writingMode.step === "redigera" && <WalkBar app={app} project={project} />}
    <SelectionBar
      editor={app.editor}
      hidesFormatRow={app.writingMode.step === "redigera"}
      onComment={app.comments.start}
      onReadAloud={speechContext(app, project).readAloud ?? undefined}
      onInsertPicture={() => void insertChosenPicture(project.dir, app.editor.run)}
      onMoveToCuts={canMoveToCuts(app, project) ? () => void moveToCuts(app, project) : undefined}
    />
    <FootnotePopover editor={app.editor} />
    <LinkPopover editor={app.editor} />
    <ClickCorrections editor={app.editor} onReview={() => app.writingMode.setReviewOpen(true)} />
  </>
);
