import type { ReactNode } from "react";
import type { NoteKind } from "../../project/noteKinds.js";
import { Icon } from "../shell/icons.js";
import { t } from "../../i18n/i18n.js";

// A sheet with a folded corner, for every kind of file.
const Sheet = ({ children }: { children?: ReactNode }) => (
  <Icon size={13}>
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4" />
    {children}
  </Icon>
);

const DRAWINGS: Record<NoteKind, ReactNode> = {
  picture: (
    <Icon size={13}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m21 16-5-5-9 8" />
    </Icon>
  ),
  pdf: (
    <Sheet>
      <path d="M9 17h6" />
    </Sheet>
  ),
  text: (
    <Sheet>
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </Sheet>
  ),
  file: <Sheet />,
  guide: (
    <Icon size={13}>
      <path d="M12 3v18" />
      <path d="M5 6h11l3 3-3 3H5z" />
    </Icon>
  ),
};

const names = (): Record<NoteKind, string> => ({
  picture: t("Bild"),
  pdf: t("PDF"),
  text: t("Textfil"),
  file: t("Fil"),
  guide: t("Guide"),
});

/** A small sign before a row that is not a plain note: a picture, a PDF, a guide. */
export function NoteKindIcon({ kind }: { kind: NoteKind | null | undefined }) {
  if (!kind) return null;
  return (
    <span className="note-kind" role="img" title={names()[kind]} aria-label={names()[kind]}>
      {DRAWINGS[kind]}
    </span>
  );
}
