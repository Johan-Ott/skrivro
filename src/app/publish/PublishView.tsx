import { CoverFields } from "./CoverFields.js";
import { GuideTip } from "../guide/GuideTip.js";
import { useState } from "react";
import { designOf, type BookDesign } from "../../export/bookDesign.js";
import type { Typography } from "../../export/book.js";
import { DesignControls } from "../bookdesign/DesignControls.js";
import { PrintPreview } from "../bookdesign/PrintPreview.js";
import { BookFields } from "../exporting/BookFields.js";
import { AuthorWarning, ExportStatus, Preview } from "../exporting/ExportPanels.js";
import { useCover } from "../exporting/useCover.js";
import {
  startChoices,
  useExport,
  type ExportChoices,
  type ExportFormat,
} from "../exporting/useExport.js";
import { BackButton, Choice } from "@llkit/controls.js";
import { SubmitStep } from "./SubmitStep.js";
import { PublishTabs, type Step } from "./PublishTiles.js";
import { PlaceholderWarning } from "../review/PlaceholderTasks.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

interface PublishProps {
  project: Project;
  generalAuthor: string;
  onSaveFields: (fields: Record<string, unknown>) => void;
  onOpenScene: (title: string) => void;
  onBack: () => void;
  /** Back to the text with Granska open, where the placeholders are listed. */
  onShowToCheck: () => void;
}

const FORMATS: [ExportFormat, string, string, string][] = [
  [
    "manus",
    t("Standardmanus"),
    t("Exportera manus"),
    t("Till förlag och agenter. 12 pt, dubbelt radavstånd, namn och titel i sidhuvudet."),
  ],
  [
    "ebok",
    t("E-bok"),
    t("Exportera e-bok"),
    t("EPUB 3 med omslag och innehållsförteckning, redo för e-bokhandlare."),
  ],
  [
    "tryck",
    t("Tryck-PDF"),
    t("Exportera tryck-PDF"),
    t("Satt enligt designen, med marginaler och sidnummer för tryck på beställning."),
  ],
  [
    "omslag",
    t("Tryckomslag"),
    t("Exportera omslag"),
    t("Baksida, rygg och framsida i en PDF med 3 mm utfall. Ryggen räknas fram ur sidantalet."),
  ],
  [
    "markdown",
    "Markdown",
    t("Exportera Markdown"),
    t("Hela boken i en textfil med rubriker, för bloggar, webbföljetonger och andra program."),
  ],
  [
    "mappar",
    t("Markdown-mapp"),
    t("Exportera Markdown-mapp"),
    t(
      "Varje scen som en egen fil med sin titel, i en mapp per del och kapitel, och anteckningarna för sig. En zip att packa upp.",
    ),
  ],
  ["text", t("Text"), t("Exportera text"), t("Bara texten, utan formatering.")],
  [
    "html",
    t("Webbsida"),
    t("Exportera webbsida"),
    t("Hela boken som en webbsida att läsa i webbläsaren eller lägga upp."),
  ],
];

const TYPOGRAPHY: [Typography, string][] = [
  ["svensk", t("Svensk")],
  ["engelsk", t("Engelsk")],
];

function ExportStep(
  props: PublishProps & { choices: ExportChoices; setChoices: (next: ExportChoices) => void },
) {
  const { choices, setChoices } = props;
  const format = FORMATS.find(([id]) => id === choices.format);
  return (
    <div className="publish-fields">
      <Choice
        label={t("Format")}
        value={choices.format}
        options={FORMATS.map(([id, label]) => [id, label])}
        onSelect={(next) => setChoices({ ...choices, format: next })}
      />
      <span className="setting-hint">{format?.[3]}</span>
      {choices.format === "omslag" && <CoverFields {...props} />}
      <span className="export-heading">{t("Typografi")}</span>
      <Choice
        label={t("Typografi")}
        value={choices.typography}
        options={TYPOGRAPHY}
        onSelect={(typography) => setChoices({ ...choices, typography })}
      />
      <span className="setting-hint">
        {choices.typography === "svensk"
          ? t("Talstreck i repliker och ”svenska citattecken”, som i manuset.")
          : t("“Engelska citattecken”. Talstrecken behålls.")}
      </span>
    </div>
  );
}

type Publishing = ReturnType<typeof usePublishing>;

function usePublishing(props: PublishProps) {
  const { project } = props;
  const [step, setStep] = useState<Step>("design");
  const [choices, setChoices] = useState(() => startChoices(project));
  const exporter = useExport(project, props.generalAuthor, props.onSaveFields);
  const cover = useCover(project);
  return { step, setStep, choices, setChoices, exporter, cover };
}

function OpenStep({ props, publishing }: { props: PublishProps; publishing: Publishing }) {
  const { step, choices, setChoices } = publishing;
  const design = designOf(props.project.fields);
  const saveDesign = (change: Partial<BookDesign>) =>
    props.onSaveFields({ design: { ...design, ...change } });
  if (step === "design")
    return <DesignControls design={design} save={saveDesign} dir={props.project.dir} />;
  if (step === "forlag") return null;
  if (step === "details")
    return (
      <BookFields {...props} cover={publishing.cover} choices={choices} setChoices={setChoices} />
    );
  return <ExportStep {...props} choices={choices} setChoices={setChoices} />;
}

// What the export will carry as it stands: placeholders, and a manuscript without a writer.
const ExportWarnings = ({ props, publishing }: { props: PublishProps; publishing: Publishing }) => (
  <>
    <PlaceholderWarning project={props.project} onShow={props.onShowToCheck} />
    <AuthorWarning
      {...props}
      format={publishing.choices.format}
      onShow={() => publishing.setStep("details")}
    />
  </>
);

// The tabs, and the part that is open under them.
function StepsOrTiles({ props, publishing }: { props: PublishProps; publishing: Publishing }) {
  return (
    <>
      <PublishTabs step={publishing.step} onStep={publishing.setStep} />
      <OpenStep props={props} publishing={publishing} />
    </>
  );
}

function PublishPreview({ props, publishing }: { props: PublishProps; publishing: Publishing }) {
  const { choices } = publishing;
  if (publishing.step === "forlag") return <SubmitStep {...props} />;
  if (publishing.step === "design") {
    return <PrintPreview project={props.project} generalAuthor={props.generalAuthor} />;
  }
  return <Preview {...props} format={choices.format} coverUrl={publishing.cover.url} />;
}

export function PublishView(props: PublishProps) {
  const publishing = usePublishing(props);
  const { choices, exporter } = publishing;
  const exportLabel = FORMATS.find(([id]) => id === choices.format)?.[2] ?? t("Exportera");
  return (
    <div className={publishing.step ? `publish step-${publishing.step}` : "publish"}>
      <aside className="publish-steps" aria-label={t("Publicera")}>
        <BackButton
          className="publish-back"
          label={t("Tillbaka till texten")}
          onBack={props.onBack}
        />
        <StepsOrTiles props={props} publishing={publishing} />
        <ExportWarnings props={props} publishing={publishing} />
        <button
          className="button primary publish-button"
          disabled={exporter.state.kind === "running"}
          onClick={() => exporter.run(choices)}
        >
          {exportLabel}
        </button>
      </aside>
      <main className="publish-preview">
        <PublishPreview props={props} publishing={publishing} />
      </main>
      <ExportStatus exporter={exporter} onOpenScene={props.onOpenScene} />
      <GuideTip step="publicera" />
    </div>
  );
}
