import { useLayoutEffect, useRef, useState } from "react";
import type { ProjectDetails } from "../../project/newProject.js";
import { Dialog } from "@llkit/controls.js";
import { useOwnTemplates } from "../templates/templateFiles.js";
import { BookTypes, TitleAndGoal, type FieldProps } from "./BookQuestions.js";
import { BookShape, type OwnStructures } from "./BookShape.js";
import { TitlePage } from "./TitlePage.js";
import { plainOf } from "./CoverSwatches.js";
import { hasGenre, withSuggestion } from "./books.js";
import { coverOnTitlePage, grow, leave, shrink, turnPage } from "./bookMotion.js";
import { t } from "../../i18n/i18n.js";

// Ny bok is an open book: a question at a time on its left page, and on the right the title page
// the book gets, written as the writer answers. Its cover is the one the answers give it.

const QUESTIONS = [t("Vad skriver du?"), t("Vilken bok?"), t("Titel, röst och mål")];

type Swapping = { isSwapping: boolean; setSwapping: (isSwapping: boolean) => void };

function Question(
  props: FieldProps & Swapping & OwnStructures & { step: number; libraryDir: string },
) {
  if (props.step === 1) return <BookTypes {...props} />;
  if (props.step === 2) return <BookShape {...props} />;
  return <TitleAndGoal {...props} />;
}

// Only Fortsätt moves on: the choices in a step are buttons too, and pressing one only chooses.
function Steps(props: {
  step: number;
  isBusy: boolean;
  onBack: () => void;
  onForward: () => void;
}) {
  const isLast = props.step === QUESTIONS.length;
  return (
    <div className="nb-foot">
      <span className="nb-dots">
        {QUESTIONS.map((question, index) => (
          <i key={question} className={index < props.step ? "on" : ""} />
        ))}
        <span>{t("Steg {step} av {steps}", { step: props.step, steps: QUESTIONS.length })}</span>
      </span>
      <span className="spacer" />
      {/* The first step's way out is Avbryt; the others step back. */}
      <button className="button ghost" disabled={props.isBusy} onClick={props.onBack}>
        {props.step > 1 ? t("Tillbaka") : t("Avbryt")}
      </button>
      <button className="button primary" disabled={props.isBusy} onClick={props.onForward}>
        {isLast ? t("Skapa boken") : t("Fortsätt")}
      </button>
    </div>
  );
}

// The first question is asked of the blank book; after it the book wears the cover chosen.
function lookOf(details: ProjectDetails, step: number) {
  if (step === 1) return "cover-blank";
  if (hasGenre(details.type) && details.genre) return `cover-${details.genre}`;
  return `cover-${plainOf(details)}`;
}

// The cover round the pages. A new one fades in over the old, which then takes its place.
function Boards({ look }: { look: string }) {
  const [under, setUnder] = useState(look);
  return (
    <>
      <span className={`nb-board ${under}`} />
      {look !== under && (
        <span
          key={look}
          className={`nb-board fading-in ${look}`}
          onAnimationEnd={() => setUnder(look)}
        />
      )}
    </>
  );
}

type Props = {
  start: ProjectDetails;
  libraryDir: string;
  /** Who the title page says wrote it; "" leaves the line out. */
  author: string;
  /** True once the book is made; `from` is where its cover stood on the title page. */
  onCreate: (details: ProjectDetails, from: DOMRect | null) => Promise<boolean>;
  onClose: () => void;
};

// The book grows out of the blank book on the shelf, turns a page to each question, and shrinks
// back into the blank book when cancelled. It is busy while a page turns or the book is made.
function useOpenBook(onClose: () => void) {
  const book = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  const [isBusy, setBusy] = useState(false);
  const [isShrinking, setShrinking] = useState(false);
  useLayoutEffect(() => {
    if (book.current) grow(book.current);
  }, []);
  const turnTo = (to: number) => {
    if (!book.current) return setStep(to);
    setBusy(true);
    turnPage(
      book.current,
      to > step,
      () => setStep(to),
      () => setBusy(false),
    );
  };
  const cancel = () => {
    if (isBusy || isShrinking) return;
    setShrinking(true);
    return book.current ? shrink(book.current, onClose) : onClose();
  };
  return { book, step, turnTo, isBusy, setBusy, isShrinking, cancel };
}

function useAnswers(props: Props) {
  const open = useOpenBook(props.onClose);
  const { step, turnTo } = open;
  const [details, setDetails] = useState(props.start);
  const [isSwapping, setSwapping] = useState(false);
  const create = async () => {
    open.setBusy(true);
    const book = open.book.current;
    const isMade = await props.onCreate(details, book && coverOnTitlePage(book));
    if (!isMade) return open.setBusy(false);
    return book ? leave(book, props.onClose) : props.onClose();
  };
  const forward = () => {
    if (open.isBusy) return;
    if (isSwapping) return setSwapping(false);
    // The shape starts from what Skrivro suggests for the kind of book.
    if (step === 1) setDetails(withSuggestion(details));
    if (step < QUESTIONS.length) return turnTo(step + 1);
    void create();
  };
  const back = () => {
    if (isSwapping) return setSwapping(false);
    return step > 1 ? turnTo(step - 1) : open.cancel();
  };
  return { ...open, details, setDetails, isSwapping, setSwapping, forward, back };
}

type Answers = ReturnType<typeof useAnswers>;

// The left page: the question, its choices, and the way on along its foot.
function QuestionPage(props: { answers: Answers; own: OwnStructures; libraryDir: string }) {
  const { answers } = props;
  return (
    <section className="nb-page nb-questions">
      <h2>{QUESTIONS[answers.step - 1]}</h2>
      <div className="nb-body">
        <Question
          {...answers}
          {...props.own}
          onChange={answers.setDetails}
          libraryDir={props.libraryDir}
        />
      </div>
      <Steps
        step={answers.step}
        isBusy={answers.isBusy}
        onBack={answers.back}
        onForward={answers.forward}
      />
    </section>
  );
}

export function NewBookDialog(props: Props) {
  const answers = useAnswers(props);
  const { step, details, isShrinking } = answers;
  const own = useOwnTemplates(props.libraryDir);
  return (
    <Dialog
      label={QUESTIONS[step - 1] ?? ""}
      className={isShrinking ? "new-book-dialog shrinking" : "new-book-dialog"}
      onClose={answers.cancel}
    >
      <div className="nb-case" ref={answers.book}>
        <Boards look={isShrinking ? "cover-blank" : lookOf(details, step)} />
        <div
          className="nb-spread"
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.target instanceof HTMLInputElement)
              answers.forward();
          }}
        >
          <QuestionPage answers={answers} own={own} libraryDir={props.libraryDir} />
          <TitlePage details={details} author={props.author} step={step} own={own.own} />
          <div className="nb-sheets" aria-hidden="true" />
        </div>
      </div>
    </Dialog>
  );
}
