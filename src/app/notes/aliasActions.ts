import { withAliases } from "../../project/aliases.js";
import type { AppState } from "../App.js";
import { changeFrontMatter } from "../sceneSession.js";
import type { Project } from "../useProject.js";

/** Writes a note's aliases to its front matter, in the book or in the series it lives in. */
export async function saveAliases(app: AppState, home: Project, id: string, aliases: string[]) {
  await changeFrontMatter(app.session, { dir: home.dir, id }, (frontMatter) =>
    withAliases(frontMatter, aliases),
  );
  await (home === app.project ? app.refresh() : app.seriesState.refreshSeries());
}
