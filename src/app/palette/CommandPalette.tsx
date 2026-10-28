import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  inResultGroups,
  readUses,
  recordUse,
  searchPalette,
  type PaletteEntry,
} from "./paletteSearch.js";
import { usePhone } from "../phone/usePhone.js";
import type { Label } from "../../project/labels.js";
import { PaletteFilters, usePaletteFilter } from "./PaletteFilters.js";
import { shortcutOf } from "../shortcuts.js";
import { NoteKindIcon } from "../notes/NoteKindIcon.js";
import { t } from "../../i18n/i18n.js";

// A command's group is a search key; a note's group is its sort's name, already translated.
export const groupLabel = (group: string) =>
  ({
    Scener: t("Scener"),
    Kapitel: t("Kapitel"),
    Kommandon: t("Kommandon"),
    "Mest använda": t("Mest använda"),
  })[group] ?? group;

interface CommandPaletteProps {
  entries: PaletteEntry[];
  /** The book's labels, each a chip as the kinds are. */
  labels: Label[];
  onClose: () => void;
  onSearch: (text: string) => void;
}

const MAX_RESULTS = 40;

// The uses are read once as the palette opens; a chosen kind or label shows all it keeps.
function useMatches(filter: ReturnType<typeof usePaletteFilter>, query: string) {
  const [uses] = useState(readUses);
  const shown = filter.isNarrowed && !query.trim() ? filter.kept : null;
  return (shown ?? searchPalette(filter.kept, query, uses)).slice(0, MAX_RESULTS);
}

function usePaletteSelection(found: PaletteEntry[], onClose: () => void) {
  const [selected, setSelected] = useState(0);
  const choose = (entry: PaletteEntry | undefined) => {
    if (!entry) return;
    onClose();
    recordUse(entry.id);
    entry.run();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (step !== undefined)
      setSelected((current) => (current + step + found.length) % Math.max(found.length, 1));
    if (event.key === "Enter") choose(found[selected]);
    if (event.key === "Escape") onClose();
    if (step !== undefined || event.key === "Enter" || event.key === "Escape")
      event.preventDefault();
  };
  return { selected, setSelected, choose, onKeyDown };
}

interface ResultProps {
  found: PaletteEntry[];
  selected: number;
  onHover: (index: number) => void;
  onChoose: (entry: PaletteEntry) => void;
}

function ResultRow({ index, ...props }: ResultProps & { index: number }) {
  const entry = props.found[index];
  const isPhone = usePhone();
  if (!entry) return null;
  const startsGroup = entry.group !== props.found[index - 1]?.group;
  return (
    <>
      {startsGroup && <div className="palette-group">{groupLabel(entry.group)}</div>}
      <div
        role="option"
        aria-selected={index === props.selected}
        className="palette-row"
        onMouseMove={() => props.onHover(index)}
        onClick={() => props.onChoose(entry)}
      >
        <span className="palette-name">
          <NoteKindIcon kind={entry.kind} />
          <span className="palette-label">{entry.label}</span>
        </span>
        <span className="palette-hint">
          {isPhone ? entry.hint : (entry.shortcut ?? entry.hint)}
        </span>
      </div>
    </>
  );
}

function ResultList(props: ResultProps) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector("[aria-selected=true]")?.scrollIntoView({ block: "nearest" });
  }, [props.selected]);
  if (props.found.length === 0) return <p className="palette-empty">{t("Inga träffar")}</p>;
  return (
    <div className="palette-results" role="listbox" ref={listRef}>
      {props.found.map((entry, index) => (
        <ResultRow key={entry.id} index={index} {...props} />
      ))}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function PaletteInput(props: {
  query: string;
  onQuery: (query: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="palette-search">
      <SearchIcon />
      <input
        autoFocus
        placeholder={usePhone() ? t("Sök…") : t("Sök scen, kapitel, karaktär eller kommando")}
        aria-label={t("Sök scen, kapitel, karaktär eller kommando")}
        value={props.query}
        onChange={(event) => props.onQuery(event.target.value)}
        onKeyDown={props.onKeyDown}
      />
    </label>
  );
}

function searchEntry(query: string, onSearch: (text: string) => void): PaletteEntry[] {
  const text = query.trim();
  if (!text) return [];
  const label = t("Sök ”{text}” i hela boken", { text });
  return [
    {
      id: "kommando:sök",
      label,
      group: "Kommandon",
      run: () => onSearch(text),
      shortcut: shortcutOf("search"),
    },
  ];
}

export function CommandPalette({ entries, labels, onClose, onSearch }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const filter = usePaletteFilter(entries, labels);
  const matches = useMatches(filter, query);
  const found = inResultGroups([...matches, ...searchEntry(query, onSearch)]);
  const selection = usePaletteSelection(found, onClose);
  return (
    <div className="palette-backdrop" onPointerDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-label={t("Kommandopalett")}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <PaletteInput
          query={query}
          onQuery={(next) => (setQuery(next), selection.setSelected(0))}
          onKeyDown={selection.onKeyDown}
        />
        <PaletteFilters {...filter} onPicked={() => selection.setSelected(0)} />
        <ResultList
          found={found}
          selected={selection.selected}
          onHover={selection.setSelected}
          onChoose={selection.choose}
        />
      </div>
    </div>
  );
}
