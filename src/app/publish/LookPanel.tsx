import { designOf, type BookDesign } from "../../export/bookDesign.js";
import type { Typography } from "../../export/book.js";
import { ChoiceRow } from "../bookdesign/ChoiceRow.js";
import { DesignControls } from "../bookdesign/DesignControls.js";
import { Details } from "../exporting/BookFields.js";
import type { ExportChoices } from "../exporting/useExport.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

export type LookTab = "look" | "details";

interface PanelProps {
  project: Project;
  generalAuthor: string;
  onSaveFields: (fields: Record<string, unknown>) => void;
  choices: ExportChoices;
  setChoices: (next: ExportChoices) => void;
  tab: LookTab;
  onTab: (tab: LookTab) => void;
}

const TABS: [LookTab, string][] = [
  ["look", t("Utseende")],
  ["details", t("Uppgifter")],
];

const TYPOGRAPHY: [Typography, string][] = [
  ["svensk", t("Svensk")],
  ["engelsk", t("Engelsk")],
];

function Look(props: PanelProps) {
  const { choices, setChoices } = props;
  const design = designOf(props.project.fields);
  const save = (change: Partial<BookDesign>) =>
    props.onSaveFields({ design: { ...design, ...change } });
  return (
    <>
      <DesignControls design={design} save={save} dir={props.project.dir} />
      <ChoiceRow
        label={t("Typografi")}
        value={choices.typography}
        choices={TYPOGRAPHY}
        onChoose={(typography) => setChoices({ ...choices, typography: typography as Typography })}
      />
      <span className="setting-hint">
        {choices.typography === "svensk"
          ? t("Talstreck i repliker och ”svenska citattecken”, som i manuset.")
          : t("“Engelska citattecken”. Talstrecken behålls.")}
      </span>
    </>
  );
}

const Tabs = ({ tab, onTab }: Pick<PanelProps, "tab" | "onTab">) => (
  <span className="dock-tabs" role="tablist" aria-label={t("Paneler")}>
    {TABS.map(([each, label]) => (
      <button
        key={each}
        role="tab"
        className="dock-tab"
        aria-selected={tab === each}
        onClick={() => onTab(each)}
      >
        {label}
      </button>
    ))}
  </span>
);

/** Beside the book: how it looks, and what it says about itself. */
export function LookPanel(props: PanelProps) {
  return (
    <aside className="panel-dock">
      <section className="block-panel">
        <header className="block-head">
          <span className="block-title">
            <Tabs tab={props.tab} onTab={props.onTab} />
          </span>
        </header>
        <div className="design-controls">
          {props.tab === "look" ? <Look {...props} /> : <Details {...props} />}
        </div>
      </section>
    </aside>
  );
}
