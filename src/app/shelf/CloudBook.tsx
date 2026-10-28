import { useState } from "react";
import { Dialog } from "@llkit/controls.js";
import { useMenuButton } from "@llkit/Menu.js";
import type { CloudBook as Book, Fetching } from "./useCloudBooks.js";
import { t } from "../../i18n/i18n.js";
import { withoutBookSuffix } from "../../project/libraryFolders.js";
import { coverLookOf } from "../../project/shelfLook.js";

// A book in the writer's Drive that this device has not fetched: drained of colour, fetched and
// opened by a tap, and removed from Drive from its menu, into Drive's trash for 30 days.

const fetchText = ({ done, all }: Fetching) =>
  all === 0 ? t("Hämtar…") : t("Hämtar {done} av {all}", { done, all });

const title = (book: Book) => withoutBookSuffix(book.name);

function RemoveDialog(props: { book: Book; onRemove: () => void; onClose: () => void }) {
  return (
    <Dialog label={t("Ta bort från Drive")} onClose={props.onClose}>
      <p className="setting-hint">
        {t("”{title}” flyttas till papperskorgen i din Drive, där den finns kvar i 30 dagar.", {
          title: title(props.book),
        })}
      </p>
      <div className="dialog-actions">
        <button className="button ghost" onClick={props.onClose}>
          {t("Avbryt")}
        </button>
        <button className="button primary" onClick={() => (props.onRemove(), props.onClose())}>
          {t("Ta bort")}
        </button>
      </div>
    </Dialog>
  );
}

function CloudMenu(props: { book: Book; onRemove: () => void }) {
  const [isAsking, setAsking] = useState(false);
  const menu = useMenuButton(t("Bokens meny"), [
    { label: t("Ta bort från Drive…"), onSelect: () => setAsking(true) },
  ]);
  return (
    <>
      <button className="book-menu" aria-label={t("Bokens meny")} onClick={menu.open}>
        ⋯
      </button>
      {menu.menu}
      {isAsking && (
        <RemoveDialog
          book={props.book}
          onRemove={props.onRemove}
          onClose={() => setAsking(false)}
        />
      )}
    </>
  );
}

function CoverText(props: { book: Book; fetching: Fetching | null }) {
  return (
    <>
      <span className="book-kind">{t("I din Drive")}</span>
      <span className="book-title">{title(props.book)}</span>
      <span className="book-words">
        {props.fetching ? fetchText(props.fetching) : t("Tryck för att hämta")}
      </span>
    </>
  );
}

// While the book is fetched, its colours rise over the drained cover as the files come in.
function Filling(props: { book: Book; fetching: Fetching; look: string }) {
  const { done, all } = props.fetching;
  const percent = all ? (done / all) * 100 : 0;
  return (
    <span
      className={`book-cover book-fill ${props.look}`}
      style={{ clipPath: `inset(${100 - percent}% 0 0 0)` }}
      aria-hidden="true"
    >
      <CoverText book={props.book} fetching={props.fetching} />
    </span>
  );
}

export function CloudBook(props: {
  book: Book;
  fetching: Fetching | null;
  onFetch: () => void;
  onRemove: () => void;
}) {
  const fetching = props.fetching?.name === props.book.name ? props.fetching : null;
  const look = coverLookOf(props.book.name);
  return (
    <div className="book" style={{ "--thick": "3px" } as object}>
      <button
        className={`book-cover in-cloud ${look}`}
        disabled={props.fetching !== null}
        onClick={props.onFetch}
      >
        <CoverText book={props.book} fetching={fetching} />
      </button>
      {fetching && <Filling book={props.book} fetching={fetching} look={look} />}
      <div className="book-meta">
        <div className="book-foot">
          <span className="book-updated">{t("Inte hämtad hit")}</span>
          <CloudMenu book={props.book} onRemove={props.onRemove} />
        </div>
      </div>
    </div>
  );
}
