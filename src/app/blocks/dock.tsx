import { useEffect, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { createStore } from "@llkit/store.js";
import { usePhone } from "../phone/usePhone.js";
import { GripIcon, Icon } from "../shell/icons.js";
import { t } from "../../i18n/i18n.js";
import {
  column,
  DOCKABLE,
  dockColumn,
  floating,
  minimized,
  toggleFloating,
  toggleMinimized,
} from "./layout.js";

// The panels lie in the right column as sections, one under the other, each folded from its title.
// Lossa floats one over the text, Docka lays it back. The column folds away from the top bar.

/** The dockable panels there now, docked or loose; Granska only in Redigera. */
const present = createStore<string[]>([]);

/** The panel is in sight: loosened, or docked with the column out. */
export function useShown(id: string) {
  const isHere = present.use().includes(id);
  const isLoose = floating.use().includes(id);
  const { isOpen } = column.use();
  return isHere && (isLoose || isOpen);
}

/** The panel lies in the column, not loose; on a phone no panel docks. */
export function useDocked(id: string) {
  const isLoose = floating.use().includes(id);
  return !usePhone() && DOCKABLE.includes(id) && !isLoose;
}

/** Where the panel is drawn: its place in the column, or where it stands when it floats or `isOn`
 * is false, as on a phone. Docked with the column folded, it is behind and not drawn at all. */
export function useDock(id: string, isOn: boolean) {
  const isHere = isOn && DOCKABLE.includes(id);
  useEffect(() => {
    if (!isHere) return;
    present.set([...present.get(), id]);
    return () => present.set(present.get().filter((each) => each !== id));
  }, [id, isHere]);
  const isShown = useShown(id);
  const isLoose = floating.use().includes(id);
  const place = dockColumn.use()?.querySelector<HTMLElement>(`[data-panel="${id}"]`) ?? null;
  if (!isHere || isLoose) return { dock: null, isBehind: false };
  return { dock: isShown ? place : null, isBehind: !isShown || !place };
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

/** Lossa in a docked panel's head, Docka in a loose one's. */
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

const FoldIcon = () => (
  <Icon size={14}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);

/** A panel's title, a grip to drag it by while it is loose. Docked, the title folds the section
 * shut and open. Granska's count says how much waits. */
export function BlockTitle(props: { id: string; title: string; count?: number }) {
  const isDocked = useDocked(props.id);
  const isFolded = minimized.use().includes(props.id);
  const inside = (
    <>
      {isDocked ? <FoldIcon /> : <GripIcon />}
      {props.title}
      {!!props.count && <span className="dock-badge">{props.count}</span>}
    </>
  );
  if (!isDocked) return <span className="block-title">{inside}</span>;
  return (
    <button
      className="block-title block-fold"
      aria-expanded={!isFolded}
      aria-label={props.count ? `${props.title} · ${props.count}` : undefined}
      onClick={() => toggleMinimized(props.id)}
    >
      {inside}
    </button>
  );
}

/** The column at the card's right: a place per panel in DOCKABLE's order, which the docked panels
 * are drawn into. Folded away, or with every panel loose, nothing. */
export function PanelColumn() {
  const here = present.use();
  const loose = floating.use();
  const { isOpen } = column.use();
  if (!isOpen || here.every((id) => loose.includes(id))) return null;
  return (
    <aside className="panel-dock" aria-label={t("Högerspalten")} ref={dockColumn.set}>
      {DOCKABLE.map((id) => (
        <div key={id} data-panel={id} />
      ))}
    </aside>
  );
}
