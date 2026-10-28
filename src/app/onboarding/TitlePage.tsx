import type { ProjectDetails } from "../../project/newProject.js";
import { structures, templatePieces, type BookTemplate } from "../../project/templates.js";
import { formatNumber, numberLocale, t } from "../../i18n/i18n.js";
import { typeLabel } from "./BookQuestions.js";
import { chapterCount } from "./BookShape.js";
import { hasGenre } from "./books.js";

// The open book's right page: the book's title page, written as the writer answers.

const DAY = 86_400_000;
const WORDS_PER_PAGE = 250;

const longDate = (date: Date) =>
  date.toLocaleDateString(numberLocale(), { day: "numeric", month: "long", year: "numeric" });

/** What the goals mean for the draft: the words a day a deadline asks for, or the month the daily
 * goal finishes it in. "" without the book's length, or without either goal. */
export function forecast(details: ProjectDetails, today: Date) {
  const words = details.totalGoal ?? 0;
  const start = new Date(today).setHours(0, 0, 0, 0);
  if (!words) return "";
  if (details.deadline) {
    const end = new Date(`${details.deadline}T00:00`);
    const days = Math.round((end.getTime() - start) / DAY);
    if (!(days > 0)) return t("Den dagen har redan varit. Välj en senare deadline.");
    const perDay = Math.max(10, Math.ceil(words / days / 10) * 10);
    return t("För att hinna till {day} räcker det med cirka {words} ord om dagen.", {
      day: longDate(end),
      words: formatNumber(perDay),
    });
  }
  if (!details.dailyGoal) return "";
  const end = new Date(start + Math.ceil(words / details.dailyGoal) * DAY);
  const month = end.toLocaleDateString(numberLocale(), { month: "long", year: "numeric" });
  return t("Med {words} ord om dagen är utkastet klart i {month}.", {
    words: formatNumber(details.dailyGoal),
    month,
  });
}

function structureLine(details: ProjectDetails, own: BookTemplate[]) {
  const structure = [...structures(), ...own].find((each) => each.id === details.structure);
  if (!structure) return "";
  const chapters = chapterCount(structure);
  if (!chapters) return t("{name}, du bygger den själv", { name: structure.name });
  if (details.isPlanned === false)
    return t("{name} · ett första kapitel", { name: structure.name });
  return t("{name} · {count} kapitel", { name: structure.name, count: chapters });
}

const pagesLine = (words: number) =>
  t("cirka {pages} sidor", { pages: formatNumber(Math.round(words / WORDS_PER_PAGE)) });

function kindOf(details: ProjectDetails) {
  const genre = hasGenre(details.type) ? details.genre : "";
  const named = templatePieces().find((piece) => piece.id === genre);
  return named?.name ?? typeLabel(details.type);
}

function Foot(props: { details: ProjectDetails; step: number; own: BookTemplate[] }) {
  const { details } = props;
  const words = details.totalGoal ?? 0;
  const ahead = props.step > 1 ? forecast(details, new Date()) : "";
  const shape = props.step > 1 ? structureLine(details, props.own) : "";
  const struct = [shape, words && props.step > 1 ? pagesLine(words) : ""].filter(Boolean);
  return (
    <div className="nb-tp-foot">
      {ahead && <span className="nb-tp-forecast">{ahead}</span>}
      {struct.length > 0 && <span>{struct.join(" · ")}</span>}
      <span>{t("Påbörjad {date}", { date: longDate(new Date()) })}</span>
    </div>
  );
}

export function TitlePage(props: {
  details: ProjectDetails;
  author: string;
  step: number;
  own: BookTemplate[];
}) {
  const title = props.details.title.trim();
  return (
    <section className="nb-page nb-title-page" aria-label={t("Titelsidan")}>
      <span className="nb-tp-kind">{kindOf(props.details)}</span>
      <div className="nb-tp-middle">
        <span className={title ? "nb-tp-title" : "nb-tp-title untitled"}>
          {title || t("Utan titel")}
        </span>
        <span className="nb-tp-rule" />
        {props.author && (
          <span className="nb-tp-by">{t("av {author}", { author: props.author })}</span>
        )}
      </div>
      <Foot details={props.details} step={props.step} own={props.own} />
    </section>
  );
}
