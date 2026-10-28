import { useState, type RefObject } from "react";
import { pagesAtGoal, projectGoals } from "../../project/progress.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import { ShareSpreadDialog, type SpreadShare } from "../share/ShareSpreadDialog.js";
import { spreadPages } from "../share/spreadPages.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

const pagesWhenDone = ({ tree, summaries, fields }: Project, written: number) =>
  pagesAtGoal(manuscriptWords(tree, summaries), projectGoals(fields).totalGoal, written);

/** In Läs som bok's header: the spread on show, taken as it is when the button is pressed. */
export function ShareSpreadButton(props: {
  flow: RefObject<HTMLDivElement | null>;
  project: Project;
  first: number;
  perSpread: number;
  count: number;
}) {
  const [share, setShare] = useState<SpreadShare | null>(null);
  const open = () => {
    if (!props.flow.current) return;
    setShare({
      title: props.project.name,
      pages: spreadPages(props.flow.current, props.first, props.perSpread),
      firstNumber: props.first + 1,
      written: props.count,
      total: pagesWhenDone(props.project, props.count),
    });
  };
  return (
    <>
      <button className="button primary small" onClick={open}>
        {t("Dela uppslag")}
      </button>
      {share && <ShareSpreadDialog share={share} onClose={() => setShare(null)} />}
    </>
  );
}
