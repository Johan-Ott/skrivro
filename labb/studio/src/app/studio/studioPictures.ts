import { useEffect, useState } from "react";
import { findCover } from "../../project/cover.js";
import { earnedOf, wornFlair } from "../../project/flair.js";
import type { Journey } from "../../project/journey.js";
import { dayKey } from "../../project/stats.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import type { Author } from "./studioSignature.js";

/** The writer as the profile keeps it: a picture as a data URL, and frame and title by id. */
export interface AuthorChoice {
  name: string;
  picture: string;
  frame: string;
  title: string;
}

// The cover is read once, as a picture the canvas can draw.
export function useCoverBitmap(project: Project) {
  const [cover, setCover] = useState<ImageBitmap | null>(null);
  const { dir } = project;
  useEffect(() => {
    void findCover(platform.fileSystem, dir)
      .then((found) => (found ? createImageBitmap(new Blob([found.bytes.slice()])) : null))
      .then(setCover)
      .catch(() => setCover(null));
  }, [dir]);
  return cover;
}

// A picture that cannot be read is drawn as the first letter of the name, as in the app.
function usePictureBitmap(picture: string) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  useEffect(() => {
    if (!picture) return setBitmap(null);
    void fetch(picture)
      .then((response) => response.blob())
      .then((blob) => createImageBitmap(blob))
      .then(setBitmap)
      .catch(() => setBitmap(null));
  }, [picture]);
  return bitmap;
}

/** The writer as the cards draw them: only a frame and title that are still unlocked. */
export function useAuthor(choice: AuthorChoice, journey: Journey): Author {
  const picture = usePictureBitmap(choice.picture);
  const earned = earnedOf(journey, dayKey(Date.now()));
  return {
    name: choice.name,
    picture,
    frame: wornFlair(choice.frame, earned)?.id ?? "",
    title: wornFlair(choice.title, earned)?.name ?? "",
  };
}
