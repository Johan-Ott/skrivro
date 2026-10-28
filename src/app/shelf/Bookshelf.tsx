import type { ShelfBook } from "../../project/shelf.js";
import { shelfGroups } from "../../project/shelfOrder.js";
import { SortMenu, useShelfOrder } from "./shelfChoices.js";
import { Book } from "./Book.js";
import { CloudBook } from "./CloudBook.js";
import { ContinueWriting } from "./ContinueWriting.js";
import type { CloudBook as InCloud, Fetching } from "./useCloudBooks.js";
import { useShelf } from "./useShelf.js";
import { NewBookSlot } from "./NewBookSlot.js";
import { Cheer, type Arrival } from "./Arrival.js";
import { t, formatNumber } from "../../i18n/i18n.js";

// Where every start leads: a new book, the writer's books and the ones in their Drive, and a
// manuscript or the example to begin from under them.

interface BookshelfProps {
  libraryDir: string | null;
  /** The writer's name, for the covers of books without a picture. */
  author: string;
  knownProjects: string[];
  onOpen: (dir: string) => void;
  onNewProject: () => void;
  onImport: () => void;
  onOpenExample: () => void;
  onLocate: ((book: ShelfBook) => void) | null;
  onForget: (book: ShelfBook) => void;
  onRemove: (book: ShelfBook) => void;
  /** Removes a book here and its copy in Drive; null when the writer is not signed in. */
  onRemoveEverywhere: ((book: ShelfBook) => void) | null;
  cloud: {
    books: InCloud[];
    isListing: boolean;
    fetching: Fetching | null;
    onFetch: (name: string) => void;
    remove: (book: InCloud) => void;
  };
  /** The book Ny bok just made, on its way to the shelf. */
  arriving: Arrival | null;
  onArrived: () => void;
}

function summary(books: ShelfBook[]) {
  const present = books.filter((book) => !book.isMissing);
  if (present.length === 0) return null;
  const words = present.reduce((sum, book) => sum + book.words, 0);
  const count = present.length;
  const sum = formatNumber(words);
  return count === 1
    ? t("1 bok · {words} ord", { words: sum })
    : t("{count} böcker · {words} ord totalt", { count, words: sum });
}

// The books in Drive come after the ones on this device, which open at once.
function CloudBooks({ cloud }: Pick<BookshelfProps, "cloud">) {
  return (
    <>
      {cloud.books.map((book) => (
        <CloudBook
          key={book.id}
          book={book}
          fetching={cloud.fetching}
          onFetch={() => cloud.onFetch(book.name)}
          onRemove={() => cloud.remove(book)}
        />
      ))}
    </>
  );
}

// The very first shelf: a welcome beside Ny bok, and the example book as the easy way in.
function Welcome(props: Pick<BookshelfProps, "author" | "onOpenExample">) {
  const name = props.author.trim().split(" ")[0];
  return (
    <div className="shelf-welcome">
      <h3>{name ? t("Välkommen, {name}!", { name }) : t("Välkommen!")}</h3>
      <p>
        {t(
          "Här bor dina böcker. Börja en ny, eller öppna exempelboken och se hur kapitel, scener och anteckningar hänger ihop.",
        )}
      </p>
      <button className="button secondary" onClick={props.onOpenExample}>
        {t("Öppna exempelboken")}
      </button>
    </div>
  );
}

function ShelfRows(props: BookshelfProps & { books: ShelfBook[] }) {
  const groups = shelfGroups(props.books, useShelfOrder());
  if (groups.length === 0)
    return (
      <div className="books">
        <CloudBooks cloud={props.cloud} />
        <NewBookSlot onNewProject={props.onNewProject} />
        {props.cloud.isListing ? (
          <p className="shelf-listing">{t("Hämtar dina böcker från Drive…")}</p>
        ) : (
          props.cloud.books.length === 0 && <Welcome {...props} />
        )}
      </div>
    );
  return groups.map((group, index) => (
    <section key={group.series ?? ""} className="shelf-group">
      {group.series && <h2 className="shelf-series">{group.series}</h2>}
      <div className="books">
        {group.books.map((book) => (
          <Book key={book.dir} book={book} {...props} />
        ))}
        {index === 0 && <CloudBooks cloud={props.cloud} />}
        {index === 0 && <NewBookSlot onNewProject={props.onNewProject} />}
      </div>
    </section>
  ));
}

// What the shelf holds, and the ways to a new book, in one quiet row above the books.
function ShelfHead(props: BookshelfProps & { books: ShelfBook[] | null }) {
  return (
    <div className="shelf-head">
      <h2>{t("Dina böcker")}</h2>
      <span className="shelf-summary">{props.books && summary(props.books)}</span>
      <span className="shelf-links">
        <SortMenu />
        <button className="link-button quiet" onClick={props.onOpenExample}>
          {t("Prova exempelboken")}
        </button>
        <button className="link-button quiet" onClick={props.onImport}>
          {t("Importera manus…")}
        </button>
      </span>
      <button className="button primary small" onClick={props.onNewProject}>
        {t("+ Ny bok")}
      </button>
    </div>
  );
}

export function Bookshelf(props: BookshelfProps) {
  const books = useShelf(props.libraryDir, props.knownProjects, props.arriving?.book ?? null);
  const { arriving } = props;
  return (
    <div className="shelf-screen">
      <main className="shelf">
        {books && <ContinueWriting books={books} author={props.author} onOpen={props.onOpen} />}
        <ShelfHead {...props} books={books} />
        {books && <ShelfRows books={books} {...props} />}
      </main>
      {arriving && (
        <Cheer
          title={arriving.book.title}
          onWrite={() => props.onOpen(arriving.book.dir)}
          onDone={props.onArrived}
        />
      )}
    </div>
  );
}
