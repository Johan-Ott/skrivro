import { t } from "../../i18n/i18n.js";

/** The unwritten book at the end of the shelf. Ny bok grows out of it, and shrinks back into it. */
export function NewBookSlot({ onNewProject }: { onNewProject: () => void }) {
  return (
    <div className="book new-book-slot">
      <button className="new-book" aria-label={t("Ny bok")} onClick={onNewProject}>
        <span className="new-book-leaf" aria-hidden="true">
          {t("Kapitel 1")}
        </span>
        <span className="book-cover cover-blank">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10.5" />
            <path d="M12 7.5v9M7.5 12h9" />
          </svg>
          <span className="book-title">{t("Ny bok")}</span>
          <span className="book-words">{t("Roman, noveller eller fackbok")}</span>
        </span>
      </button>
    </div>
  );
}
