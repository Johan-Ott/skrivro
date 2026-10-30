import {
  BODY_SIZES,
  type FolioPlace,
  type Leading,
  type MarginSize,
} from "../../export/bookDesign.js";
import { Switch } from "@llkit/controls.js";
import { ChoiceRow } from "./ChoiceRow.js";
import type { ControlProps } from "./HeadingControls.js";
import { t } from "../../i18n/i18n.js";

type RowProps = Pick<ControlProps, "design" | "save">;

/** Smala and Breda scale the theme's own margins; more room fits fewer words on a page. */
export function MarginRow({ design, save }: RowProps) {
  const choices: [MarginSize, string][] = [
    ["smala", t("Smala")],
    ["normala", t("Normala")],
    ["breda", t("Breda")],
  ];
  return (
    <ChoiceRow
      label={t("Marginaler")}
      value={design.margins}
      choices={choices}
      onChoose={(margins) => save({ margins: margins as MarginSize })}
    />
  );
}

export const points = (size: number) => `${String(size).replace(".", ",")} pt`;

const LARGE_PRINT = 14;
const sizeLabel = (size: number) =>
  size >= LARGE_PRINT ? t("{size}, storstil", { size: points(size) }) : points(size);

/** The body text's size, with large print from 14 points, and the space between its lines. */
export function SizeRows({ design, save }: RowProps) {
  const leadings: [Leading, string][] = [
    ["tatt", t("Tätt")],
    ["normalt", t("Normalt")],
    ["luftigt", t("Luftigt")],
  ];
  return (
    <>
      <ChoiceRow
        label={t("Storlek")}
        value={String(design.bodySize)}
        choices={BODY_SIZES.map((size) => [String(size), sizeLabel(size)])}
        onChoose={(size) => save({ bodySize: Number(size) })}
      />
      <ChoiceRow
        label={t("Radavstånd")}
        value={design.leading}
        choices={leadings}
        onChoose={(leading) => save({ leading: leading as Leading })}
      />
    </>
  );
}

export function SwitchRow(props: { label: string; isOn: boolean; onFlip: () => void }) {
  return (
    <div className="design-row">
      <span>{props.label}</span>
      <Switch {...props} />
    </div>
  );
}

/** Where the page number stands, and whether a chapter's first page has one. */
export function FolioRows({ design, save }: RowProps) {
  const places: [FolioPlace, string][] = [
    ["mitten", t("Nederst i mitten")],
    ["ytterhorn", t("Nederst i yttre hörnet")],
    ["overst", t("Överst i yttre hörnet")],
  ];
  return (
    <>
      <ChoiceRow
        label={t("Sidnummer")}
        value={design.folio}
        choices={places}
        onChoose={(folio) => save({ folio: folio as FolioPlace })}
      />
      <SwitchRow
        label={t("Nummer på kapitlets första sida")}
        isOn={design.openingFolio}
        onFlip={() => save({ openingFolio: !design.openingFolio })}
      />
    </>
  );
}
