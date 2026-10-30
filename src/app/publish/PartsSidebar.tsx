import { useMenuButton } from "@llkit/Menu.js";
import { bookDetails } from "../../export/book.js";
import { PARTS, type PartKey } from "../exporting/PartFields.js";
import type { ExportChoices } from "../exporting/useExport.js";
import { usePlaceholders } from "../review/PlaceholderTasks.js";
import type { Project } from "../useProject.js";
import { allParts, type BookPart, type PartGroup } from "./printOrder.js";
import { formatNumber, t } from "../../i18n/i18n.js";

interface SidebarProps {
  project: Project;
  generalAuthor: string;
  groups: PartGroup[];
  selected: string | null;
  /** The book's page count; null until Typst has set it. */
  sheets: number | null;
  choices: ExportChoices;
  onChoose: (part: BookPart) => void;
  onAdd: (key: PartKey) => void;
  onShowToCheck: () => void;
  onShowDetails: () => void;
}

// Green is done, grey is made by the book itself, a ring has nothing yet.
const DOT_COLORS: Record<BookPart["state"], string | undefined> = {
  done: "var(--status-klar)",
  auto: "var(--text-label)",
  empty: undefined,
};

function PartRow(props: { part: BookPart; isActive: boolean; onChoose: () => void }) {
  const { part, isActive } = props;
  const color = DOT_COLORS[part.state];
  const classes = ["tree-row", "print-part", part.isChapter && "chapter", isActive && "active"];
  return (
    <button
      className={classes.filter(Boolean).join(" ")}
      aria-current={isActive || undefined}
      onClick={props.onChoose}
    >
      <span
        className={`tree-dot tree-status${color ? "" : " outlined"}`}
        style={{ background: color }}
      />
      <span className="tree-label">{part.label}</span>
      <span className="tree-meta">{part.meta}</span>
    </button>
  );
}

// The parts the book does not have yet, one click from being in it.
function AddPart({ choices, onAdd }: Pick<SidebarProps, "choices" | "onAdd">) {
  const missing = PARTS.filter(([key]) => !choices[key]);
  const items = missing.map(([key, label]) => ({ label, onSelect: () => onAdd(key) }));
  const menu = useMenuButton(t("Lägg till en del"), items);
  if (missing.length === 0) return null;
  return (
    <>
      <button className="tree-add" aria-haspopup="menu" onClick={menu.open}>
        {t("+ Lägg till en del")}
      </button>
      {menu.menu}
    </>
  );
}

const Notice = ({ text, onClick }: { text: string; onClick: () => void }) => (
  <li>
    <button className="link-button" onClick={onClick}>
      {text}
    </button>
  </li>
);

// What the book still lacks; it stays here until it is done, and a click goes there.
function BeforePrint(props: SidebarProps) {
  const placeholders = usePlaceholders(props.project, null).length;
  const author = bookDetails(props.project.fields, props.generalAuthor, 0).author.trim();
  const empty = allParts(props.groups).filter((part) => part.state === "empty");
  const count = empty.length + (placeholders > 0 ? 1 : 0) + (author ? 0 : 1);
  if (count === 0) return null;
  return (
    <ul className="sidebar-notices" aria-label={t("Innan tryck")}>
      <li className="notices-head">{t("{count} saker innan tryck", { count })}</li>
      {empty.map((part) => (
        <Notice
          key={part.id}
          text={t("{part} är tom", { part: part.label })}
          onClick={() => props.onChoose(part)}
        />
      ))}
      {placeholders > 0 && (
        <Notice
          text={t("Platshållare kvar: {count}", { count: placeholders })}
          onClick={props.onShowToCheck}
        />
      )}
      {!author && <Notice text={t("Författarnamnet saknas.")} onClick={props.onShowDetails} />}
    </ul>
  );
}

const PartList = (props: SidebarProps) =>
  props.groups.map((group) => (
    <div key={group.heading} role="group" aria-label={group.heading}>
      <div className="sidebar-heading">{group.heading}</div>
      {group.parts.map((part) => (
        <PartRow
          key={part.id}
          part={part}
          isActive={part.id === props.selected}
          onChoose={() => props.onChoose(part)}
        />
      ))}
    </div>
  ));

/** The book in print order: before the text, its parts and chapters, after it. */
export function PartsSidebar(props: SidebarProps) {
  return (
    <nav className="sidebar" aria-label={t("Bokens delar")}>
      <div className="tree-tools">
        <span className="tree-book-toggle">{t("I tryck")}</span>
        {props.sheets !== null && (
          <span className="tree-tools-words">
            {t("{count} sidor", { count: formatNumber(props.sheets) })}
          </span>
        )}
      </div>
      <div className="tree-scroll">
        <PartList {...props} />
        <AddPart choices={props.choices} onAdd={props.onAdd} />
      </div>
      <BeforePrint {...props} />
    </nav>
  );
}
