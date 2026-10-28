import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { recordFailure } from "@llkit/errorLog.js";
import { readBook, type ShelfBook } from "../../project/shelf.js";
import type { ProjectDetails } from "../../project/newProject.js";
import { platform } from "../platform.js";
import { EASE, canMove, flipTo } from "../motion.js";
import { t } from "../../i18n/i18n.js";

// A made book does not open at once: it flies from the title page to its place on the shelf,
// glows where it landed, and a note under the shelf offers to begin writing it.

/** The book just made, and where its cover stood on the title page. */
export type Arrival = { book: ShelfBook; from: DOMRect | null };

const GLOW_MS = 1700;
const CHEER_MS = 8000;

// The cover goes from the title page in an arc, a little above the straight line.
function fly(cover: HTMLElement, from: DOMRect) {
  cover.scrollIntoView({ block: "nearest" });
  const to = cover.getBoundingClientRect();
  const x = from.left - to.left;
  const y = from.top - to.top;
  const scale = from.width / to.width;
  return cover.animate(
    [
      { transform: flipTo(from, to), opacity: 0 },
      { opacity: 1, offset: 0.2 },
      {
        transform: `translate(${x / 2}px, ${y / 2 - 28}px) scale(${(1 + scale) / 2}) rotate(-2deg)`,
        offset: 0.6,
      },
      { transform: "none", opacity: 1 },
    ],
    { duration: 600, easing: EASE },
  );
}

/** The class a book on the shelf carries while it flies in and while it glows. */
export function useLanding(arriving: Arrival | null | undefined, dir: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState("");
  const from = arriving?.book.dir === dir ? arriving.from : undefined;
  useLayoutEffect(() => {
    const cover = ref.current?.querySelector<HTMLElement>(".book-cover");
    if (from === undefined || !cover) return;
    let timer = 0;
    const land = () => {
      setPhase("landed");
      timer = window.setTimeout(() => setPhase(""), GLOW_MS);
    };
    if (from && canMove()) {
      setPhase("flying");
      fly(cover, from).onfinish = land;
    } else land();
    return () => window.clearTimeout(timer);
  }, [from]);
  return { ref, className: phase };
}

/** The note under the shelf after a book is made, gone by itself after a while. */
export function Cheer(props: { title: string; onWrite: () => void; onDone: () => void }) {
  const { onDone } = props;
  useEffect(() => {
    const timer = window.setTimeout(onDone, CHEER_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return (
    <div className="cheer" role="status">
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="8.5" />
        <path d="M6.2 10.3l2.6 2.6 5-5.4" />
      </svg>
      {t("”{title}” står på hyllan.", { title: props.title })}
      <button className="button primary small" onClick={props.onWrite}>
        {t("Börja skriva")}
      </button>
    </div>
  );
}

/** Ny bok's create: the book is made and read, and the shelf told it is arriving. */
export function useArrival(create: (details: ProjectDetails) => Promise<string | null>) {
  const [arriving, setArriving] = useState<Arrival | null>(null);
  const onCreate = async (details: ProjectDetails, from: DOMRect | null) => {
    const dir = await create(details);
    if (!dir) return false;
    const book = await readBook(platform.fileSystem, dir).catch(recordFailure("Hyllan"));
    setArriving(book ? { book, from } : null);
    return true;
  };
  const done = useCallback(() => setArriving(null), []);
  return { arriving, onCreate, done };
}
