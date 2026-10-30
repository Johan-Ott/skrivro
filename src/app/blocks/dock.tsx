import { useEffect, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { createStore } from "@llkit/store.js";
import { Icon } from "../shell/icons.js";
import { t } from "../../i18n/i18n.js";
import { column, DOCKABLE, dockColumn, floating, showPanel, toggleFloating } from "./layout.js";

// The panels lie in the right column, a tab each and one in front; Lossa floats one over the
// text, Docka lays it back. The column folds away from the top bar.

/** The dockable panels there now, docked or loose; Granska only in Redigera. */
const present = createStore<string[]>([]);

const TITLES: Record<string, string> = {
  granska: t("Granska"),
  insikter: t("Insikter"),
  iscenen: t("I scenen"),
  referens: t("Referensbild"),
};

/** The column's tabs, and the one in front: the tab chosen last while it is there, else the first. */
function useColumn() {
  const loose = floating.use();
  const here = present.use();
  const { isOpen, tab } = column.use();
  const tabs = DOCKABLE.filter((id) => here.includes(id) && !loose.includes(id));
  return { isOpen, tabs, front: tabs.includes(tab) ? tab : tabs[0], loose, here };
}

/** The panel is in sight: loosened, or in front with the column out. */
export function useShown(id: string) {
  const { isOpen, front, loose, here } = useColumn();
  return here.includes(id) && (loose.includes(id) || (isOpen && front === id));
}

/** Where the panel is drawn: the column, or where it stands when it floats or `isOn` is false, as
 * on a phone. Docked out of sight, it is behind and not drawn at all. */
export function useDock(id: string, isOn: boolean) {
  const isHere = isOn && DOCKABLE.includes(id);
  useEffect(() => {
    if (!isHere) return;
    present.set([...present.get(), id]);
    return () => present.set(present.get().filter((each) => each !== id));
  }, [id, isHere]);
  const isShown = useShown(id);
  const isLoose = floating.use().includes(id);
  const element = dockColumn.use();
  if (!isHere || isLoose) return { dock: null, isBehind: false };
  return { dock: isShown ? element : null, isBehind: !isShown || !element };
}

/** Docked, the panel is drawn into the column, or nowhere when it is behind; otherwise where it
 * stands. */
export function inDock(
  place: { dock: HTMLElement | null; isBehind: boolean },
  panel: ReactElement,
) {
  if (place.isBehind) return null;
  return place.dock ? createPortal(panel, place.dock) : panel;
}

const LoosenIcon = () => (
  <Icon size={14}>
    <path d="M13 5h6v6M19 5l-7 7M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" />
  </Icon>
);

const DockIcon = () => (
  <Icon size={14}>
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="M14 5v14" />
  </Icon>
);

/** Lossa beside the column's tabs, Docka in a loose panel's head. */
export function DockButton({ id }: { id: string }) {
  const isLoose = floating.use().includes(id);
  const label = isLoose ? t("Docka panelen") : t("Lossa panelen");
  return (
    <button
      className="block-minimize"
      aria-label={label}
      title={label}
      onClick={() => toggleFloating(id)}
    >
      {isLoose ? <DockIcon /> : <LoosenIcon />}
    </button>
  );
}

/** Granska's tab says how much waits. */
function ColumnTab(props: { id: string; isFront: boolean; reviewCount: number | null }) {
  const count = props.id === "granska" ? props.reviewCount : null;
  return (
    <button
      role="tab"
      className="dock-tab"
      aria-selected={props.isFront}
      aria-label={count === null ? undefined : t("Granska · {count}", { count })}
      onClick={() => showPanel(props.id)}
    >
      {TITLES[props.id]}
      {!!count && <span className="dock-badge">{count}</span>}
    </button>
  );
}

/** The column at the card's right: a tab per docked panel, Lossa for the one in front, and that
 * panel below. Folded away, or with every panel loose, nothing. */
export function PanelColumn({ reviewCount }: { reviewCount: number | null }) {
  const { isOpen, tabs, front } = useColumn();
  if (!isOpen || front === undefined) return null;
  return (
    <aside className="panel-dock" aria-label={t("Högerspalten")}>
      <div className="panel-dock-head">
        <span className="dock-tabs" role="tablist" aria-label={t("Paneler")}>
          {tabs.map((id) => (
            <ColumnTab key={id} id={id} isFront={id === front} reviewCount={reviewCount} />
          ))}
        </span>
        <DockButton id={front} />
      </div>
      <div className="panel-dock-body" ref={dockColumn.set} />
    </aside>
  );
}
