import { useState } from "react";
import { recordFailure } from "@llkit/errorLog.js";
import type { ProjectDetails } from "../../project/newProject.js";
import { exampleBook, importedBook, libraryOf, newBook } from "../onboarding/books.js";
import type { AppState } from "../App.js";
import { t } from "../../i18n/i18n.js";

type App = Pick<AppState, "startup" | "open">;

// One book on its way at a time: what is happening shows, and another tap waits instead of
// making a second book.
function useOpening(app: App) {
  const [busy, setBusy] = useState<string | null>(null);
  const opened = async (make: () => Promise<string | null>, what: string, saying: string) => {
    if (busy) return;
    setBusy(saying);
    try {
      const dir = await make().catch(recordFailure(what));
      if (dir) await app.open(dir);
    } finally {
      setBusy(null);
    }
  };
  return { busy, opened };
}

/** Each way a book reaches the shelf, opened as soon as it is there; a new book waits on the
 * shelf, where Ny bok shows it land. */
export function useBookActions(app: App) {
  const { preferences } = app.startup;
  const { busy, opened } = useOpening(app);
  const library = () => libraryOf(preferences.libraryDir);
  const goal = preferences.defaultDailyGoal;
  return {
    busy,
    open: (dir: string) => void opened(async () => dir, "Boken", t("Öppnar boken…")),
    create: (details: ProjectDetails) =>
      library()
        .then((dir) => newBook(dir, details))
        .catch(recordFailure("Boken kunde inte skapas"))
        .then((dir) => dir ?? null),
    import: () =>
      void opened(
        () => library().then((dir) => importedBook(dir, goal)),
        "Importen",
        t("Läser in manuset…"),
      ),
    example: () =>
      void opened(() => library().then(exampleBook), "Exempelboken", t("Öppnar exempelboken…")),
  };
}

/** What is happening while a book is copied or opened, over the shelf. */
export const Opening = ({ saying }: { saying: string | null }) =>
  saying && (
    <div className="opening-book" role="status">
      <span className="opening-spinner" aria-hidden="true" />
      {saying}
    </div>
  );
