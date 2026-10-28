import type { ReactNode } from "react";
import type { AppState } from "../App.js";
import { ChartIcon, ImageIcon, NoteIcon, PeopleIcon } from "../shell/icons.js";
import type { Project } from "../useProject.js";
import { BlockPanel } from "./BlockPanel.js";
import { openBlocks, toggleBlock } from "./layout.js";
import { LayoutButton } from "./LayoutButton.js";
import { InSceneBlock } from "./InSceneBlock.js";
import { ReferenceBlock } from "./ReferenceBlock.js";
import { StickyNotesLayer } from "./StickyNotes.js";
import { useStickyNotes } from "./useStickyNotes.js";
import { t } from "../../i18n/i18n.js";

// The blocks as icons at the text's foot on the right, before Granska; each opens as a panel
// that can be moved, and closing it makes it an icon again.

type Props = { app: AppState; project: Project; review: ReactNode };
type Block = { id: string; title: string; icon: ReactNode; body: (props: Props) => ReactNode };

const BLOCKS: Block[] = [
  {
    id: "iscenen",
    title: t("I scenen"),
    icon: <PeopleIcon />,
    body: (props) => <InSceneBlock app={props.app} />,
  },
  {
    id: "referens",
    title: t("Referensbild"),
    icon: <ImageIcon />,
    body: (props) => <ReferenceBlock project={props.project} />,
  },
];

// Lappar are not a panel but notes of their own over the text; the dock shows and hides them.
const NOTES = "lappar";
const NOTES_BUTTON = { id: NOTES, title: t("Lappar"), icon: <NoteIcon />, body: () => null };

// Insikter keeps its own open state, as Granska does; here it is one more icon.
function InsightsButton({ app }: { app: AppState }) {
  const { isProgressOpen, setProgressOpen } = app.writingMode;
  return (
    <button
      className={isProgressOpen ? "dock-button chosen" : "dock-button"}
      aria-label={t("Insikter")}
      aria-pressed={isProgressOpen}
      title={t("Insikter")}
      onClick={() => setProgressOpen(!isProgressOpen)}
    >
      <ChartIcon />
    </button>
  );
}

function DockButton(props: { block: Block; isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      className={props.isOpen ? "dock-button chosen" : "dock-button"}
      aria-label={props.block.title}
      aria-pressed={props.isOpen}
      title={props.block.title}
      onClick={props.onToggle}
    >
      {props.block.icon}
    </button>
  );
}

function OpenPanels(props: Props & { open: string[] }) {
  return (
    <>
      {BLOCKS.filter((block) => props.open.includes(block.id)).map((block) => (
        <BlockPanel key={block.id} {...block} onClose={() => toggleBlock(block.id)}>
          {block.body(props)}
        </BlockPanel>
      ))}
    </>
  );
}

export function BlocksDock(props: Props) {
  const open = openBlocks.use();
  const notes = useStickyNotes(props.project, props.app);
  const button = (block: Block) => (
    <DockButton
      key={block.id}
      block={block}
      isOpen={open.includes(block.id)}
      onToggle={() => toggleBlock(block.id)}
    />
  );
  return (
    <>
      {open.includes(NOTES) && <StickyNotesLayer key={props.project.dir} state={notes} />}
      <OpenPanels {...props} open={open} />
      <div className="blocks-dock">
        {button(NOTES_BUTTON)}
        {BLOCKS.map(button)}
        <InsightsButton app={props.app} />
        <LayoutButton app={props.app} />
        {props.review}
      </div>
    </>
  );
}
