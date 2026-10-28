import { countMarkdownWords } from "../manuscript/wordCount.js";
import { differingExcerpts, plainText } from "../manuscript/compare.js";
import { splitSceneFile } from "../manuscript/sceneFile.js";
import type { ConflictChoice, DiskConflict } from "./sceneSession.js";
import { t, formatNumber } from "../i18n/i18n.js";

interface ConflictDialogProps {
  sceneTitle: string;
  conflict: DiskConflict;
  onChoose: (choice: ConflictChoice) => void;
  /** Who made the other version, when that is known, for example "Elins iPhone". */
  otherLabel?: string | undefined;
  text?: string;
  /** A note's unanswered template prompts are not counted as words. */
  isNote?: boolean;
  /** A sync copy can wait; a conflict in the open scene cannot, so it has no "Senare". */
  onLater?: (() => void) | undefined;
}

const EDITED_ELSEWHERE = t(
  "Scenen ändrades i en annan app eller på en annan enhet medan du skrev. Inget har raderats.",
);

/** Counted as the tree counts the scene, so the two numbers agree. */
export const versionWords = (body: string, isNote = false) => countMarkdownWords(body, isNote);

function VersionCard(props: { label: string; words: number; excerpt: string }) {
  return (
    <div className="version-card">
      <span className="version-label">{props.label}</span>
      <span className="version-meta">{t("{count} ord", { count: formatNumber(props.words) })}</span>
      <span className="version-excerpt">{props.excerpt}</span>
    </div>
  );
}

function ConflictActions({ onChoose, onLater }: Pick<ConflictDialogProps, "onChoose" | "onLater">) {
  return (
    <div className="dialog-actions">
      {onLater && (
        <button className="link-button quiet push-left" onClick={onLater}>
          {t("Senare")}
        </button>
      )}
      <button className="button secondary" onClick={() => onChoose("theirs")}>
        {t("Behåll den andra")}
      </button>
      <button className="button secondary" onClick={() => onChoose("mine")}>
        {t("Behåll den här enhetens")}
      </button>
      <button className="button primary" onClick={() => onChoose("both")} autoFocus>
        {t("Behåll båda")}
      </button>
    </div>
  );
}

// Each version with its words, counted as the tree counts them, and where it differs.
function Versions(props: {
  mine: string;
  theirs: string;
  otherLabel?: string | undefined;
  isNote?: boolean;
}) {
  const { mine, theirs } = props;
  const excerpts = differingExcerpts(plainText(mine), plainText(theirs));
  return (
    <div className="version-grid">
      <VersionCard
        label={t("Den här enheten")}
        words={versionWords(mine, props.isNote)}
        excerpt={excerpts.mine}
      />
      <VersionCard
        label={props.otherLabel ?? t("Den andra versionen")}
        words={versionWords(theirs, props.isNote)}
        excerpt={excerpts.theirs}
      />
    </div>
  );
}

export function ConflictDialog(props: ConflictDialogProps) {
  const { sceneTitle, conflict, onChoose } = props;
  const mine = splitSceneFile(conflict.editorText).body;
  const theirs = splitSceneFile(conflict.diskText).body;
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
        <div className="dialog-heading">
          <span id="conflict-title" className="dialog-title">
            {t("Två versioner av ”{title}”", { title: sceneTitle })}
          </span>
          <span className="dialog-text">{props.text ?? EDITED_ELSEWHERE}</span>
        </div>
        <Versions mine={mine} theirs={theirs} {...props} />
        <ConflictActions onChoose={onChoose} onLater={props.onLater} />
      </div>
    </div>
  );
}
