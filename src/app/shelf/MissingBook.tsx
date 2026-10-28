import type { ShelfBook } from "../../project/shelf.js";
import { t } from "../../i18n/i18n.js";

// A book on the shelf whose folder is gone: it can be looked for, or taken off the shelf.
type Props = {
  book: ShelfBook;
  onLocate: ((book: ShelfBook) => void) | null;
  onForget: (book: ShelfBook) => void;
};

export function MissingBook({ book, onLocate, onForget }: Props) {
  return (
    <div className="book">
      <div className="book-cover missing">
        <span className="book-title">{book.title}</span>
        <span className="book-words">{t("Hittas inte")}</span>
      </div>
      <div className="book-meta">
        <span className="book-updated">
          {t("Mappen har flyttats eller döpts om. Texten finns kvar där du lade den.")}
        </span>
        {onLocate && (
          <button className="link-button" onClick={() => onLocate(book)}>
            {t("Leta upp mappen")}
          </button>
        )}
        <button className="link-button quiet" onClick={() => onForget(book)}>
          {t("Ta bort från hyllan")}
        </button>
      </div>
    </div>
  );
}
