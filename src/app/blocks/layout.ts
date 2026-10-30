import { browserStorage } from "@llkit/storage/browserStorage.js";
import { createStore } from "@llkit/store.js";

// The right column beside the text, folded away or out with one panel in front, and the panels
// the writer has loosened to float over the text, each where it was left. Kept per device.

export type Place = { left: number; top: number };

const PLACES_KEY = "skrivro.blocks.places";
const FLOATING_KEY = "skrivro.blocks.floating";
const COLUMN_KEY = "skrivro.column";

function read<T>(key: string, empty: T): T {
  try {
    const stored = browserStorage().getItem(key);
    return stored ? (JSON.parse(stored) as T) : empty;
  } catch {
    return empty;
  }
}

const write = (key: string, value: unknown) => browserStorage().setItem(key, JSON.stringify(value));

export const places = createStore<Record<string, Place>>(read(PLACES_KEY, {}));

/** The column's panels in the order of its tabs; Granska is there only in Redigera. Mål stays
 * under the day's words. */
export const DOCKABLE = ["granska", "insikter", "iscenen", "referens"];
/** The dockable panels the writer has loosened. */
export const floating = createStore<string[]>(read(FLOATING_KEY, []));
/** Where the docked panel in front is drawn, there while the column is out. */
export const dockColumn = createStore<HTMLElement | null>(null);
/** The column out or folded away, and the tab chosen last. Folded at first, so Redigera's
 * margin has room beside the text. */
export const column = createStore<{ isOpen: boolean; tab: string }>(
  read(COLUMN_KEY, { isOpen: false, tab: "insikter" }),
);

function setFloating(ids: string[]) {
  floating.set(ids);
  write(FLOATING_KEY, ids);
}

export function toggleFloating(id: string) {
  const now = floating.get();
  setFloating(now.includes(id) ? now.filter((each) => each !== id) : [...now, id]);
}

function setColumn(next: { isOpen: boolean; tab: string }) {
  column.set(next);
  write(COLUMN_KEY, next);
}

export const toggleColumn = () => setColumn({ ...column.get(), isOpen: !column.get().isOpen });

/** The panel in front, with the column out; a loosened one is already in sight. */
export function showPanel(id: string) {
  if (!floating.get().includes(id)) setColumn({ isOpen: true, tab: id });
}

export function setPlace(id: string, place: Place) {
  places.set({ ...places.get(), [id]: place });
}

/** Kept once a drag ends, not on every step of it. */
export const keepPlaces = () => write(PLACES_KEY, places.get());
