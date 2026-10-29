import type { MouseEvent } from "react";
import { whenUpdated, type ShelfBook } from "../../project/shelf.js";
import { amountOf, deadlineLine } from "../../project/shelfLines.js";
import { coverLookOf, pagesWidth } from "../../project/shelfLook.js";
import { templatePieces } from "../../project/templates.js";
import { useMenuButton } from "@llkit/Menu.js";
import { platform } from "../platform.js";
import { t, formatNumber } from "../../i18n/i18n.js";
import { useShelfCover } from "./useShelfCover.js";
import { useRenameBook } from "./useRenameBook.js";
import { retitleBook } from "../../project/projectFile.js";
import { recordFailure } from "@llkit/errorLog.js";
import { FavoriteStar, toggleFavorite, useShelfOrder } from "./shelfChoices.js";
import { coverItem } from "./coverMenu.js";
import { useLanding, type Arrival } from "./Arrival.js";
import { MissingBook } from "./MissingBook.js";

interface BookProps {
  book: ShelfBook;
  /** The writer's name from Inställningar, written on a cover without a picture. */
  author: string;
  onOpen: (dir: string) => void;
  onLocate: ((book: ShelfBook) => void) | null;
  onForget: (book: ShelfBook) => void;
  onRemove: (book: ShelfBook) => void;
  onRemoveEverywhere: ((book: ShelfBook) => void) | null;
  /** The book Ny bok just made, which flies in and glows when it is this one. */
  arriving?: Arrival | null;
}

// "Bok 2" for a numbered book in a series; the kind of book otherwise.
function seriesLine(book: ShelfBook) {
  return book.series && book.seriesNumber ? t("Bok {number}", { number: book.seriesNumber }) : null;
}

const genreName = (book: ShelfBook) =>
  templatePieces().find((piece) => piece.id === book.genre)?.name ?? null;

// CSS class names stay in plain letters.
const stageClass = (book: ShelfBook) =>
  book.stage ? `stage-${book.stage === "idé" ? "ide" : book.stage}` : "";

function Cover({ book, author, pictureUrl, onOpen }: CoverProps) {
  if (pictureUrl) {
    return (
      <button
        className={`book-cover with-picture ${stageClass(book)}`}
        data-dir={book.dir}
        aria-label={book.title}
        onClick={() => onOpen(book.dir)}
      >
        <img className="book-cover-picture" src={pictureUrl} alt="" />
      </button>
    );
  }
  return (
    <button
      className={`book-cover ${coverLookOf(book.dir, book.genre ?? null, book.coverLook ?? null)} ${stageClass(book)}`}
      data-dir={book.dir}
      onClick={() => onOpen(book.dir)}
    >
      <span className="book-kind">{seriesLine(book) ?? genreName(book) ?? book.kind}</span>
      <span className="book-title">{book.title}</span>
      <span className="book-words">
        {author || t("{count} ord", { count: formatNumber(book.words) })}
      </span>
    </button>
  );
}

type CoverProps = Pick<BookProps, "book" | "author" | "onOpen"> & { pictureUrl: string | null };

// Signed in, a book can go from this device only, and come back from Drive, or from both.
function removeItems({ book, onRemove, onRemoveEverywhere }: BookMenuProps) {
  if (!platform.removeBook) return [];
  const here = onRemoveEverywhere ? t("Ta bort härifrån…") : t("Ta bort boken…");
  return [
    { label: here, separatorBefore: true, onSelect: () => onRemove(book) },
    ...(onRemoveEverywhere
      ? [{ label: t("Ta bort här och i Drive…"), onSelect: () => onRemoveEverywhere(book) }]
      : []),
  ];
}

// The shelf sees the new title when the folder watch notices project.json change.
const renameOnDisk = (dir: string) => (title: string) =>
  void retitleBook(platform.fileSystem, dir, title).catch(recordFailure("Byt namn på boken"));

function BookMenu(props: BookMenuProps) {
  const { book, onChooseCover } = props;
  const rename = useRenameBook(book.title, renameOnDisk(book.dir));
  const isFavorite = useShelfOrder().favorites.includes(book.dir);
  const items = [
    {
      label: isFavorite ? t("Ta bort från favoriter") : t("Lägg till i favoriter"),
      onSelect: () => toggleFavorite(book.dir),
    },
    { label: t("Byt namn…"), onSelect: rename.open },
    coverItem(book, props.hasPicture, onChooseCover),
    ...(platform.showInFolder
      ? [{ label: t("Visa i mappen"), onSelect: () => void platform.showInFolder?.(book.dir) }]
      : []),
    ...removeItems(props),
  ];
  const menu = useMenuButton(t("Bokens meny"), items);
  if (items.length === 0) return null;
  return (
    <>
      <button className="book-menu" aria-label={t("Bokens meny")} onClick={menu.open}>
        ⋯
      </button>
      {menu.menu}
      {rename.layer}
    </>
  );
}

function ProgressBar({ book }: { book: ShelfBook }) {
  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuenow={book.progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t("{title}: {progress} procent klart", {
        title: book.title,
        progress: book.progress,
      })}
    >
      <div style={{ width: `${book.progress}%` }} />
    </div>
  );
}

type BookMenuProps = Pick<BookProps, "book" | "onRemove" | "onRemoveEverywhere"> & {
  onChooseCover: () => void;
  hasPicture: boolean;
};

// A picture may carry no title, or one too small to read, so the name stands under it.
function BookName({ book }: { book: ShelfBook }) {
  const line = seriesLine(book);
  return (
    <div className="book-name">
      <span className="book-name-title">{book.title}</span>
      {line && <span className="book-name-series">{line}</span>}
    </div>
  );
}

function BookMeta(props: BookMenuProps & { hasPicture: boolean }) {
  const { book } = props;
  const deadline = deadlineLine(book, new Date().toISOString().slice(0, 10));
  const updated = book.updatedAt ? whenUpdated(book.updatedAt, Date.now()) : "";
  return (
    <div className="book-meta">
      {props.hasPicture && <BookName book={book} />}
      <div className="book-status">
        <span className="book-percent">{amountOf(book)}</span>
        <BookMenu {...props} />
      </div>
      <ProgressBar book={book} />
      <span className="book-updated">
        {[book.status, deadline ?? updated].filter(Boolean).join(" · ")}
      </span>
    </div>
  );
}

function PresentBook(props: BookProps) {
  const cover = useShelfCover(props.book.dir);
  const landing = useLanding(props.arriving, props.book.dir);
  // A right-click, or a finger held on the book, opens the same menu as its ⋯ button.
  const openMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.currentTarget.querySelector<HTMLButtonElement>(".book-menu")?.click();
  };
  return (
    <div
      ref={landing.ref}
      className={`book ${landing.className}`}
      style={{ "--thick": `${pagesWidth(props.book.words)}px` } as object}
      onContextMenu={openMenu}
    >
      <Cover {...props} pictureUrl={cover.url} />
      <FavoriteStar dir={props.book.dir} />
      <BookMeta
        book={props.book}
        hasPicture={cover.url !== null}
        onRemove={props.onRemove}
        onRemoveEverywhere={props.onRemoveEverywhere}
        onChooseCover={cover.choose}
      />
    </div>
  );
}

export function Book(props: BookProps) {
  if (props.book.isMissing) return <MissingBook {...props} />;
  return <PresentBook {...props} />;
}

/** The book's cover alone, its picture when it has one, as Fortsätt skriva shows it. */
export function BookCover(props: Pick<BookProps, "book" | "author" | "onOpen">) {
  const cover = useShelfCover(props.book.dir);
  return <Cover {...props} pictureUrl={cover.url} />;
}
