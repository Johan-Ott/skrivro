import { t } from "../../../../src/i18n/i18n.js";
import { daysBetween } from "../../../../src/project/progress.js";
import type { Celebration } from "../../../../src/project/inkwell.js";

/** Three days or more since the writer was last here: welcomed back, told where they stopped. */
export function welcomeBack(
  lastDay: string,
  today: string,
  chapter: string | null,
): Celebration | null {
  if (daysBetween(lastDay, today) < 3) return null;
  const text = chapter
    ? t("Boken väntade. Du slutade i {chapter}.", { chapter })
    : t("Boken väntade på dig.");
  return { kind: "back", title: t("Välkommen tillbaka."), text };
}
