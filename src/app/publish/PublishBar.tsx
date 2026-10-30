import { useMenuButton, type MenuItem } from "@llkit/Menu.js";
import { Choice } from "@llkit/controls.js";
import type { ExportFormat } from "../exporting/useExport.js";
import { ARROWS, Arrow } from "../review/WalkBar.js";
import { t } from "../../i18n/i18n.js";

/** The book on paper or on a screen, or the letter to a publisher instead of it. */
export type Shown = "tryck" | "ebok" | "forlag";

const VIEWS: [Shown, string][] = [
  ["tryck", t("Tryck")],
  ["ebok", t("E-bok")],
];

interface BarProps {
  shown: Shown;
  onShow: (shown: Shown) => void;
  /** Where the spread is in the book; null when no spread is shown. */
  place: string | null;
  onTurn: (step: number) => void;
  isExporting: boolean;
  onExport: (format: ExportFormat) => void;
}

// Everything that goes out of the book, in one menu: the book, the manuscript, the rest.
function exportItems(props: BarProps): MenuItem[] {
  const item = (format: ExportFormat, label: string, shortcut?: string): MenuItem => ({
    label,
    ...(shortcut ? { shortcut } : {}),
    onSelect: () => props.onExport(format),
  });
  return [
    item("ebok", t("E-bok"), "EPUB"),
    item("tryck", t("Tryck-PDF")),
    item("omslag", t("Tryckomslag")),
    { ...item("manus", t("Standardmanus"), "Word"), separatorBefore: true },
    { label: t("Till förlag…"), onSelect: () => props.onShow("forlag") },
    {
      label: t("Fler format"),
      separatorBefore: true,
      submenu: [
        item("markdown", "Markdown"),
        item("mappar", t("Markdown-mapp")),
        item("text", t("Text")),
        item("html", t("Webbsida")),
      ],
    },
  ];
}

/** Over the book: paper or screen, the arrows through it, and the way out. */
export function PublishBar(props: BarProps) {
  const menu = useMenuButton(t("Exportera"), exportItems(props));
  return (
    <div className="publish-bar">
      <Choice label={t("Visa som")} value={props.shown} options={VIEWS} onSelect={props.onShow} />
      <span className="publish-place">
        {props.place !== null && (
          <>
            <Arrow
              path={ARROWS.previous}
              label={t("Föregående uppslag")}
              onClick={() => props.onTurn(-1)}
            />
            <span>{props.place}</span>
            <Arrow path={ARROWS.next} label={t("Nästa uppslag")} onClick={() => props.onTurn(1)} />
          </>
        )}
      </span>
      <button
        className="button primary"
        aria-haspopup="menu"
        disabled={props.isExporting}
        onClick={menu.open}
      >
        {t("Exportera")} ▾
      </button>
      {menu.menu}
    </div>
  );
}
