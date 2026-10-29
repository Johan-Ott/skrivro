import { WindowControls } from "@llkit/shell/WindowControls.js";
import type { Today } from "./useWritingStats.js";
import { t, formatNumber } from "../i18n/i18n.js";

interface FocusHeaderProps {
  location: string;
  wordCount: number;
  today: Today;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  onLeave: () => void;
}

function focusCount({ wordCount, today }: Pick<FocusHeaderProps, "wordCount" | "today">) {
  if (today.goal === null) return `${formatNumber(wordCount)} ord`;
  return `${formatNumber(today.words)} / ${formatNumber(today.goal)} ord`;
}

function SettingsButton({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      className="icon-button settings-button"
      aria-label={t("Skrivinställningar")}
      aria-expanded={isOpen}
      data-look-button
      onClick={onToggle}
    >
      Aa
    </button>
  );
}

export function FocusHeader(props: FocusHeaderProps) {
  return (
    <header className="focus-header" data-tauri-drag-region>
      <button className="link-button quiet" onClick={props.onLeave}>
        {t("Esc · lämna fokus")}
      </button>
      <span>{props.location}</span>
      <span className="focus-header-end">
        <span>{focusCount(props)}</span>
        <SettingsButton isOpen={props.isSettingsOpen} onToggle={props.onToggleSettings} />
        <WindowControls />
      </span>
    </header>
  );
}
