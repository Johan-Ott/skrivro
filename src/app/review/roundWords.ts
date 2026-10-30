import type { Round, SceneBack } from "../../project/rounds.js";
import { formatNumber, numberLocale, t } from "../../i18n/i18n.js";

/** Only what there is: "2 ändringar", not "2 ändringar, 0 kommentarer". */
export function countParts({ changes, comments }: SceneBack): string[] {
  const parts = [
    changes > 0 &&
      (changes === 1 ? t("1 ändring") : t("{count} ändringar", { count: formatNumber(changes) })),
    comments > 0 &&
      (comments === 1
        ? t("1 kommentar")
        : t("{count} kommentarer", { count: formatNumber(comments) })),
  ];
  return parts.filter((part) => part !== false);
}

export const added = (one: SceneBack, other: SceneBack): SceneBack => ({
  changes: one.changes + other.changes,
  comments: one.comments + other.comments,
});

/** All a round brought back, in every scene. */
export const totalOf = (round: Round) =>
  Object.values(round.back).reduce(added, { changes: 0, comments: 0 });

/** "14 ändringar och 9 kommentarer". */
export function bothText(parts: string[]) {
  const [first = "", second] = parts;
  return second ? t("{first} och {second}", { first, second }) : first;
}

/** The editor as the letter is signed, by first name; "redaktören" when the file did not say. */
export const firstName = (round: Round) => round.editor.trim().split(/\s+/)[0] || t("redaktören");

/** "2 nov". */
export const shortDate = (time: number) =>
  new Date(time).toLocaleDateString(numberLocale(), { day: "numeric", month: "short" });

/** "Skickad 12 okt, tillbaka 2 nov"; the file may not say when it was made. */
export const datesText = (round: Round) =>
  round.sentAt
    ? t("Skickad {sent}, tillbaka {back}", {
        sent: shortDate(round.sentAt),
        back: shortDate(round.backAt),
      })
    : t("Tillbaka {back}", { back: shortDate(round.backAt) });
