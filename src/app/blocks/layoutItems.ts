import type { AppState } from "../App.js";
import type { MenuItem } from "@llkit/Menu.js";
import {
  activeLayout,
  applyLayoutPlaces,
  LAYOUT_SLOTS,
  openBlocks,
  saveLayout,
  type Layout,
} from "./layout.js";
import { t } from "../../i18n/i18n.js";

// A layout holds which panels are open, Granska and Insikter among them, and where
// each lies; choosing one opens and closes them to match.

const GRANSKA = "granska";
const INSIKTER = "insikter";
// A layout saved while the sprint existed may still hold it, and is read without it.
const SPRINT = "sprint";

function openNow(app: AppState) {
  const { isReviewOpen, isProgressOpen } = app.writingMode;
  return [
    ...openBlocks.get(),
    ...(isReviewOpen ? [GRANSKA] : []),
    ...(isProgressOpen ? [INSIKTER] : []),
  ];
}

function apply(app: AppState, slot: number, layout: Layout) {
  applyLayoutPlaces(layout);
  activeLayout.set(slot);
  const isOpen = (id: string) => layout.open.includes(id);
  openBlocks.set(layout.open.filter((id) => ![GRANSKA, INSIKTER, SPRINT].includes(id)));
  app.writingMode.setReviewOpen(isOpen(GRANSKA));
  app.writingMode.setProgressOpen(isOpen(INSIKTER));
}

const name = (slot: number) => t("Layout {slot}", { slot });

// The saved layouts to choose, then a row to save in each place.
export function layoutItems(app: AppState, saved: Record<number, Layout>) {
  const choices: MenuItem[] = LAYOUT_SLOTS.filter((slot) => saved[slot]).map((slot) => ({
    label: name(slot),
    isChecked: activeLayout.get() === slot,
    onSelect: () => apply(app, slot, saved[slot] as Layout),
  }));
  const saving: MenuItem[] = LAYOUT_SLOTS.map((slot, index) => ({
    label: t("Spara som layout {slot}", { slot }),
    separatorBefore: index === 0 && choices.length > 0,
    onSelect: () => saveLayout(slot, openNow(app)),
  }));
  return [...choices, ...saving];
}
