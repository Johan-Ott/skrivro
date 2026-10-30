import type { SceneStatus } from "../../manuscript/sceneFile.js";
import type { Label } from "../../project/labels.js";
import type { StatusStep } from "../../project/statusSteps.js";
import { t } from "../../i18n/i18n.js";

/** The small signs on a tree row: its step, its labels, whose eyes, and in Redigera what waits. */

type RowStatus = (StatusStep & { id: SceneStatus }) | null;

// A scene's step stands before its name, as the design draws it; an idea is only an outline.
export function StatusDot({ status }: { status: RowStatus }) {
  if (!status) return null;
  return (
    <span
      className={`tree-dot tree-status${status.color ? "" : " outlined"}`}
      title={status.name}
      aria-label={status.name}
      style={{ background: status.color }}
    />
  );
}

export function LabelDots({ dots }: { dots: Label[] }) {
  if (dots.length === 0) return null;
  return (
    <span className="tree-dots" aria-label={dots.map((dot) => dot.name).join(", ")}>
      {dots.map((dot) => (
        <span
          key={dot.id}
          className="tree-dot"
          title={dot.name}
          style={{ background: dot.color }}
        />
      ))}
    </span>
  );
}

// Drawn from its attribute, so the name is not a second "Elin" among the rows' own text.
export const PovTag = ({ pov }: { pov: string }) => (
  <span className="tree-pov" data-pov={pov} title={t("Vems ögon: {pov}", { pov })} />
);

// In Redigera, what waits in the scene; nothing at 0.
export const LeftPill = ({ left }: { left: number }) =>
  left > 0 ? (
    <span className="tree-left" title={t("{count} att gå igenom", { count: left })}>
      {left}
    </span>
  ) : null;
