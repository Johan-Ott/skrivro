import { t } from "../i18n/i18n.js";
import { createStore } from "@llkit/store.js";

// Whether the text's look (Aa) is open: the top bar opens it, the writing area shows it.
const isOpen = createStore(false);
export const setSettingsOpen = isOpen.set;
export const closeSettings = () => isOpen.set(false);

export function usePanels() {
  return { isSettingsOpen: isOpen.use(), setSettingsOpen };
}

// Aa: the text's font, size and spacing, as in focus mode.
export function LookButton() {
  const { isSettingsOpen } = usePanels();
  return (
    <button
      className="topbar-button topbar-look"
      aria-label={t("Skrivinställningar")}
      title={t("Skrivinställningar")}
      aria-expanded={isSettingsOpen}
      data-look-button
      onClick={() => setSettingsOpen(!isSettingsOpen)}
    >
      Aa
    </button>
  );
}
