import { useRef, useState } from "react";
import type { NotePageProps } from "./NotePage.js";
import { t } from "../../i18n/i18n.js";

// The parts of a full title, offered until they are other names: "Erik", "Holm". Nothing is
// linked by a part until the writer picks it, since "Doktor" of "Doktor Holm" would link every doctor.
export function titleParts(title: string) {
  const words = title.trim().split(/\s+/);
  return words.length > 1 ? [...new Set(words.filter((word) => word.length > 1))] : [];
}

function AddAlias(props: { onAdd: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  // The field leaves the page on Escape and the browser may blur it then: that adds nothing.
  const isCancelled = useRef(false);
  const add = () => (name.trim() && !isCancelled.current ? props.onAdd(name) : props.onCancel());
  const onKey = (key: string) => {
    if (key === "Enter") add();
    if (key !== "Escape") return;
    isCancelled.current = true;
    props.onCancel();
  };
  return (
    <input
      autoFocus
      className="alias-input"
      aria-label={t("Ett annat namn")}
      placeholder={t("till exempel Eken")}
      value={name}
      onChange={(event) => setName(event.target.value)}
      onBlur={add}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === "Escape") event.preventDefault();
        onKey(event.key);
      }}
    />
  );
}

const AliasChip = (props: { alias: string; onRemove: () => void }) => (
  <span className="connection">
    <span className="connection-name">{props.alias}</span>
    <button className="connection-remove" aria-label={t("Ta bort namnet")} onClick={props.onRemove}>
      ×
    </button>
  </span>
);

const Suggestions = (props: { title: string; taken: string[]; onPick: (part: string) => void }) =>
  titleParts(props.title)
    .filter((part) => !props.taken.includes(part))
    .map((part) => (
      <button
        key={part}
        className="alias-suggestion"
        title={t("Länka anteckningen även när bara det här står i texten")}
        onClick={() => props.onPick(part)}
      >
        {part}
      </button>
    ));

/** The note's other names, which link it in the text as its title does: `aliases:` in its front
 * matter. */
export function Aliases(props: NotePageProps) {
  const { project, noteId, onSetAliases } = props;
  const summary = project.summaries[noteId];
  const aliases = summary?.aliases ?? [];
  const [isAdding, setAdding] = useState(false);
  const add = (name: string) => (onSetAliases([...aliases, name]), setAdding(false));
  return (
    <div className="connections aliases">
      {aliases.map((alias) => (
        <AliasChip
          key={alias}
          alias={alias}
          onRemove={() => onSetAliases(aliases.filter((other) => other !== alias))}
        />
      ))}
      <Suggestions title={summary?.title ?? ""} taken={aliases} onPick={add} />
      {isAdding ? (
        <AddAlias onAdd={add} onCancel={() => setAdding(false)} />
      ) : (
        <button className="connection-add" onClick={() => setAdding(true)}>
          {t("+ Andra namn")}
        </button>
      )}
    </div>
  );
}
