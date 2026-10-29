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
      onSearchBook={(text) => {
        app.search.scope.setOn(true);
        app.writingMode.openSearchWith(text);
      }}
      onMoveToCuts={canMoveToCuts(app, project) ? () => void moveToCuts(app, project) : undefined}
      onMakeNote={(name) => {
        offerNoteName(name);
        app.setNewNoteSort(null);
      }}
    />
    <FootnotePopover editor={app.editor} />
    <LinkPopover editor={app.editor} />
    <ClickCorrections editor={app.editor} onReview={() => app.writingMode.setReviewOpen(true)} />
  </>
);
