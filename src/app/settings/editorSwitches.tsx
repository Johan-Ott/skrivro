import { Row, Switch } from "@llkit/controls.js";
import { usePhone } from "../phone/usePhone.js";
import type { TabProps } from "./settingsTabs.js";
import { t } from "../../i18n/i18n.js";

// Editor's switches, each with what it does, shown in the groups EditorTab names.

export type EditorSwitch =
  | "paper"
  | "bookType"
  | "tableOfContents"
  | "followOpenText"
  | "commentsInMargin"
  | "typewriter"
  | "spellcheck"
  | "typography"
  | "autocorrect"
  | "completion"
  | "review";
const EDITOR_SWITCHES: [EditorSwitch, string, string][] = [
  ["paper", t("Skriv på ett ark"), t("Texten på ett pappersark, med bokens sidor nederst.")],
  [
    "bookType",
    t("Boktypografi"),
    t("Marginaljusterat, anfang där kapitlet börjar och ett ornament mellan scener."),
  ],
  [
    "tableOfContents",
    t("Sidomenyn som innehållsförteckning"),
    t("Punktlinjer fram till sidnumret vid varje kapitel, som i en tryckt bok."),
  ],
  ["followOpenText", t("Sidomenyn följer texten"), t("Den fälls ut till texten du öppnar.")],
  [
    "commentsInMargin",
    t("Kommentarer i marginalen"),
    t(
      "Kommentarer, anteckningar och scenens namn står bredvid texten, som blyerts i en bok. Korten i Granska finns kvar.",
    ),
  ],
  [
    "typewriter",
    t("Skrivraden mitt på skärmen"),
    t("Raden du skriver på stannar mitt på skärmen i fokusläget."),
  ],
  [
    "spellcheck",
    t("Stavningskontroll"),
    t("Skrivro stryker under felstavade ord i bokens språk. Finska har ingen ordlista än."),
  ],
  [
    "typography",
    t("Svensk typografi medan du skriver"),
    t('Två bindestreck blir talstreck och "citat" blir ”citat”.'),
  ],
  [
    "autocorrect",
    t("Autokorrigering"),
    t(
      "Stor bokstav där en mening börjar, HEj blir Hej och uppenbara stavfel rättas. Backspace ångrar.",
    ),
  ],
  [
    "completion",
    t("Ordförslag"),
    t("Namn, bokens ord och ordet du brukar skriva härnäst visas i grått. Tab fyller i."),
  ],
  ["review", t("Granskning"), t("Namnstavning och upprepningar, i texten och i en panel bredvid.")],
];

// A phone shows the text without the sheet and keeps comments in Granska, so those switch nothing.
const COMPUTER_ONLY: EditorSwitch[] = ["paper", "commentsInMargin", "autocorrect", "completion"];

export function SwitchRows({
  settings,
  onChangeSettings,
  keys,
}: TabProps & { keys: EditorSwitch[] }) {
  const isPhone = usePhone();
  const switches = EDITOR_SWITCHES.filter(
    ([key]) => keys.includes(key) && (!isPhone || !COMPUTER_ONLY.includes(key)),
  );
  return switches.map(([key, label, hint]) => (
    <Row key={key} label={label} hint={hint}>
      <Switch
        label={label}
        isOn={settings[key]}
        onFlip={() => onChangeSettings((current) => ({ ...current, [key]: !current[key] }))}
      />
    </Row>
  ));
}

/** A part of a long tab, in words a writer recognises; a search shows the rows without it. */
export const GroupTitle = ({ title }: { title: string }) => (
  <span className="settings-group-title">{title}</span>
);
