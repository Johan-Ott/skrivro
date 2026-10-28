import { flairWithState, type Earned, type FlairKind } from "../../project/flair.js";
import { t } from "../../i18n/i18n.js";

type FlairItem = ReturnType<typeof flairWithState>[number];

interface FlairPickerProps {
  earned: Earned;
  frame: string;
  title: string;
  onChange: (change: { frame?: string; title?: string }) => void;
}

function FlairOption(props: { item: FlairItem; isChosen: boolean; onChoose: () => void }) {
  const { item } = props;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={props.isChosen}
      disabled={!item.isUnlocked}
      className={item.isUnlocked ? "flair-option" : "flair-option locked"}
      onClick={props.onChoose}
    >
      <span className="flair-name">{item.name}</span>
      {!item.isUnlocked && <span className="flair-hint">{item.hint}</span>}
    </button>
  );
}

function FlairGroup(props: {
  label: string;
  items: FlairItem[];
  chosen: string;
  onChoose: (id: string) => void;
}) {
  const none = { id: "", name: t("Ingen"), isUnlocked: true, hint: "" } as FlairItem;
  return (
    <div className="field">
      <span className="field-label">{props.label}</span>
      <div className="flair-options" role="radiogroup" aria-label={props.label}>
        {[none, ...props.items].map((item) => (
          <FlairOption
            key={item.id}
            item={item}
            isChosen={props.chosen === item.id}
            onChoose={() => props.onChoose(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

/** Stil: the frames and titles there are, the locked ones with what unlocks them. */
export function FlairPicker(props: FlairPickerProps) {
  const all = flairWithState(props.earned);
  const ofKind = (kind: FlairKind) => all.filter((item) => item.kind === kind);
  return (
    <>
      <span className="setting-hint">
        {t("Ramar och titlar låses upp av det du skriver. De syns på din profil.")}
      </span>
      <FlairGroup
        label={t("Ram runt bilden")}
        items={ofKind("ram")}
        chosen={props.frame}
        onChoose={(frame) => props.onChange({ frame })}
      />
      <FlairGroup
        label={t("Titel")}
        items={ofKind("titel")}
        chosen={props.title}
        onChoose={(title) => props.onChange({ title })}
      />
    </>
  );
}
