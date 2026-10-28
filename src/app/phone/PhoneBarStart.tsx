import type { AppState } from "../App.js";
import { useMenuButton } from "@llkit/Menu.js";
import { sidebarProps } from "../paneProps.js";
import { ProfileButton } from "../profile/ProfileLayer.js";
import { MenuIcon, SearchIcon } from "../shell/icons.js";
import { useMenuDialogs } from "../shell/useAppMenu.js";
import { useTemplatesDialog, useThemeDialog } from "../Sidebar.js";
import type { Project } from "../useProject.js";
import { phoneMenu } from "./phoneMenu.js";
import { t } from "../../i18n/i18n.js";

// Every tab's bar starts with the menu and the profile and ends with Sök, as the computer's top
// bar has them wherever the writer is.

type Props = { app: AppState; project: Project };

export function PhoneBarStart({ app, project, onReview }: Props & { onReview?: () => void }) {
  const dialogs = useMenuDialogs({ app, project });
  const bookProps = sidebarProps(app, project);
  const theme = useThemeDialog(bookProps);
  const templates = useTemplatesDialog(bookProps);
  const menu = useMenuButton(t("Meny"), phoneMenu(app, dialogs, { theme, templates }, onReview));
  return (
    <span className="phone-bar-start">
      <button className="topbar-button" aria-label={t("Meny")} onClick={menu.open}>
        <MenuIcon />
      </button>
      <ProfileButton app={app} />
      {menu.menu}
      {dialogs.layers}
      {theme.dialog}
      {templates.dialog}
    </span>
  );
}

export const SearchButton = ({ app }: { app: AppState }) => (
  <button className="topbar-button" aria-label={t("Sök")} onClick={app.palette.open}>
    <SearchIcon />
  </button>
);
