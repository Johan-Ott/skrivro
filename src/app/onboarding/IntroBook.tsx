import { useEffect, useRef, type RefObject } from "react";
import logo from "../../assets/skrivro-logo.png";
import { BOOK_LANGUAGES } from "../../project/bookLanguage.js";
import { goalForecast, goalOf, type Draft } from "./FirstChoices.js";
import { EASE, canMove, flipTo } from "../motion.js";
import { TURN_EASE } from "./bookMotion.js";
import { numberLocale, t } from "../../i18n/i18n.js";

// Skrivro's own green book beside the first start. It stays shut and wears the answers: the name
// in gold, a ribbon per language, more pages for a bigger goal. Klar opens it, then it flies home.

// Each language's silk, and how far its ribbon hangs out of the book.
const RIBBONS: Record<string, [string, number]> = {
  "sv-SE": ["#2f5d8a", 124],
  "en-GB": ["#8a2f3b", 104],
  "nb-NO": ["#3b6e4f", 136],
  "da-DK": ["#a3542a", 98],
  "fi-FI": ["#4a4f8c", 118],
  "de-DE": ["#555555", 110],
};

const thickness = (goal: number) => (goal > 0 ? Math.min(26, Math.round((goal / 1000) * 14)) : 0);
const thisMonth = () =>
  new Date().toLocaleDateString(numberLocale(), { month: "long", year: "numeric" });

const Ribbons = ({ chosen }: { chosen: string[] }) => (
  <div className="intro-ribbons">
    {BOOK_LANGUAGES.map(([tag]) => {
      const [silk, hang] = RIBBONS[tag] ?? ["#555555", 110];
      return (
        <span
          key={tag}
          className={chosen.includes(tag) ? "intro-ribbon in" : "intro-ribbon"}
          style={{ "--silk": silk, "--hang": `${hang}px` } as object}
        >
          <span>{tag.slice(0, 2).toUpperCase()}</span>
        </span>
      );
    })}
  </div>
);

// Under the cover: the ex libris that Klar opens the book on.
function ExLibris({ draft }: { draft: Draft }) {
  const name = draft.authorName.trim();
  const chosen = BOOK_LANGUAGES.filter(([tag]) => draft.languages.includes(tag));
  return (
    <div className="nb-title-page intro-page">
      <div className="nb-tp-middle">
        <img src={logo} alt="" />
        <span className="nb-tp-kind">Ex libris</span>
      </div>
      <div className="nb-tp-middle">
        <span className={name ? "intro-name" : "intro-name untitled"}>
          {name || t("Ditt namn")}
        </span>
        <span className="nb-tp-rule" />
        <span className="intro-languages">
          {chosen.length
            ? chosen.map(([, native]) => native).join(" · ")
            : t("Inget språk valt än")}
        </span>
      </div>
      <div className="nb-tp-foot">
        <span className="intro-forecast">{goalForecast(goalOf(draft))}</span>
        <span>{t("Skrivro · sedan {date}", { date: thisMonth() })}</span>
      </div>
    </div>
  );
}

const SWEEP = [
  { backgroundPosition: "100% 0", transform: "scale(1.06)" },
  { backgroundPosition: "0% 0", transform: "scale(1)" },
];

// When the writer stops typing their name, a sweep of light goes over the gold.
function useStamp(byline: RefObject<HTMLSpanElement | null>, name: string) {
  useEffect(() => {
    if (!name || !canMove()) return;
    const timer = window.setTimeout(
      () => byline.current?.animate(SWEEP, { duration: 900, easing: EASE }),
      600,
    );
    return () => window.clearTimeout(timer);
  }, [byline, name]);
}

// The cover turns open over the spine, and its inside is the open book's left page.
function Cover({ name, isAsking }: { name: string; isAsking: boolean }) {
  const byline = useRef<HTMLSpanElement>(null);
  useStamp(byline, name);
  return (
    <div className="intro-cover">
      <span className="intro-front">
        <img src={logo} alt="" />
        <span className="intro-title">Skrivro</span>
        <span ref={byline} className={name ? "intro-by" : "intro-by untitled"}>
          {name || (isAsking ? t("Ditt namn") : "")}
        </span>
      </span>
      <span className="intro-back">
        <span>{t("Kapitel 1 väntar.")}</span>
      </span>
    </div>
  );
}

/** Only to look at; the questions are on the card beside it. */
export function IntroBook({ draft, isAsking }: { draft: Draft; isAsking: boolean }) {
  const thick = thickness(goalOf(draft));
  return (
    <div className="intro-book" aria-hidden="true">
      <span className="intro-edge" style={{ width: `${12 + thick}px`, right: `${-7 - thick}px` }} />
      <Ribbons chosen={isAsking ? draft.languages : []} />
      <div className="intro-case">
        <ExLibris draft={draft} />
      </div>
      <Cover name={draft.authorName.trim()} isAsking={isAsking} />
    </div>
  );
}

const wait = (delay: number) => new Promise((done) => window.setTimeout(done, delay));

function turn(book: HTMLElement, isOpening: boolean) {
  const [shut, open] = ["rotateY(0deg)", "rotateY(-180deg)"];
  return book
    .querySelector(".intro-cover")
    ?.animate([{ transform: isOpening ? shut : open }, { transform: isOpening ? open : shut }], {
      duration: 900,
      easing: TURN_EASE,
      fill: "forwards",
    }).finished;
}

// The closed book's cover, lifted out of the page so it outlives the first start.
function ghostOf(front: HTMLElement) {
  const { left, top, width, height } = front.getBoundingClientRect();
  const ghost = front.cloneNode(true) as HTMLElement;
  ghost.classList.add("intro-ghost");
  Object.assign(ghost.style, {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  });
  ghost.style.setProperty("--bw", `${width}px`);
  document.body.append(ghost);
  return ghost;
}

// The cover flies in an arc onto the blank book on the shelf, turns into it, and it glows.
function land(ghost: HTMLElement, cover: HTMLElement) {
  const from = ghost.getBoundingClientRect();
  const to = cover.getBoundingClientRect();
  const [x, y] = [to.left - from.left, to.top - from.top];
  const [wide, tall] = [(1 + to.width / from.width) / 2, (1 + to.height / from.height) / 2];
  const flying = ghost.animate(
    [
      { transform: "none", opacity: 1 },
      {
        transform: `translate(${x / 2}px, ${y / 2 - 40}px) scale(${wide}, ${tall}) rotate(-3deg)`,
        offset: 0.55,
      },
      { opacity: 1, offset: 0.7 },
      { transform: flipTo(to, from), opacity: 0 },
    ],
    { duration: 800, easing: EASE, fill: "forwards" },
  );
  cover.animate([{ opacity: 0 }, { opacity: 0, offset: 0.7 }, { opacity: 1 }], { duration: 800 });
  flying.onfinish = () => {
    ghost.remove();
    const book = cover.closest(".book");
    book?.classList.add("landed");
    window.setTimeout(() => book?.classList.remove("landed"), 1700);
  };
}

// The shelf comes a few frames after the first start is done.
function flyHome(ghost: HTMLElement, frames = 180) {
  const cover = document.querySelector<HTMLElement>(".new-book .book-cover");
  if (cover) return land(ghost, cover);
  if (frames === 0) return ghost.remove();
  requestAnimationFrame(() => flyHome(ghost, frames - 1));
}

/** Klar: the card goes, the book slides to the middle and opens on its ex libris, shuts again,
 * and flies to the shelf that `start` puts up. */
export async function reveal(start: () => Promise<void>) {
  const book = document.querySelector<HTMLElement>(".intro-book");
  const front = book?.querySelector<HTMLElement>(".intro-front");
  if (!book || !front?.checkVisibility() || !canMove()) return start();
  await wait(250);
  book.style.transform = `translateX(${window.innerWidth / 2 - book.getBoundingClientRect().left}px)`;
  await turn(book, true);
  await wait(1500);
  await turn(book, false);
  const ghost = ghostOf(front);
  try {
    await start();
  } catch (error) {
    ghost.remove();
    book.style.transform = "";
    throw error;
  }
  flyHome(ghost);
}
