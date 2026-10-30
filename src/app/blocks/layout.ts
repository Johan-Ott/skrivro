import { browserStorage } from "@llkit/storage/browserStorage.js";
import { createStore } from "@llkit/store.js";

// The right column beside the text, folded away or out, its panels each folded shut or open, and
// the panels the writer has loosened to float over the text, each where it was left. Per device.

export type Place = { left: number; top: number };

const PLACES_KEY = "skrivro.blocks.places";
const FLOATING_KEY = "skrivro.blocks.floating";
const COLUMN_KEY = "skrivro.column";
const MINIMIZED_KEY = "skrivro.minimized";

function read<T>(key: string, empty: T): T {
  try {
    const stored = browserStorage().getItem(key);
    return stored ? (JSON.parse(stored) as T) : empty;
  } catch {
    return empty;
  }
}

const write = (key: string, value: unknown) => browserStorage().setItem(key, JSON.stringify(value));

const toggled = (ids: string[], id: string) =>
  ids.includes(id) ? ids.filter((each) => each !== id) : [...ids, id];

export const places = createStore<Record<string, Place>>(read(PLACES_KEY, {}));

/** The column's panels, top to bottom; Granska is there only in Redigera. Mål stays under the
 * day's words. */
export const DOCKABLE = ["granska", "insikter", "iscenen", "referens"];
/** The dockable panels the writer has loosened. */
export const floating = createStore<string[]>(read(FLOATING_KEY, []));
/** The panels folded down to their head, docked or loose. */
export const minimized = createStore<string[]>(read(MINIMIZED_KEY, []));
/** The column the docked panels are drawn into, there while it is out. */
export const dockColumn = createStore<HTMLElement | null>(null);
/** The column out or folded away. Folded at first, so Redigera's margin has room beside the text. */
export const column = createStore<{ isOpen: boolean }>(read(COLUMN_KEY, { isOpen: false }));

function setFloating(ids: string[]) {
  floating.set(ids);
  write(FLOATING_KEY, ids);
}

export const toggleFloating = (id: string) => setFloating(toggled(floating.get(), id));

function setMinimized(ids: string[]) {
  minimized.set(ids);
  write(MINIMIZED_KEY, ids);
}

export const toggleMinimized = (id: string) => setMinimized(toggled(minimized.get(), id));

function setColumn(isOpen: boolean) {
  column.set({ isOpen });
  write(COLUMN_KEY, { isOpen });
}

export const toggleColumn = () => setColumn(!column.get().isOpen);

/** The panel unfolded and in sight: a docked one with the column out and scrolled to it. */
export function showPanel(id: string) {
  setMinimized(minimized.get().filter((each) => each !== id));
  if (floating.get().includes(id)) return;
  setColumn(true);
  dockColumn.get()?.querySelector(`[data-panel="${id}"]`)?.scrollIntoView({ block: "nearest" });
}

export function setPlace(id: string, place: Place) {
  places.set({ ...places.get(), [id]: place });
}

/** Kept once a drag ends, not on every step of it. */
export const keepPlaces = () => write(PLACES_KEY, places.get());
