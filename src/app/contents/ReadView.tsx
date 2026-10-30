import { BackButton } from "@llkit/controls.js";
import type { Node } from "prosemirror-model";
import { useEffect, useRef, type RefObject } from "react";
import { readingScenes, type ReadingScene } from "../../project/reading.js";
import { usePhone } from "../phone/usePhone.js";
import type { Project } from "../useProject.js";
import { useEscape } from "@llkit/keys.js";
import { useBookPages, type PageLayout } from "./bookPages.js";
import { ReadSelection, type ReadSaving } from "./ReadSelection.js";
import { SceneText, useSceneDocs, type Docs } from "./sceneDocs.js";
import { chapterLabel } from "../bookLook.js";
import { FRONT_PAGES, ReadFront } from "./ReadFront.js";
import { t } from "../../i18n/i18n.js";

interface ReadViewProps {
  project: Project;
  /** The general author name, for the title page when the book has none of its own. */
  author: string;
  /** The book opens on this scene's page. */
  startScene: string | null;
  saving: ReadSaving;
  /** "Skriv här": the scene opens in Skriv with the cursor at that paragraph. */
  onOpenAt: (sceneId: string, blockIndex: number) => void;
  onBack: () => void;
  onDesign: () => void;
  /** Saves the open scene first, so what was written a moment ago is read too. */
  beforeRead: () => Promise<unknown>;
}

function ReadScene(props: {
  scene: ReadingScene;
  doc: Node | undefined;
  fields: Project["fields"];
}) {
  const { scene, doc } = props;
  const opens = scene.chapter?.isFirstScene === true;
  return (
    <section
      className={opens ? "read-scene opens-chapter" : "read-scene"}
      data-scene={scene.sceneId}
    >
      {opens && scene.chapter && (
        <header className="read-chapter">
          <span className="read-chapter-number">
            {chapterLabel(props.fields, scene.chapter.number, scene.chapter.title)}
          </span>
          <h2 className="read-chapter-title">{scene.chapter.title}</h2>
        </header>
      )}
      <SceneText doc={doc} />
    </section>
  );
}

// The chapter the left page belongs to.
function chapterAt(scenes: ReadingScene[], layout: PageLayout, page: number) {
  const shown = scenes.filter((scene) => (layout.sceneStarts.get(scene.sceneId) ?? 0) <= page);
  return shown[shown.length - 1]?.chapter ?? null;
}

function placeText(scenes: ReadingScene[], layout: PageLayout, pages: number[]) {
  const chapter = chapterAt(scenes, layout, pages[0] ?? 0);
  const numbers = pages
    .filter((page) => page >= FRONT_PAGES && page < layout.count)
    .map((page) => page - FRONT_PAGES + 1);
  const count = layout.count - FRONT_PAGES;
  if (numbers.length === 0) return t("Titelsidan");
  const page = t("sida {pages} av {count}", { pages: numbers.join("–"), count });
  return chapter ? `${chapter.number}. ${chapter.title} · ${page}` : page;
}

// Left pages carry the chapter, right pages the book's title, as in a printed book.
function PageChrome(props: {
  pages: number[];
  layout: PageLayout;
  scenes: ReadingScene[];
  title: string;
}) {
  const heads = (page: number) =>
    page % 2 === 0 ? (chapterAt(props.scenes, props.layout, page)?.title ?? "") : props.title;
  const isText = (page: number) => page >= FRONT_PAGES && page < props.layout.count;
  return props.pages.map((page) => (
    <div key={page} className="read-page" aria-hidden="true">
      {isText(page) && !props.layout.chapterStarts.has(page) && (
        <span className="read-page-head">{heads(page)}</span>
      )}
      {isText(page) && <span className="read-page-number">{page - FRONT_PAGES + 1}</span>}
    </div>
  ));
}

export function useTurnKeys(turn: (step: number) => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement)
        return;
      if (event.key === "ArrowRight" || event.key === "PageDown") turn(1);
      if (event.key === "ArrowLeft" || event.key === "PageUp") turn(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
}

function TurnButton({ step, onTurn }: { step: 1 | -1; onTurn: (step: number) => void }) {
  return (
    <button
      className="read-turn"
      aria-label={step < 0 ? t("Föregående uppslag") : t("Nästa uppslag")}
      onClick={() => onTurn(step)}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path d={step < 0 ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
      </svg>
    </button>
  );
}

function ReadFoot(props: {
  first: number;
  count: number;
  perSpread: number;
  goTo: (page: number) => void;
}) {
  return (
    <footer className="read-foot">
      <span>{t("Titel")}</span>
      <input
        type="range"
        aria-label={t("Sida")}
        min={0}
        max={props.count - 1}
        step={props.perSpread}
        value={props.first}
        onChange={(event) => props.goTo(Number(event.target.value))}
      />
      <span>{props.count - FRONT_PAGES}</span>
    </footer>
  );
}

function ReadHead(props: ReadViewProps & { place: string }) {
  return (
    <header className="read-head">
      <BackButton label={t("Tillbaka till texten")} hint="Esc" onBack={props.onBack} />
      <span className="read-place">{props.place}</span>
      <span className="read-head-end">
        <button className="link-button quiet" onClick={props.onDesign}>
          {t("Ändra utseende")}
        </button>
      </span>
    </header>
  );
}

function BookFlow(props: {
  flow: RefObject<HTMLDivElement | null>;
  scenes: ReadingScene[];
  docs: Docs | null;
  first: number;
  project: Project;
  author: string;
}) {
  return (
    <div
      ref={props.flow}
      className="manuscript read-flow"
      style={{ "--first": props.first } as object}
    >
      <ReadFront project={props.project} author={props.author} />
      {props.scenes.length === 0 && <p>{t("Inga scener än.")}</p>}
      {props.scenes.map((scene) => (
        <ReadScene
          key={scene.sceneId}
          scene={scene}
          doc={props.docs?.[scene.sceneId]}
          fields={props.project.fields}
        />
      ))}
    </div>
  );
}

/** Läs som bok: the book in spreads of pages, turned like a book, corrected right in the page. */
export function ReadView(props: ReadViewProps) {
  const { project } = props;
  const scenes = readingScenes(project.tree);
  const ids = scenes.map((scene) => scene.sceneId);
  const docs = useSceneDocs(project, ids, props.beforeRead);
  const flow = useRef<HTMLDivElement>(null);
  const perSpread = usePhone() ? 1 : 2;
  const { layout, first, goTo, turn } = useBookPages(flow, perSpread, docs, props.startScene);
  const pages = Array.from({ length: perSpread }, (_unused, index) => first + index);
  useEscape(props.onBack);
  useTurnKeys(turn);
  return (
    <main className="read-view">
      <ReadHead {...props} place={placeText(scenes, layout, pages)} />
      <div className="read-stage">
        <TurnButton step={-1} onTurn={turn} />
        <div className={perSpread === 1 ? "read-spread single" : "read-spread"}>
          <PageChrome pages={pages} layout={layout} scenes={scenes} title={project.name} />
          <BookFlow {...{ flow, scenes, docs, first, project }} author={props.author} />
        </div>
        <TurnButton step={1} onTurn={turn} />
      </div>
      <ReadFoot first={first} count={layout.count} perSpread={perSpread} goTo={goTo} />
      <ReadSelection flow={flow} saving={props.saving} onWriteHere={props.onOpenAt} />
    </main>
  );
}
