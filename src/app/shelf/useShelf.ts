import { useCallback, useEffect, useState } from "react";
import { readShelf, type ShelfBook } from "../../project/shelf.js";
import { platform } from "../platform.js";

// Reading every scene of every book takes seconds for long books, so the shelf as last read is
// shown at once and replaced when the books are read again.
const CACHE_KEY = "skrivro.shelf";

function cachedShelf(libraryDir: string | null): ShelfBook[] | null {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as {
      libraryDir: string | null;
      books: ShelfBook[];
    } | null;
    return cached?.libraryDir === libraryDir && Array.isArray(cached.books) ? cached.books : null;
  } catch {
    return null;
  }
}

/** The shelf as last read, wherever it was, for choosing among the writer's other books. */
export function knownBooks(): ShelfBook[] {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as {
      books?: unknown;
    } | null;
    return Array.isArray(cached?.books) ? (cached.books as ShelfBook[]) : [];
  } catch {
    return [];
  }
}

function cacheShelf(libraryDir: string | null, books: ShelfBook[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ libraryDir, books }));
  } catch {
    // Without storage the shelf is only read, as before.
  }
}

const SETTLE_MS = 300;

export function useShelf(libraryDir: string | null, knownProjects: string[]) {
  const [books, setBooks] = useState<ShelfBook[] | null>(() => cachedShelf(libraryDir));
  const known = knownProjects.join("\n");
  const reload = useCallback(async () => {
    const read = await readShelf(platform.fileSystem, libraryDir, known ? known.split("\n") : []);
    cacheShelf(libraryDir, read);
    setBooks(read);
  }, [libraryDir, known]);
  useEffect(() => {
    void reload();
    // A new book writes many files at once: the shelf is read once, when they have settled.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void reload(), SETTLE_MS);
    };
    // A book opened from elsewhere, such as the example, is not in the library's folder.
    const dirs = [...(libraryDir ? [libraryDir] : []), ...(known ? known.split("\n") : [])];
    const stops = dirs.map((dir) => platform.watchFolder(dir, soon));
    return () => {
      clearTimeout(timer);
      stops.forEach((stopWatching) => void stopWatching.then((stop) => stop()));
    };
  }, [libraryDir, known, reload]);
  return books;
}
