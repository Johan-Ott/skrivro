import { useState } from "react";
import { usePhone } from "../phone/usePhone.js";
import { useCommandKey } from "../shortcuts.js";
import { paletteEntries, type PaletteContext } from "./paletteEntries.js";

export function usePalette(context: PaletteContext | null) {
  const [isOpen, setOpen] = useState(false);
  // A phone has no folders to pick, and the desktop suggests in Redigera, not in Förslagsläge.
  const isPhone = usePhone();
  useCommandKey("palette", () => setOpen((current) => !current));
  const entriesNow = () =>
    context
      ? paletteEntries({
          ...context,
          ...(isPhone ? { chooseFolder: null } : { toggleSuggesting: null }),
        })
      : [];
  return {
    isOpen: isOpen && context !== null,
    // Made only while open: a long book has hundreds of entries, and the app draws on every key.
    entries: isOpen ? entriesNow() : [],
    /** The entries as they are now, for window.skrivro; made only when asked for. */
    entriesNow,
    open: () => setOpen(true),
    close: () => setOpen(false),
  };
}
