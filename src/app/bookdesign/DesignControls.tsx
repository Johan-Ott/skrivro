import {
  BODY_FONTS,
  BOOK_THEMES,
  HEADER_CONTENTS,
  BREAK_PICTURE,
  SCENE_BREAKS,
  THEME_FONTS,
  TRIMS,
  type BookTheme,
  type ChapterStart,
  type HeaderContent,
} from "../../export/bookDesign.js";
import type { ReactNode } from "react";
import { ChoiceRow } from "./ChoiceRow.js";
import { HeadingControls, type ControlProps } from "./HeadingControls.js";
import { OpeningList } from "./OpeningList.js";
import { PictureRow } from "./PictureRow.js";
import { TrimRow } from "./TrimRow.js";
import { FolioRows, MarginRow, SizeRows, SwitchRow } from "./LayoutRows.js";
import { t } from "../../i18n/i18n.js";

const THEME_NAMES: Record<BookTheme, string> = {
  klassisk: t("Klassisk"),
  modern: t("Modern"),
  luftig: t("Luftig"),
};

function ThemeCards({ design, save }: ControlProps) {
  return (
    <div className="design-block">
      <span className="design-label">{t("Tema")}</span>
      <div className="theme-cards" role="radiogroup" aria-label={t("Tema")}>
        {BOOK_THEMES.map((theme) => (
          <button
            key={theme}
            role="radio"
            aria-checked={design.theme === theme}
            className={`theme-card ${theme}`}
            onClick={() => save({ theme, headingFont: THEME_FONTS[theme] })}
          >
            <span className="theme-sample">Aa</span>
            {THEME_NAMES[theme]}
          </button>
        ))}
      </div>
    </div>
  );
}

const FONT_CHOICES: [string, string][] = BODY_FONTS.map((font) => [font, font]);
const START_CHOICES: [ChapterStart, string][] = [
  ["valfri", t("Där förra slutar")],
  ["hoger", t("Alltid på högersida")],
];
const HEADER_NAMES: Record<HeaderContent, string> = {
  titel: t("Bokens titel"),
  forfattare: t("Författarnamnet"),
  kapitel: t("Kapitlets titel"),
  inget: t("Inget"),
};
const HEADER_CHOICES: [string, string][] = HEADER_CONTENTS.map((kind) => [
  kind,
  HEADER_NAMES[kind],
]);

function PageRows({ design, save }: ControlProps) {
  return (
    <>
      <TrimRow trim={design.trim} trims={TRIMS} onChange={(trim) => save({ trim })} />
      <MarginRow design={design} save={save} />
      <ChoiceRow
        label={t("Kapitel börjar")}
        value={design.chapterStart}
        choices={START_CHOICES}
        onChoose={(chapterStart) => save({ chapterStart: chapterStart as ChapterStart })}
      />
      <ChoiceRow
        label={t("Sidhuvud, vänster")}
        value={design.headerLeft}
        choices={HEADER_CHOICES}
        onChoose={(headerLeft) => save({ headerLeft: headerLeft as HeaderContent })}
      />
      <ChoiceRow
        label={t("Sidhuvud, höger")}
        value={design.headerRight}
        choices={HEADER_CHOICES}
        onChoose={(headerRight) => save({ headerRight: headerRight as HeaderContent })}
      />
      <FolioRows design={design} save={save} />
    </>
  );
}

function BodyRows({ design, save }: ControlProps) {
  return (
    <>
      <ChoiceRow
        label={t("Typsnitt")}
        value={design.bodyFont}
        choices={FONT_CHOICES}
        onChoose={(bodyFont) => save({ bodyFont })}
      />
      <SizeRows design={design} save={save} />
      <SwitchRow
        label={t("Anfang vid kapitelstart")}
        isOn={design.dropCap}
        onFlip={() => save({ dropCap: !design.dropCap })}
      />
      {!design.dropCap && (
        <SwitchRow
          label={t("Första orden i kapitäler")}
          isOn={design.leadIn}
          onFlip={() => save({ leadIn: !design.leadIn })}
        />
      )}
    </>
  );
}

function SceneBreaks({ design, save, dir }: ControlProps) {
  const marks = [...SCENE_BREAKS, BREAK_PICTURE];
  return (
    <div className="design-block">
      <span className="design-label">{t("Scenbrytning")}</span>
      <div className="break-choices" role="radiogroup" aria-label={t("Scenbrytning")}>
        {marks.map((mark) => (
          <button
            key={mark}
            role="radio"
            aria-checked={design.sceneBreak === mark}
            onClick={() => save({ sceneBreak: mark })}
          >
            {mark === BREAK_PICTURE ? t("Bild") : mark}
          </button>
        ))}
      </div>
      {design.sceneBreak === BREAK_PICTURE && (
        <PictureRow
          dir={dir}
          label={t("Bild som scenbrytning")}
          name={design.breakPicture}
          onChange={(breakPicture) => save({ breakPicture })}
        />
      )}
    </div>
  );
}

// Each part folds to one line that says what it is set to, so the panel beside the book is short.
function Section(props: { label: string; value: string; children: ReactNode }) {
  return (
    <details className="design-details">
      <summary className="design-section">
        {props.label}
        <span className="design-folded">{props.value}</span>
      </summary>
      {props.children}
    </details>
  );
}

// "13 × 20 cm" without the inches; an own size in millimetres.
const trimName = (trim: string) =>
  TRIMS.find(([id]) => id === trim)?.[1].replace(/ \(.*\)$/, "") ??
  trim.replace("x", " × ") + " mm";

export function DesignControls(props: ControlProps) {
  const { design } = props;
  const opening = design.openings.find((template) => template.id === design.opening);
  return (
    <div className="design-controls">
      <ThemeCards {...props} />
      <Section label={t("Sidan")} value={trimName(design.trim)}>
        <PageRows {...props} />
      </Section>
      <Section label={t("Kapitelrubrik")} value={design.headingFont}>
        <HeadingControls {...props} />
      </Section>
      <Section label={t("Kapitelöppningar")} value={opening?.name ?? ""}>
        <OpeningList {...props} />
      </Section>
      <Section label={t("Brödtext")} value={`${design.bodyFont} · ${design.bodySize} pt`}>
        <BodyRows {...props} />
        <SceneBreaks {...props} />
      </Section>
    </div>
  );
}
