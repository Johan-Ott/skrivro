import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useEscape } from "@llkit/keys.js";
import { useRootClass } from "@llkit/useRootClass.js";
import {
  changeSize,
  nextLineHeight,
  nextWidth,
  type FocusMode,
  type ProseFont,
  type WritingSettings,
} from "../editor/writingSettings.js";
import { Segmented, Toggle, ValueRow } from "./settingControls.js";
import type { SettingsChange } from "./useWritingSettings.js";
import { t } from "../i18n/i18n.js";

type Switch = "typewriter" | "indent" | "showPages";

const changeTo =
  (changes: Partial<WritingSettings>): SettingsChange =>
  (current) => ({ ...current, ...changes });
const toggle =
  (key: Switch): SettingsChange =>
  (current) => ({ ...current, [key]: !current[key] });
const cycleLineHeight: SettingsChange = (current) => ({
  ...current,
  lineHeight: nextLineHeight(current.lineHeight),
});
const cycleWidth: SettingsChange = (current) => ({ ...current, width: nextWidth(current.width) });

interface PanelProps {
  settings: WritingSettings;
  onChange: (change: SettingsChange) => void;
  /** Focus and typewriter only act in the focus mode, so they are shown only there. */
  showsFocusOptions: boolean;
  /** On a phone, which has no shortcut or topbar button for it, the focus mode is a switch here. */
  focusMode?: { isOn: boolean; onFlip: () => void };
  /** Escape closes it, as Android's back does through Escape. */
  onClose?: () => void;
}

const WIDTH_LABELS = { smal: t("Smal"), normal: t("Normal"), bred: t("Bred") } as const;

function SizeStepper({ settings, onChange }: Pick<PanelProps, "settings" | "onChange">) {
  return (
    <div className="setting-row">
      <span>{t("Storlek")}</span>
      <span className="stepper">
        <button
          aria-label={t("Mindre")}
          onClick={() => onChange((current) => changeSize(current, -1))}
        >
          –
        </button>
        <span>{settings.size}</span>
        <button
          aria-label={t("Större")}
          onClick={() => onChange((current) => changeSize(current, 1))}
        >
          +
        </button>
      </span>
    </div>
  );
}

function TypographySettings({ settings, onChange }: PanelProps) {
  const set = (changes: Partial<WritingSettings>) => onChange(changeTo(changes));
  const fonts: [ProseFont, string][] = [
    ["serif", "Serif"],
    ["sans", "Sans"],
    ["mono", "Mono"],
  ];
  return (
    <>
      <Segmented
        label={t("Typsnitt")}
        value={settings.font}
        options={fonts}
        onSelect={(font) => set({ font })}
      />
      <SizeStepper settings={settings} onChange={onChange} />
      <ValueRow
        label={t("Radavstånd")}
        value={String(settings.lineHeight).replace(".", ",")}
        onNext={() => onChange(cycleLineHeight)}
      />
      <ValueRow
        label={t("Textbredd")}
        value={WIDTH_LABELS[settings.width]}
        onNext={() => onChange(cycleWidth)}
      />
    </>
  );
}

function FocusSettings({ settings, onChange }: PanelProps) {
  const set = (changes: Partial<WritingSettings>) => onChange(changeTo(changes));
  const modes: [FocusMode, string][] = [
    ["av", t("Av")],
    ["mening", t("Mening")],
    ["stycke", t("Stycke")],
  ];
  return (
    <>
      <Segmented
        label={t("Fokus")}
        value={settings.focus}
        options={modes}
        onSelect={(focus) => set({ focus })}
      />
      <Toggle
        label={t("Skrivraden mitt på skärmen")}
        hint={t("Raden du skriver stannar mitt på skärmen")}
        isOn={settings.typewriter}
        onFlip={() => onChange(toggle("typewriter"))}
      />
    </>
  );
}

function FocusSwitch({ focusMode }: { focusMode: PanelProps["focusMode"] | undefined }) {
  if (!focusMode) return null;
  const hint = t("Bara stycket eller meningen du skriver syns tydligt");
  return <Toggle label={t("Fokusläge")} hint={hint} {...focusMode} />;
}

function PageSettings({ settings, onChange }: PanelProps) {
  return (
    <>
      <Toggle
        label={t("Indrag första rad")}
        hint={t("Bokstil: inget indrag efter rubrik")}
        isOn={settings.indent}
        onFlip={() => onChange(toggle("indent"))}
      />
      <Toggle
        label={t("Sidbrytningar")}
        hint={t("Var den tryckta bokens sidor börjar")}
        isOn={settings.showPages}
        onFlip={() => onChange(toggle("showPages"))}
      />
    </>
  );
}

// On a computer the panel hangs under the Aa that opened it, and a click outside closes it.
// A phone marks no Aa, so there the panel keeps its place above the toolbar.
function useUnderLookButton(panel: RefObject<HTMLElement | null>, onClose?: () => void) {
  const [place, setPlace] = useState<CSSProperties>();
  useLayoutEffect(() => {
    const buttons = document.querySelectorAll<HTMLElement>("[data-look-button]");
    const button = Array.from(buttons).find((candidate) => candidate.offsetWidth > 0);
    if (!button) return;
    const fit = () => {
      const box = button.getBoundingClientRect();
      const right = Math.max(8, window.innerWidth - box.right);
      setPlace({ position: "fixed", top: box.bottom + 8, right });
    };
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !button.contains(target)) onClose?.();
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("pointerdown", closeOutside);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("pointerdown", closeOutside);
    };
  }, [panel, onClose]);
  return place;
}

export function WritingSettingsPanel(props: PanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const place = useUnderLookButton(ref, props.onClose);
  useRootClass("look-shown");
  useEscape(() => props.onClose?.());
  return (
    <div
      ref={ref}
      className="settings-panel"
      style={place}
      role="dialog"
      aria-label={t("Skrivinställningar")}
    >
      <button
        className="icon-button settings-close"
        aria-label={t("Stäng")}
        onClick={props.onClose}
      >
        ×
      </button>
      <TypographySettings {...props} />
      <div className="settings-divider" />
      <FocusSwitch focusMode={props.focusMode} />
      {props.showsFocusOptions && <FocusSettings {...props} />}
      <PageSettings {...props} />
    </div>
  );
}
