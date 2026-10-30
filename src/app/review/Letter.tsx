import { useMemo, useState } from "react";
import { parseMarkdown } from "../../manuscript/parseMarkdown.js";
import { readingScenes } from "../../project/reading.js";
import type { SceneChapter } from "../../project/treeLabels.js";
import type { Round, SceneBack } from "../../project/rounds.js";
import type { AppState } from "../App.js";
import { SceneText } from "../contents/sceneDocs.js";
import { openIfOnDisk } from "../useSceneSession.js";
import type { Project } from "../useProject.js";
import { formatNumber, t } from "../../i18n/i18n.js";
import type { ShownRound } from "./useRounds.js";
import {
  added,
  bothText,
  countParts,
  datesText,
  firstName,
  shortDate,
  totalOf,
} from "./roundWords.js";

type Returned = { key: string; sceneId: string; label: string; back: SceneBack };

const labelOf = (project: Project, sceneId: string, chapter: SceneChapter | null) =>
  chapter
    ? t("Kapitel {number} · {title}", { number: chapter.number, title: chapter.title })
    : (project.summaries[sceneId]?.title ?? "");

// What came back, a line per chapter in reading order; a scene outside a chapter has its own.
function returnedPerChapter(project: Project, round: Round): Returned[] {
  const lines = new Map<string, Returned>();
  for (const { sceneId, chapter } of readingScenes(project.tree)) {
    const back = round.back[sceneId];
    if (!back) continue;
    const key = chapter?.id ?? sceneId;
    const line = lines.get(key);
    if (line) line.back = added(line.back, back);
    else lines.set(key, { key, sceneId, label: labelOf(project, sceneId, chapter), back });
  }
  return [...lines.values()];
}

/** Börja genomgången: the letter is read, and the first scene with something in it opens. */
export function startWalk(app: AppState, project: Project, round: Round) {
  app.rounds.finish();
  const first = readingScenes(project.tree).find(({ sceneId }) => round.back[sceneId]);
  if (first) openIfOnDisk(app.session, project, first.sceneId);
}

function Returned({ app, project, round }: { app: AppState; project: Project; round: Round }) {
  const lines = returnedPerChapter(project, round);
  const counts = bothText(countParts(totalOf(round)));
  return (
    <>
      <h2>{t("Det här kom tillbaka")}</h2>
      {lines.length === 0 && <p>{t("Ingen har ändrat något i texten.")}</p>}
      <ul className="round-returned">
        {lines.map((line) => (
          <li key={line.key}>
            <button
              className="link-button"
              onClick={() => openIfOnDisk(app.session, project, line.sceneId)}
            >
              {line.label}
            </button>
            <span>{countParts(line.back).join(", ")}</span>
          </li>
        ))}
      </ul>
      <p className="round-total">
        {lines.length > 0 &&
          t("{counts} i {count} kapitel", { counts, count: formatNumber(lines.length) })}
        <button className="button primary" onClick={() => startWalk(app, project, round)}>
          {t("Börja genomgången")}
        </button>
      </p>
    </>
  );
}

// The answer is kept with the latest round and is the first page of the next file.
function Answer({ app, round }: { app: AppState; round: Round }) {
  const [answer, setAnswer] = useState(round.answer);
  const name = firstName(round);
  return (
    <>
      <h2>{t("Ditt svar till {name}", { name })}</h2>
      <textarea
        rows={4}
        aria-label={t("Ditt svar till {name}", { name })}
        placeholder={t("Tack! Det här tar jag med mig till nästa version…")}
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
      />
      <p className="round-total">
        {t(
          "Nästa omgång skickas med Skicka till redaktör. Ditt svar blir då första sidan i filen.",
        )}
        <button
          className="button small secondary"
          disabled={answer === round.answer}
          onClick={() => app.rounds.saveAnswer(answer)}
        >
          {t("Spara svaret")}
        </button>
      </p>
    </>
  );
}

function Rounds({ app, number }: { app: AppState; number: number }) {
  return (
    <>
      <h2>{t("Omgångar")}</h2>
      <ol className="round-list">
        {app.rounds.rounds.map((round, index) => (
          <li key={round.backAt} aria-current={index + 1 === number}>
            <button className="link-button" onClick={() => app.rounds.open(index)}>
              {`${formatNumber(index + 1)} · ${firstName(round)}`}
            </button>
            <span>{datesText(round)}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

function ShownLetter({
  app,
  project,
  round,
  number,
}: { app: AppState; project: Project } & ShownRound) {
  const doc = useMemo(() => parseMarkdown(round.letter), [round.letter]);
  const name = firstName(round);
  const from = t("Omgång {number} · från {editor}", { number, editor: round.editor || name });
  return (
    <section className="text-header round-letter" aria-label={t("Brev från redaktören")}>
      <div className="text-eyebrow">
        <span className="text-place">{from}</span>
        <span className="eyebrow-end">
          {t("Läst in {date}", { date: shortDate(round.backAt) })}
        </span>
      </div>
      <h1 className="chapter-title">{t("Brev från {name}", { name })}</h1>
      {round.letter ? <SceneText doc={doc} /> : <p>{t("Inget brev den här gången.")}</p>}
      <Returned app={app} project={project} round={round} />
      {number === app.rounds.rounds.length && <Answer key={round.backAt} app={app} round={round} />}
      <Rounds app={app} number={number} />
    </section>
  );
}

/** In Redigera, the editor's letter at the top of the sheet, with what came back and the
 *  writer's answer: until Börja genomgången, or while a round is opened again. */
export function Letter({ app, project }: { app: AppState; project: Project }) {
  const { shown } = app.rounds;
  if (app.writingMode.step !== "redigera" || !shown) return null;
  return <ShownLetter app={app} project={project} {...shown} />;
}
