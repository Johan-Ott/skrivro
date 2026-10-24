import { useState } from "react";
import { saveOwnTemplate, templateFromBook } from "../../project/ownTemplates.js";
import type { BookTemplate } from "../../project/templates.js";
import { Dialog } from "@llkit/controls.js";
import { recordFailure } from "@llkit/errorLog.js";
import { libraryOf } from "../journey/journeyFile.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import type { ProjectChange } from "../labels/LabelsDialog.js";
import { addPackToBook, addToBook, additionsOf } from "./addPieces.js";
import { PackList } from "../packs/PackList.js";
import { PieceToggles } from "./TemplateChoices.js";
import { importTemplateFile, shareTemplateFile, useOwnTemplates } from "./templateFiles.js";
import { t } from "../../i18n/i18n.js";

interface DialogProps {
  project: Project;
  libraryDir: string | null;
  onUpdate: (change: ProjectChange) => void;
  onClose: () => void;
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

function OwnTemplatePicker(props: {
  own: BookTemplate[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (props.own.length === 0) return null;
  return (
    <select
      className="settings-text"
      aria-label={t("Egen mall")}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
    >
      <option value="">{t("Ingen egen mall")}</option>
      {props.own.map((template) => (
        <option key={template.id} value={template.id}>
          {template.name}
        </option>
      ))}
    </select>
  );
}

// The pieces, or an own template's notes and labels, added to the open book.
function AddPieces(props: DialogProps) {
  const { own } = useOwnTemplates(props.libraryDir);
  const [pieces, setPieces] = useState<string[]>([]);
  const [ownId, setOwnId] = useState("");
  const add = async () => {
    const template = own.find((each) => each.id === ownId) ?? null;
    props.onUpdate(await addToBook(props.project, additionsOf(pieces, template)));
    props.onClose();
  };
  return (
    <section className="templates-section">
      <span className="field-label">{t("Lägg till bitar")}</span>
      <PieceToggles chosen={pieces} onChange={setPieces} />
      <OwnTemplatePicker own={own} value={ownId} onChange={setOwnId} />
      <span className="setting-hint">
        {t("Anteckningssorter, etiketter och kapitel som boken inte redan har.")}
      </span>
      <button
        className="button primary small"
        disabled={!pieces.length && !ownId}
        onClick={() => void add().catch(recordFailure("Bitar"))}
      >
        {t("Lägg till")}
      </button>
    </section>
  );
}

function SaveButtons(props: { onShare: () => void; onKeep: () => void }) {
  return (
    <div className="dialog-actions">
      <button className="button secondary small" onClick={props.onShare}>
        {t("Spara som fil att dela")}
      </button>
      <button className="button primary small" onClick={props.onKeep}>
        {t("Spara i Skrivro")}
      </button>
    </div>
  );
}

// The book's shape kept as a template in the Skrivro folder, or saved as a file to share.
function SaveAsTemplate(props: DialogProps) {
  const [name, setName] = useState(props.project.name);
  const [saved, setSaved] = useState("");
  const template = () => templateFromBook(name.trim() || props.project.name, props.project);
  const keep = async () => {
    await saveOwnTemplate(platform.fileSystem, await libraryOf(props.libraryDir), template());
    setSaved(t("Sparad. Den finns under Börja från när du skapar en ny bok."));
  };
  return (
    <section className="templates-section">
      <span className="field-label">{t("Spara boken som mall")}</span>
      <input
        className="settings-text"
        aria-label={t("Mallens namn")}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <span className="setting-hint">
        {t(
          "Delar, kapitel och Vad händer?, anteckningssorter, etiketter och mål. Texten följer inte med.",
        )}
      </span>
      <SaveButtons
        onShare={() => void shareTemplateFile(template()).catch(recordFailure("Mall"))}
        onKeep={() => void keep().catch((error: unknown) => setSaved(errorText(error)))}
      />
      {saved && <span className="setting-hint">{saved}</span>}
    </section>
  );
}

/** Mallar och bitar: add pieces to the book, save it as a template, or import one someone shared. */
export function TemplatesDialog(props: DialogProps) {
  const [imported, setImported] = useState("");
  const importOne = () =>
    void importTemplateFile(props.libraryDir)
      .then((template) => {
        if (template) setImported(t("{name} finns nu bland dina mallar.", { name: template.name }));
      })
      .catch((error: unknown) => setImported(errorText(error)));
  return (
    <Dialog label={t("Mallar och bitar")} className="templates-dialog" onClose={props.onClose}>
      <AddPieces {...props} />
      <section className="templates-section">
        <span className="field-label">{t("Genrepaket")}</span>
        <PackList
          onAdd={async (pack) => props.onUpdate(await addPackToBook(props.project, pack))}
        />
      </section>
      <SaveAsTemplate {...props} />
      <button className="link-button quiet" onClick={importOne}>
        {t("Importera mall…")}
      </button>
      {imported && <span className="setting-hint">{imported}</span>}
    </Dialog>
  );
}
