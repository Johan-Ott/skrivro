import { useState } from "react";
import { isPictureFile } from "../../project/researchFiles.js";
import { browserStorage } from "@llkit/storage/browserStorage.js";
import { useResearchPicture } from "../notes/ResearchFile.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

// Referensbild: one of the book's research pictures, a map or a photo, beside the text while
// writing. The choice is kept per book; a book with no pictures has no such section.

const choiceKey = (dir: string) => `skrivro.reference.${dir}`;

function readChoice(dir: string) {
  try {
    return browserStorage().getItem(choiceKey(dir));
  } catch {
    return null;
  }
}

function Picture({ dir, name }: { dir: string; name: string }) {
  const url = useResearchPicture(dir, name);
  return url ? <img className="reference-picture" src={url} alt={name} /> : null;
}

export const picturesIn = (project: Project) =>
  Object.entries(project.summaries)
    .filter(([, summary]) => summary.file && isPictureFile(summary.file))
    .map(([id, summary]) => ({ id, title: summary.title, file: summary.file ?? "" }));

type Pictures = ReturnType<typeof picturesIn>;

function PictureChoice(props: {
  pictures: Pictures;
  shown: string;
  onChoose: (id: string) => void;
}) {
  return (
    <select
      value={props.shown}
      aria-label={t("Bild")}
      onChange={(event) => props.onChoose(event.target.value)}
    >
      {props.pictures.map((picture) => (
        <option key={picture.id} value={picture.id}>
          {picture.title}
        </option>
      ))}
    </select>
  );
}

export function ReferenceBlock({ project }: { project: Project }) {
  const pictures = picturesIn(project);
  const [chosen, setChosen] = useState(() => readChoice(project.dir));
  const shown = pictures.find((picture) => picture.id === chosen) ?? pictures[0];
  if (!shown) return null;
  const choose = (id: string) => {
    setChosen(id);
    browserStorage().setItem(choiceKey(project.dir), id);
  };
  return (
    <div className="reference">
      {pictures.length > 1 && (
        <PictureChoice pictures={pictures} shown={shown.id} onChoose={choose} />
      )}
      <Picture dir={project.dir} name={shown.file} />
    </div>
  );
}
