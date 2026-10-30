import { useState } from "react";
import { Dialog, DoneButton, Dropdown, Row, Switch } from "@llkit/controls.js";
import { designOf } from "../export/bookDesign.js";
import { fontStack } from "../export/fonts.js";
import {
  defaultLook,
  LOOK_FONTS,
  LOOK_SIZES,
  lookPoints,
  type StyleLook,
  type StyleLooks,
} from "../export/styleLooks.js";
import { STYLE_LABELS, STYLE_ORDER } from "../editor/commands.js";
import type { StyleName } from "../manuscript/schema.js";
import { points } from "./bookdesign/LayoutRows.js";
import { t } from "../i18n/i18n.js";

/** The book's styles as the style menu shows them and the Stilar dialog changes them. */
export interface BookStyles {
  looks: StyleLooks;
  bodyFont: string;
  bodySize: number;
  onLook: (name: StyleName, look: StyleLook) => void;
}

export function bookStyles(
  fields: Record<string, unknown>,
  saveFields: (fields: Record<string, unknown>) => void,
): BookStyles {
  const design = designOf(fields);
  return {
    looks: design.looks,
    bodyFont: design.bodyFont,
    bodySize: design.bodySize,
    onLook: (name, look) =>
      saveFields({ design: { ...design, looks: { ...design.looks, [name]: look } } }),
  };
}

const NAMES = STYLE_ORDER.filter((choice): choice is StyleName => choice !== "brodtext");

function StyleList(props: { name: StyleName; onPick: (name: StyleName) => void }) {
  return (
    <div className="style-list" role="radiogroup" aria-label={t("Stilar")}>
      {NAMES.map((name) => (
        <button
          key={name}
          role="radio"
          aria-checked={name === props.name}
          className={`look-${name}`}
          onClick={() => props.onPick(name)}
        >
          {STYLE_LABELS[name]}
        </button>
      ))}
    </div>
  );
}

type LookProps = { look: StyleLook; bodySize: number; onChange: (look: StyleLook) => void };

function TypeRows({ look, bodySize, onChange }: LookProps) {
  const fonts = LOOK_FONTS.map((font): [string, string] => [font, font || t("Som brödtexten")]);
  const sizes = LOOK_SIZES.map((size): [string, string] => [
    String(size),
    points(lookPoints(bodySize, { ...look, size })),
  ]);
  return (
    <>
      <Row label={t("Typsnitt")}>
        <Dropdown
          label={t("Typsnitt")}
          value={look.font}
          options={fonts}
          onSelect={(font) => onChange({ ...look, font })}
        />
      </Row>
      <Row label={t("Storlek")}>
        <Dropdown
          label={t("Storlek")}
          value={String(look.size)}
          options={sizes}
          onSelect={(size) => onChange({ ...look, size: Number(size) })}
        />
      </Row>
    </>
  );
}

const FACES: ["italic" | "bold", string][] = [
  ["italic", t("Kursiv")],
  ["bold", t("Fetstil")],
];

const FaceRows = ({ look, onChange }: LookProps) =>
  FACES.map(([face, label]) => (
    <Row key={face} label={label}>
      <Switch
        label={label}
        isOn={look[face]}
        onFlip={() => onChange({ ...look, [face]: !look[face] })}
      />
    </Row>
  ));

/** Each style's typeface, size, italic and bold, saved as they are changed, for the whole book. */
export function StylesDialog(props: { styles: BookStyles; first: StyleName; onClose: () => void }) {
  const { styles } = props;
  const [name, setName] = useState(props.first);
  const save = (look: StyleLook) => styles.onLook(name, look);
  const look = { look: styles.looks[name], bodySize: styles.bodySize, onChange: save };
  const body = { fontFamily: fontStack(styles.bodyFont), fontSize: `${styles.bodySize}pt` };
  return (
    <Dialog label={t("Stilar")} className="styles-dialog" onClose={props.onClose}>
      <div className="styles-body">
        <StyleList name={name} onPick={setName} />
        <div className="style-look">
          <div className="style-preview" style={body}>
            <p className={`look-${name}`}>{t("Så här står stilens text i boken.")}</p>
          </div>
          <TypeRows {...look} />
          <FaceRows {...look} />
          <button className="button ghost" onClick={() => save(defaultLook(name))}>
            {t("Som från början")}
          </button>
        </div>
      </div>
      <p className="setting-hint">{t("Brödtextens typsnitt och storlek väljs i Publicera.")}</p>
      <DoneButton onClose={props.onClose} />
    </Dialog>
  );
}
