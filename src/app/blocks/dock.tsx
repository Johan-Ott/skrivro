import { useEffect, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { createStore } from "@llkit/store.js";
import { usePhone } from "../phone/usePhone.js";
import { Icon } from "../shell/icons.js";
import { t } from "../../i18n/i18n.js";
import { DOCKABLE, dockColumn, floating, toggleFloating } from "./layout.js";

// The panels open docked at the card's right; Lossa floats one, Docka lays it back. Granska and
// Insikter docked together share one tab row, the one opened last in front.

const TABBED = ["granska", "insikter"];
/** The tabbed panels lying docked now, the one in front last. */
const docked = createStore<string[]>([]);
const toFront = (id: string) => docked.set([...docked.get().filter((each) => each !== id), id]);

/** The column the panel is drawn into, or null when it floats; never with `isOn` false. Behind
 * the other tab, it is not drawn at all. */
export function useDock(id: string, isOn: boolean) {
  const isLoose = floating.use().includes(id);
  const column = dockColumn.use();
  const dock = isOn && DOCKABLE.includes(id) && !isLoose ? column : null;
  const isTabbed = dock !== null && TABBED.includes(id);
  useEffect(() => {
    if (!isTabbed) return;
    toFront(id);
    return () => docked.set(docked.get().filter((each) => each !== id));
  }, [id, isTabbed]);
  const front = docked.use().at(-1) ?? id;
  return { dock, isBehind: isTabbed && front !== id };
}

/** Docked, the panel is drawn into the column, or nowhere behind the other tab; otherwise where
 * it stands. */
export function inDock(
  place: { dock: HTMLElement | null; isBehind: boolean },
  panel: ReactElement,
) {
  if (place.isBehind) return null;
  return place.dock ? createPortal(panel, place.dock) : panel;
}

/** The head's title; with Granska and Insikter both docked, the tab row between them instead. */
export function DockTitle({ title }: { title: string }) {
  const tabs = docked.use();
  if (tabs.length < 2) return <>{title}</>;
  const titles: Record<string, string> = { granska: t("Granska"), insikter: t("Insikter") };
  return (
    <span className="dock-tabs" role="tablist" aria-label={t("Paneler")}>
      {TABBED.map((id) => (
        <button
          key={id}
          role="tab"
          className="dock-tab"
          aria-selected={id === tabs.at(-1)}
          onClick={() => toFront(id)}
        >
          {titles[id]}
        </button>
      ))}
    </span>
  );
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

/** In the head beside Minimera; none on a phone, where a panel is a screen of its own. */
export function DockButton({ id }: { id: string }) {
  const isLoose = floating.use().includes(id);
  const isPhone = usePhone();
  if (isPhone || !DOCKABLE.includes(id)) return null;
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
