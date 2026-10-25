import { useMenuButton } from "@llkit/Menu.js";
import { dayText } from "./DayProgress.js";
import { IconButton } from "./IconButton.js";
import type { TopbarProps } from "./Topbar.js";
import { t } from "../../i18n/i18n.js";

// In a narrow window Läs, Fokusläge and the day's words leave the bar, and wait here instead.
export function TopbarMore(
  props: Pick<TopbarProps, "today" | "onRead" | "onFocus" | "onProgress">,
) {
  const menu = useMenuButton(t("Mer"), [
    { label: t("Läs som bok"), onSelect: props.onRead },
    { label: t("Fokusläge"), onSelect: props.onFocus },
    { label: dayText(props.today), separatorBefore: true, onSelect: props.onProgress },
  ]);
  return (
    <>
      <IconButton label={t("Mer")} className="topbar-more" onClick={menu.open}>
        ⋯
      </IconButton>
      {menu.menu}
    </>
  );
}
