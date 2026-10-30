import { browserStorage } from "@llkit/storage/browserStorage.js";
import { createStore } from "@llkit/store.js";

// Where each panel lies and which are open, and up to three layouts of both to go back to:
// one to write in, one to revise in, as the writer likes.

export type Place = { left: number; top: number };
export type Layout = { open: string[]; places: Record<string, Place>; floating?: string[] };

const PLACES_KEY = "skrivro.blocks.places";
const LAYOUTS_KEY = "skrivro.blocks.layouts";
const FLOATING_KEY = "skrivro.blocks.floating";
export const LAYOUT_SLOTS = [1, 2, 3];

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
/** The blocks of the dock that are open; Granska and Insikter keep their own. */
export const openBlocks = createStore<string[]>([]);
export const layouts = createStore<Record<number, Layout>>(read(LAYOUTS_KEY, {}));
/** The layout last chosen or saved, shown on the dock's icon. */
export const activeLayout = createStore<number | null>(null);

/** These lie docked in a column at the card's right unless the writer loosens them to float;
 * Mål stays under the day's words. */
export const DOCKABLE = ["granska", "insikter", "iscenen", "referens"];
/** The dockable panels the writer has loosened. */
export const floating = createStore<string[]>(read(FLOATING_KEY, []));
/** The column the docked panels are drawn into, there once the card is. */
export const dockColumn = createStore<HTMLElement | null>(null);

function setFloating(ids: string[]) {
  floating.set(ids);
  write(FLOATING_KEY, ids);
}

export function toggleFloating(id: string) {
  const now = floating.get();
  setFloating(now.includes(id) ? now.filter((each) => each !== id) : [...now, id]);
}

export function setPlace(id: string, place: Place) {
  places.set({ ...places.get(), [id]: place });
}

/** Kept once a drag ends, not on every step of it. */
export const keepPlaces = () => write(PLACES_KEY, places.get());

export function toggleBlock(id: string) {
  const open = openBlocks.get();
  openBlocks.set(open.includes(id) ? open.filter((each) => each !== id) : [...open, id]);
}

export function saveLayout(slot: number, open: string[]) {
  const next = {
    ...layouts.get(),
    [slot]: { open, places: places.get(), floating: floating.get() },
  };
  layouts.set(next);
  write(LAYOUTS_KEY, next);
  activeLayout.set(slot);
}

/** The layout's places are set, docked or loosened; the caller opens and closes what it holds.
 * A layout saved before docking leaves the panels docked or loose as they are. */
export function applyLayoutPlaces(layout: Layout) {
  places.set({ ...places.get(), ...layout.places });
  keepPlaces();
  if (layout.floating) setFloating(layout.floating);
}
