import type { AppState } from "../App.js";
import { chapterOf } from "../../project/treeLabels.js";
import { PhoneBarStart, SearchButton } from "./PhoneBarStart.js";
import type { Project } from "../useProject.js";
import { t, formatNumber } from "../../i18n/i18n.js";

type Props = { app: AppState; project: Project };

// The tabs below lead away, so the bar has no way back; what is in the scene is atop the text.
export function TextBar({ app, project }: Props) {
  const scene = app.scene;
  const chapter = scene ? chapterOf(project.tree, scene.id) : null;
  const words = formatNumber(app.today.words);
  return (
    <header className="phone-bar">
      <PhoneBarStart
        app={app}
        project={project}
        onReview={() => app.writingMode.setReviewOpen(true)}
      />
      <span className="phone-bar-title">
        <span>{chapter?.title ?? scene?.title ?? ""}</span>
        <span className="phone-bar-sub">{t("{count} ord idag", { count: words })}</span>
      </span>
      <span className="phone-bar-end">
        <SearchButton app={app} />
      </span>
    </header>
  );
}
