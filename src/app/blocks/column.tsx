import { useEffect, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseButton } from "@llkit/controls.js";
import { createStore } from "@llkit/store.js";
import { usePhone } from "../phone/usePhone.js";
import { Icon } from "../shell/icons.js";
import { t } from "../../i18n/i18n.js";
import { column, columnElement, folded, PANELS, toggleFolded } from "./layout.js";

// The panels lie in the right column as sections, one under the other, each folded from its title.
// The column folds away from the top bar. A phone has no column: there a panel covers the screen.

/** The column's panels there now; Granska only in Redigera. */
const present = createStore<string[]>([]);

/** The panel is in sight: there, with the column out. */
export function useShown(id: string) {
  const isHere = present.use().includes(id);
  const { isOpen } = column.use();
  return isHere && isOpen;
}

/** The panel's section in the column. Off, as on a phone, the panel stands where it is drawn;
 * with the column folded away it is behind and not drawn at all. */
export function useColumnPlace(id: string, isOn: boolean) {
  useEffect(() => {
    if (!isOn) return;
    present.set([...present.get(), id]);
    return () => present.set(present.get().filter((each) => each !== id));
  }, [id, isOn]);
  const isShown = useShown(id);
  const isFolded = folded.use().includes(id) && isOn;
  const section = columnElement.use()?.querySelector<HTMLElement>(`[data-panel="${id}"]`) ?? null;
  const foldedClass = isFolded ? " folded" : "";
  if (!isOn) return { section: null, isBehind: false, folded: foldedClass };
  return { section: isShown ? section : null, isBehind: !isShown || !section, folded: foldedClass };
}

/** Drawn into its section, nowhere while it is behind, or else where it stands. */
export function inColumn(
  place: { section: HTMLElement | null; isBehind: boolean },
  panel: ReactElement,
) {
  if (place.isBehind) return null;
  return place.section ? createPortal(panel, place.section) : panel;
}

const FoldIcon = () => (
  <Icon size={14}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);

/** A panel's title, which folds its section shut and open; on a phone only the title. Granska's
 * count says how much waits. */
export function BlockTitle(props: { id: string; title: string; count?: number }) {
  const isPhone = usePhone();
  const isFolded = folded.use().includes(props.id);
  const badge = !!props.count && <span className="dock-badge">{props.count}</span>;
  if (isPhone)
    return (
      <span className="block-title">
        {props.title}
        {badge}
      </span>
    );
  return (
    <button
      className="block-title block-fold"
      aria-expanded={!isFolded}
      aria-label={props.count ? `${props.title} · ${props.count}` : undefined}
      onClick={() => toggleFolded(props.id)}
    >
      <FoldIcon />
      {props.title}
      {badge}
    </button>
  );
}

/** × on a phone, where a panel covers the screen; in the column a panel folds instead. */
export function PhoneClose(props: { label?: string; onClose?: (() => void) | undefined }) {
  const isPhone = usePhone();
  if (!isPhone || !props.onClose) return null;
  return (
    <span className="block-head-buttons">
      <CloseButton label={props.label} isPhoneBack onClose={props.onClose} />
    </span>
  );
}

/** A section of the column with a title of its own. */
export function BlockPanel(props: { id: string; title: string; children: ReactNode }) {
  const place = useColumnPlace(props.id, true);
  return inColumn(
    place,
    <section className={"block-panel" + place.folded} aria-label={props.title}>
      <header className="block-head">
        <BlockTitle id={props.id} title={props.title} />
      </header>
      {props.children}
    </section>,
  );
}

/** The column at the card's right: a section per panel in PANELS' order, which the panels are
 * drawn into. Folded away, nothing. */
export function PanelColumn() {
  const { isOpen } = column.use();
  if (!isOpen) return null;
  return (
    <aside className="panel-dock" aria-label={t("Högerspalten")} ref={columnElement.set}>
      {PANELS.map((id) => (
        <div key={id} data-panel={id} />
      ))}
    </aside>
  );
}
