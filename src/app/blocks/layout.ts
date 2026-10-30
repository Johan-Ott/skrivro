import { browserStorage } from "@llkit/storage/browserStorage.js";
import { createStore } from "@llkit/store.js";

// The right column beside the text, folded away or out, and its panels each folded shut or open.
// Per device.

const COLUMN_KEY = "skrivro.column";
const FOLDED_KEY = "skrivro.minimized";

function read<T>(key: string, empty: T): T {
  try {
    const stored = browserStorage().getItem(key);
    return stored ? (JSON.parse(stored) as T) : empty;
  } catch {
    return empty;
  }
}

const write = (key: string, value: unknown) => browserStorage().setItem(key, JSON.stringify(value));

/** The column's panels, top to bottom; Granska is there only in Redigera. */
export const PANELS = ["granska", "insikter", "iscenen", "referens"];
/** The panels folded down to their title. */
export const folded = createStore<string[]>(read(FOLDED_KEY, []));
/** The column the panels are drawn into, there while it is out. */
export const columnElement = createStore<HTMLElement | null>(null);
/** The column out or folded away. Folded at first, so Redigera's margin has room beside the text. */
export const column = createStore<{ isOpen: boolean }>(read(COLUMN_KEY, { isOpen: false }));

function setFolded(ids: string[]) {
  folded.set(ids);
  write(FOLDED_KEY, ids);
}

export function toggleFolded(id: string) {
  const ids = folded.get();
  setFolded(ids.includes(id) ? ids.filter((each) => each !== id) : [...ids, id]);
}

function setColumn(isOpen: boolean) {
  column.set({ isOpen });
  write(COLUMN_KEY, { isOpen });
}

export const toggleColumn = () => setColumn(!column.get().isOpen);

/** The panel unfolded, with the column out and scrolled to it. */
export function showPanel(id: string) {
  setFolded(folded.get().filter((each) => each !== id));
  setColumn(true);
  columnElement.get()?.querySelector(`[data-panel="${id}"]`)?.scrollIntoView({ block: "nearest" });
}
