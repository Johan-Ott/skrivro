import { useEffect, useRef, type RefObject } from "react";
import logo from "../../assets/skrivro-logo.png";
import { BOOK_LANGUAGES } from "../../project/bookLanguage.js";
import { goalOf, type Draft } from "./FirstChoices.js";
import { EASE, canMove, flipTo } from "../motion.js";
import { t } from "../../i18n/i18n.js";

// Skrivro's own green book beside the first start. It wears the answers: the name in gold, a
// ribbon per language, more pages for a bigger goal. On Klar its cover flies to the shelf.

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

function Cover({ name, isAsking }: { name: string; isAsking: boolean }) {
  const byline = useRef<HTMLSpanElement>(null);
  useStamp(byline, name);
  return (
    <span className="intro-front">
      <img src={logo} alt="" />
      <span className="intro-title">Skrivro</span>
      <span ref={byline} className={name ? "intro-by" : "intro-by untitled"}>
        {name || (isAsking ? t("Ditt namn") : "")}
      </span>
    </span>
  );
}

/** Only to look at; the questions are on the card beside it. */
export function IntroBook({ draft, isAsking }: { draft: Draft; isAsking: boolean }) {
  const thick = thickness(goalOf(draft));
  return (
    <div className="intro-book" aria-hidden="true">
      <span className="intro-edge" style={{ width: `${12 + thick}px`, right: `${-7 - thick}px` }} />
      <Ribbons chosen={isAsking ? draft.languages : []} />
      <Cover name={draft.authorName.trim()} isAsking={isAsking} />
    </div>
  );
}

const wait = (delay: number) => new Promise((done) => window.setTimeout(done, delay));

// The book's cover, lifted out of the page so it outlives the first start.
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

/** Klar: the card goes, and the book's cover flies to the shelf that `start` puts up. */
export async function reveal(start: () => Promise<void>) {
  const front = document.querySelector<HTMLElement>(".intro-front");
  if (!front?.checkVisibility() || !canMove()) return start();
  await wait(250);
  const ghost = ghostOf(front);
  try {
    await start();
  } catch (error) {
    ghost.remove();
    throw error;
  }
  flyHome(ghost);
}
