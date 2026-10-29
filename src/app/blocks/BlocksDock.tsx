import type { ReactNode } from "react";
import { useMenuButton, type MenuItem } from "@llkit/Menu.js";
import type { AppState } from "../App.js";
import type { Project } from "../useProject.js";
import { BlockPanel } from "./BlockPanel.js";
import { activeLayout, layouts, openBlocks, toggleBlock } from "./layout.js";
import { layoutItems } from "./layoutItems.js";
import { InSceneBlock } from "./InSceneBlock.js";
import { ReferenceBlock } from "./ReferenceBlock.js";
import { t } from "../../i18n/i18n.js";

// One button at the text's foot on the right, before Granska, with the panels in words; each
// opens as a panel that can be moved, and choosing it again closes it.

type Props = { app: AppState; project: Project; review: ReactNode };
type Block = { id: string; title: string; body: (props: Props) => ReactNode };

const BLOCKS: Block[] = [
  {
    id: "iscenen",
    title: t("I scenen"),
    body: (props) => <InSceneBlock app={props.app} />,
  },
  {
    id: "referens",
    title: t("Referensbild"),
    body: (props) => <ReferenceBlock project={props.project} />,
  },
];

// Insikter keeps its own open state, as Granska does; in the menu it is one more panel.
function panelItems(props: Props, open: string[]): MenuItem[] {
  const { isProgressOpen, setProgressOpen } = props.app.writingMode;
  const item = (block: Block): MenuItem => ({
    label: block.title,
    isChecked: open.includes(block.id),
    onSelect: () => toggleBlock(block.id),
  });
  return [
    ...BLOCKS.map(item),
    {
      label: t("Insikter"),
      isChecked: isProgressOpen,
      onSelect: () => setProgressOpen(!isProgressOpen),
    },
  ];
}

function PanelsButton(props: Props & { open: string[] }) {
  const menu = useMenuButton(t("Paneler"), panelItems(props, props.open));
  return <DockMenuButton label={t("Paneler")} menu={menu} />;
}

function LayoutsButton({ app }: { app: AppState }) {
  const active = activeLayout.use();
  const menu = useMenuButton(t("Layouter"), layoutItems(app, layouts.use()));
  const label = active
    ? t("Layouter · {name}", { name: t("Layout {slot}", { slot: active }) })
    : t("Layouter");
  return <DockMenuButton label={label} menu={menu} />;
}

function DockMenuButton(props: { label: string; menu: ReturnType<typeof useMenuButton> }) {
  return (
    <>
      <button className="dock-button" aria-haspopup="menu" onClick={props.menu.open}>
        {props.label} ▾
      </button>
      {props.menu.menu}
    </>
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
  return (
    <>
      <OpenPanels {...props} open={open} />
      <div className="blocks-dock">
        <PanelsButton {...props} open={open} />
        <LayoutsButton app={props.app} />
        {props.review}
      </div>
    </>
  );
}
