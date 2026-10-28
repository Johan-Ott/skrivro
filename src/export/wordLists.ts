import { AlignmentType, LevelFormat } from "docx";

// Lists as Word's own, so they can be continued and changed there, not a typed "•" and a tab.

const INDENT = 720;
const HANG = { paragraph: { indent: { left: INDENT, hanging: INDENT / 2 } } };

export const LIST_STYLES = new Set(["punktlista", "numrerad"]);

/** For the Document: one bullet list and one numbered list, each started anew by its instance. */
export const listNumbering = {
  config: [
    {
      reference: "punktlista",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", style: HANG }],
    },
    {
      reference: "numrerad",
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.START,
          style: HANG,
        },
      ],
    },
  ],
};

/** Counts the lists in the manuscript, so each numbered list starts again at 1. */
export interface WordLists {
  count: number;
}

/** A list's paragraphs belong to the same instance; the next list gets a new one. */
export function listItem(lists: WordLists, style: string) {
  return { numbering: { reference: style, level: 0, instance: lists.count } };
}
