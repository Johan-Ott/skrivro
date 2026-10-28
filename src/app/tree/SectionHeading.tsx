import type { DragEvent, ReactNode } from "react";
import { Chevron } from "./Chevron.js";
import { t, formatNumber } from "../../i18n/i18n.js";

// A section that folds has its name as a button, with the arrow before it.
const HeadingLabel = (props: { label: string; isFolded?: boolean; onToggle?: () => void }) =>
  props.onToggle ? (
    <button
      className="sidebar-heading-toggle"
      aria-expanded={!props.isFolded}
      onClick={props.onToggle}
    >
      <Chevron isOpen={!props.isFolded} />
      {props.label}
    </button>
  ) : (
    <>{props.label}</>
  );

export function SectionHeading(props: {
  label: string;
  onDrop?: () => void;
  words?: number;
  filter?: ReactNode;
  isFolded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div
      role="none"
      className="sidebar-heading"
      onDragOver={(event: DragEvent) => props.onDrop && event.preventDefault()}
      onDrop={(event: DragEvent) => (event.preventDefault(), props.onDrop?.())}
    >
      <HeadingLabel {...props} />
      {props.filter}
      {props.words !== undefined && (
        <span className="sidebar-heading-words" aria-label={t("Ord i boken")}>
          {formatNumber(props.words)}
        </span>
      )}
    </div>
  );
}
