import logo from "../../assets/skrivro-logo.png";
import { LookButton } from "../settingsPanel.js";
import { RemoteBadge } from "../settings/RemoteControlRow.js";
import { WindowControls } from "@llkit/shell/WindowControls.js";
import { DayProgress } from "./DayProgress.js";
import { TopbarMore } from "./TopbarMore.js";
import type { MouseEvent, ReactNode } from "react";
import type { Today } from "../useWritingStats.js";
import type { Step, View } from "../useWritingMode.js";
import { IconButton, PaletteButton } from "./IconButton.js";
import { t } from "../../i18n/i18n.js";
import { toggleColumn } from "../blocks/layout.js";
import {
  BackIcon,
  ColumnIcon,
  FocusIcon,
  ForwardIcon,
  MenuIcon,
  ReadIcon,
  SidebarIcon,
} from "./icons.js";

export interface TopbarProps {
  view: View;
  /** Shown instead of the day's words, as in Publicera. */
  title: string | null;
  today: Today;
  navigation: { canGoBack: boolean; canGoForward: boolean; back: () => void; forward: () => void };
  onMenu: (event: MouseEvent<HTMLElement>) => void;
  /** The logo's menu: Skrivro itself, its settings and help. */
  onProgramMenu: (event: MouseEvent<HTMLElement>) => void;
  onToggleSidebar: () => void;
  step: Step;
  onStep: (step: Step) => void;
  /** Comments and an editor's changes that wait in Redigera. */
  waiting: number;
  onProgress: () => void;
  onSearch: () => void;
  onFocus: () => void;
  onRead: () => void;
  /** The writer's picture, after Skriv and Publicera. */
  profile: ReactNode;
}

// The logo, leftmost, opens Skrivro's own menu; the one beside it holds the books.
const BrandMenu = ({ onOpen }: { onOpen: (event: MouseEvent<HTMLElement>) => void }) => (
  <button className="brand-button" aria-label={t("Skrivro")} title={t("Skrivro")} onClick={onOpen}>
    <img className="brand-mark" src={logo} alt="" />
  </button>
);

const STEPS: [Step, string, string][] = [
  ["skriv", t("Skriv"), t("Få ner texten, utan röda streck och kommentarer.")],
  ["redigera", t("Redigera"), t("Läs, föreslå och svara på kommentarer, med allt i marginalen.")],
  ["publicera", t("Publicera"), t("Gör boken: hur den ser ut, e-bok och tryck.")],
];

// The writing's three steps in order, so the way from text to book is seen.
function ModeSwitch({ step, onStep, waiting }: Pick<TopbarProps, "step" | "onStep" | "waiting">) {
  return (
    <div className="mode-switch" role="tablist" aria-label={t("Steg")}>
      {STEPS.map(([each, label, hint]) => (
        <button
          key={each}
          role="tab"
          aria-selected={each === step}
          className={each === step ? "mode chosen" : "mode"}
          title={hint}
          onClick={() => onStep(each)}
        >
          {label}
          {each === "redigera" && step !== "redigera" && waiting > 0 && (
            <span className="mode-badge">{waiting}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function ShelfTopbar(
  props: Pick<TopbarProps, "title" | "onMenu" | "onProgramMenu" | "profile">,
) {
  return (
    <header className="topbar" data-tauri-drag-region>
      <div className="topbar-start" data-tauri-drag-region>
        <BrandMenu onOpen={props.onProgramMenu} />
        <IconButton label={t("Meny")} onClick={props.onMenu}>
          <MenuIcon />
        </IconButton>
        {props.profile}
      </div>
      <span className="topbar-title" data-tauri-drag-region>
        {props.title}
      </span>
      <div className="topbar-end" data-tauri-drag-region>
        <WindowControls />
      </div>
    </header>
  );
}

const History = ({ navigation }: Pick<TopbarProps, "navigation">) => (
  <span className="topbar-history">
    <IconButton label={t("Bakåt")} onClick={navigation.back} isDisabled={!navigation.canGoBack}>
      <BackIcon />
    </IconButton>
    <IconButton
      label={t("Framåt")}
      onClick={navigation.forward}
      isDisabled={!navigation.canGoForward}
    >
      <ForwardIcon />
    </IconButton>
  </span>
);

function TopbarStart(props: TopbarProps) {
  const { navigation } = props;
  return (
    <div className="topbar-start" data-tauri-drag-region>
      <BrandMenu onOpen={props.onProgramMenu} />
      <IconButton label={t("Meny")} onClick={props.onMenu}>
        <MenuIcon />
      </IconButton>
      <IconButton
        label={t("Visa eller dölj sidomenyn")}
        className="sidebar-toggle"
        onClick={props.onToggleSidebar}
      >
        <SidebarIcon />
      </IconButton>
      <History navigation={navigation} />
      <ModeSwitch step={props.step} onStep={props.onStep} waiting={props.waiting} />
      {props.profile}
    </div>
  );
}

/** The sidebar toggle's mirror, for the right column. */
const ColumnToggle = () => (
  <IconButton
    label={t("Visa eller dölj högerspalten")}
    className="column-toggle"
    onClick={toggleColumn}
  >
    <ColumnIcon />
  </IconButton>
);

function TopbarEnd(props: TopbarProps) {
  return (
    <div className="topbar-end" data-tauri-drag-region>
      <RemoteBadge />
      {props.view === "skriv" && <LookButton />}
      <IconButton
        label={t("Läs som bok")}
        shortcut="read"
        className="with-key"
        onClick={props.onRead}
      >
        <ReadIcon />
      </IconButton>
      <PaletteButton onSearch={props.onSearch} />
      <IconButton
        label={t("Fokusläge")}
        shortcut="focus"
        className="with-key"
        onClick={props.onFocus}
      >
        <FocusIcon />
      </IconButton>
      <TopbarMore {...props} />
      {props.view === "skriv" && <ColumnToggle />}
      <WindowControls />
    </div>
  );
}

export function Topbar(props: TopbarProps) {
  return (
    <header className="topbar" data-tauri-drag-region>
      <TopbarStart {...props} />
      {props.title === null ? (
        <span className="topbar-day" data-tauri-drag-region>
          <DayProgress today={props.today} onProgress={props.onProgress} />
        </span>
      ) : (
        <span className="topbar-title" data-tauri-drag-region>
          {props.title}
        </span>
      )}
      <TopbarEnd {...props} />
    </header>
  );
}
