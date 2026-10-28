// Delen av ContentsView.tsx som delade hela boken. Importerna: pagesAtGoal, projectGoals, manuscriptWords,
// dayKey, streak, formatNumber, t, useState, ShareSpreadDialog.

// The words toward the goal and the days in a row, as a writer would tell it.
function progressLine(project: Project, stats: Stats) {
  const words = formatNumber(manuscriptWords(project.tree, project.summaries));
  const goal = projectGoals(project.fields).totalGoal;
  const days = streak(stats, dayKey(Date.now()));
  return [
    goal
      ? t("{words} av {goal} ord", { words, goal: formatNumber(goal) })
      : t("{count} ord", { count: words }),
    days > 1 && t("{count} dagar i rad", { count: days }),
  ]
    .filter(Boolean)
    .join(" · ");
}

// The whole book's pages as a picture: what is written, and outlined pages for what is left.
function ShareBook({
  project,
  pageMap,
  stats,
}: Pick<ContentsProps, "project" | "stats"> & { pageMap: PageMap }) {
  const [isOpen, setOpen] = useState(false);
  const share = {
    title: project.name,
    pages: [],
    firstNumber: 1,
    written: pageMap.pages,
    total: pagesAtGoal(
      manuscriptWords(project.tree, project.summaries),
      projectGoals(project.fields).totalGoal,
      pageMap.pages,
    ),
    progress: progressLine(project, stats),
  };
  return (
    <>
      <button className="link-button quiet contents-read" onClick={() => setOpen(true)}>
        {t("Dela hela boken")}
      </button>
      {isOpen && <ShareSpreadDialog share={share} onClose={() => setOpen(false)} />}
    </>
  );
}

