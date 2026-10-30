import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { usePhone } from "../phone/usePhone.js";
import { Icon } from "../shell/icons.js";
import { t } from "../../i18n/i18n.js";
import { DOCKABLE, dockColumn, floating, toggleFloating } from "./layout.js";

// Granska, Insikter and the dock's blocks open docked in the column at the card's right, taking
// room from the text; Lossa lets one float over it, Docka lays it back.

/** The column the panel is drawn into, or null when it floats; never with `isOn` false. */
export function useDock(id: string, isOn: boolean) {
  const isLoose = floating.use().includes(id);
  const column = dockColumn.use();
  return isOn && DOCKABLE.includes(id) && !isLoose ? column : null;
}

/** Docked, the panel is drawn into the column; otherwise where it stands. */
export const inDock = (dock: HTMLElement | null, panel: ReactElement) =>
  dock ? createPortal(panel, dock) : panel;

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
