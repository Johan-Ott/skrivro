import { useState } from "react";
import { bookOutline } from "../../export/book.js";
import { bookLanguage } from "../../project/bookLanguage.js";
import { PrintPreview } from "../bookdesign/PrintPreview.js";
import { rowCount, rowOf, usePrintPreview } from "../bookdesign/usePrintPreview.js";
import { useTurnKeys } from "../contents/ReadView.js";
import { CoverRow } from "../exporting/BookFields.js";
import { ExportStatus, Preview } from "../exporting/ExportPanels.js";
import { ExcerptBook, PartText, isExtra, type PartKey } from "../exporting/PartFields.js";
import { useCover } from "../exporting/useCover.js";
import { startChoices, useExport } from "../exporting/useExport.js";
import { GuideTip } from "../guide/GuideTip.js";
import type { Project } from "../useProject.js";
import { CoverFields } from "./CoverFields.js";
import { LookPanel, type LookTab } from "./LookPanel.js";
import { PartsSidebar } from "./PartsSidebar.js";
import { PublishBar, type Shown } from "./PublishBar.js";
import { allParts, partAt, printOrder, type BookPart } from "./printOrder.js";
import { SubmitStep } from "./SubmitStep.js";
import { t } from "../../i18n/i18n.js";

interface PublishProps {
  project: Project;
  generalAuthor: string;
  onSaveFields: (fields: Record<string, unknown>) => void;
  onOpenScene: (title: string) => void;
  /** Back to the text with Granska open, where the placeholders are listed. */
  onShowToCheck: () => void;
}

// The book as it will be printed: its parts, and the pages Typst set them on.
function useBook(props: PublishProps) {
  const { project } = props;
  const [choices, setChoices] = useState(() => startChoices(project));
  const pages = usePrintPreview(project, props.generalAuthor, choices);
  const cover = useCover(project);
  const book = pages.kind === "ready" ? pages.book : null;
  const groups = printOrder({
    choices,
    extras: book?.extras ?? {},
    fields: project.fields,
    outline: bookOutline(project.tree),
    marks: book?.marks ?? null,
    language: bookLanguage(project.fields),
    hasCover: cover.url !== null,
  });
  return { choices, setChoices, pages, cover, groups, sheets: book?.marks.pages ?? null };
}

type Book = ReturnType<typeof useBook>;

// Where the writer is in the book: the part picked in the sidebar and the spread on screen.
function useWalk(book: Book) {
  const [selected, setSelected] = useState<string | null>(null);
  const [shown, setShown] = useState<Shown>("tryck");
  const [wantedRow, setRow] = useState(0);
  const last = book.sheets === null ? 0 : rowCount(book.sheets) - 1;
  const row = Math.min(wantedRow, last);
  const choose = (part: BookPart) => {
    setSelected(part.id);
    setShown("tryck");
    if (part.sheet !== null) setRow(rowOf(part.sheet));
  };
  const turn = (step: number) => {
    const next = Math.min(Math.max(row + step, 0), last);
    setRow(next);
    setSelected(partAt(book.groups, next));
  };
  useTurnKeys(turn);
  return { selected, setSelected, shown, setShown, row, last, choose, turn };
}

type Walk = ReturnType<typeof useWalk>;

// The picked part's own text, and the way to take it out of the book.
function PartCard({ props, book, walk }: { props: PublishProps; book: Book; walk: Walk }) {
  const part = allParts(book.groups).find((each) => each.id === walk.selected);
  const key = part?.choice;
  if (!part || !key) return null;
  const remove = (choice: PartKey) => {
    book.setChoices({ ...book.choices, [choice]: false });
    walk.setSelected(null);
  };
  return (
    <section className="card publish-part" aria-label={part.label}>
      <span className="export-heading">{part.label}</span>
      {isExtra(key) && <PartText {...props} part={key} />}
      {key === "hasExcerpt" && <ExcerptBook {...props} />}
      <button className="link-button" onClick={() => remove(key)}>
        {t("Ta bort ur boken")}
      </button>
    </section>
  );
}

function Middle({ props, book, walk }: { props: PublishProps; book: Book; walk: Walk }) {
  if (walk.shown === "forlag") return <SubmitStep {...props} />;
  const coverUrl = book.cover.url;
  if (walk.shown === "ebok") return <Preview {...props} format="ebok" coverUrl={coverUrl} />;
  if (walk.selected === "omslag")
    return (
      <div className="publish-part">
        <Preview {...props} format="omslag" coverUrl={coverUrl} />
        <CoverRow cover={book.cover} />
        <CoverFields {...props} />
      </div>
    );
  return (
    <>
      <PrintPreview pages={book.pages} row={walk.row} />
      <PartCard props={props} book={book} walk={walk} />
    </>
  );
}

// "Tack · uppslag 3 av 40", "Omslag", or nothing while the book is not set or not shown as print.
function placeOf(book: Book, walk: Walk) {
  if (walk.shown !== "tryck") return null;
  if (walk.selected === "omslag") return t("Omslag");
  if (book.sheets === null) return null;
  const part = allParts(book.groups).find((each) => each.id === partAt(book.groups, walk.row));
  const spread = t("uppslag {row} av {count}", { row: walk.row + 1, count: walk.last + 1 });
  return part ? `${part.label} · ${spread}` : spread;
}

type Exporter = ReturnType<typeof useExport>;

// The bar over the book, and the book: a spread, the cover, the e-book or the letter.
function Center(props: { publish: PublishProps; book: Book; walk: Walk; exporter: Exporter }) {
  const { book, walk, exporter } = props;
  return (
    <div className="publish-center">
      <PublishBar
        shown={walk.shown}
        onShow={walk.setShown}
        place={placeOf(book, walk)}
        onTurn={walk.turn}
        isExporting={exporter.state.kind === "running"}
        onExport={(format) => exporter.run({ ...book.choices, format })}
      />
      <main className="publish-preview">
        <Middle props={props.publish} book={book} walk={walk} />
      </main>
    </div>
  );
}

/** Publicera: the book's parts on the left, one spread in the middle, its look on the right. */
export function PublishView(props: PublishProps) {
  const book = useBook(props);
  const walk = useWalk(book);
  const [tab, setTab] = useState<LookTab>("look");
  const exporter = useExport(props.project, props.generalAuthor, props.onSaveFields);
  const add = (key: PartKey) => {
    book.setChoices({ ...book.choices, [key]: true });
    walk.setSelected(key);
  };
  return (
    <>
      <PartsSidebar
        {...props}
        {...book}
        selected={walk.selected}
        onChoose={walk.choose}
        onAdd={add}
        onShowDetails={() => setTab("details")}
      />
      <div className="main-card publish">
        <Center publish={props} book={book} walk={walk} exporter={exporter} />
        <LookPanel {...props} {...book} tab={tab} onTab={setTab} />
        <ExportStatus exporter={exporter} onOpenScene={props.onOpenScene} />
        <GuideTip step="publicera" />
      </div>
    </>
  );
}
