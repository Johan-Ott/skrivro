import { useEffect, useRef, useState } from "react";
import type { Signature } from "./newsletter.js";
import { recordFailure } from "@llkit/errorLog.js";
import type { Project } from "../useProject.js";
import {
  bookField,
  copyPng,
  drawCard,
  savePng,
  type ImageCardId,
  type ImageChoices,
  type StudioData,
} from "./studioDraw.js";
import { BookField, ImagePanel, NewsletterPanel, useNewsletter } from "./StudioPanels.js";
import { StudioNav, type CardId } from "./StudioNav.js";
import { useAuthor, useCoverBitmap, type AuthorChoice } from "./studioPictures.js";
import { t } from "../../i18n/i18n.js";

interface StudioProps extends Omit<StudioData, "cover" | "author"> {
  /** The writer's name, picture and the frame and title chosen under Stil. */
  author: AuthorChoice;
  /** Om författaren, from the profile, signs the newsletter. */
  about: string;
  onSaveFields: (fields: Record<string, unknown>) => void;
  onBack: () => void;
}

function cardExtra(card: CardId, props: StudioProps) {
  const save = (key: string) => (value: string) =>
    props.onSaveFields({ [key]: value.trim() || undefined });
  if (card === "nedrakning")
    return (
      <BookField
        label={t("Utgivningsdag")}
        type="date"
        value={bookField(props.project, "releaseDate")}
        onSave={save("releaseDate")}
      />
    );
  if (card === "milstolpe")
    return (
      <BookField
        label={t("Milstolpe")}
        value={bookField(props.project, "milestone") || t("Första utkastet")}
        onSave={save("milestone")}
      />
    );
  if (card === "handeln")
    return (
      <BookField
        label={t("Citat ur boken")}
        value={bookField(props.project, "quote")}
        onSave={save("quote")}
      />
    );
  return null;
}

// Drawn again after every change; the fonts are waited for, or the canvas would use fallbacks.
function useCardCanvas(card: ImageCardId, choices: ImageChoices, data: StudioData) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    void document.fonts.ready.then(
      () => canvas.current && drawCard(canvas.current, card, choices, data),
    );
  });
  return canvas;
}

function ImageCard(props: StudioProps & { card: ImageCardId }) {
  const [choices, setChoices] = useState<ImageChoices>({
    look: "papper",
    format: "kvadrat",
    isMarked: true,
    isSigned: true,
  });
  const cover = useCoverBitmap(props.project);
  const author = useAuthor(props.author, props.journey);
  const canvas = useCardCanvas(props.card, choices, { ...props, cover, author });
  const run = (action: (element: HTMLCanvasElement) => Promise<void>) =>
    canvas.current && void action(canvas.current).catch(recordFailure("Bilden kunde inte göras"));
  const name = `${props.project.name} – ${props.card}`;
  return (
    <>
      <div className="studio-stage">
        <canvas ref={canvas} className={`studio-card ${choices.format}`} aria-label={t("Bilden")} />
      </div>
      <div className="studio-panel">
        <ImagePanel
          choices={choices}
          onChange={setChoices}
          extra={cardExtra(props.card, props)}
          onCopy={async () => canvas.current && copyPng(canvas.current)}
          onSave={() => run((element) => savePng(element, name))}
        />
      </div>
    </>
  );
}

// The mail as the reader gets it; the HTML is the writer's own text, so it is shown as HTML.
function Newsletter({ project, signature }: { project: Project; signature: Signature }) {
  const letter = useNewsletter(project, signature);
  return (
    <>
      <div className="studio-stage">
        <div className="studio-mail">
          <span className="studio-mail-subject">
            {t("Ämne: {title}", { title: `${project.name}: ${letter.title}` })}
          </span>
          <div className="studio-mail-body" dangerouslySetInnerHTML={{ __html: letter.html }} />
        </div>
      </div>
      <div className="studio-panel">
        <NewsletterPanel letter={letter} />
      </div>
    </>
  );
}

/** Studio: pictures to share about the writing and the book, and chapters for readers. */
export function StudioView(props: StudioProps) {
  const [card, setCard] = useState<CardId>("vecka");
  return (
    <div className="studio">
      <StudioNav card={card} onCard={setCard} onBack={props.onBack} />
      <main className="studio-main">
        {card === "nyhetsbrev" ? (
          <Newsletter
            project={props.project}
            signature={{ about: props.about, link: props.link }}
          />
        ) : (
          <ImageCard {...props} card={card} />
        )}
      </main>
    </div>
  );
}
