import { useState } from "react";
import { choosePicture, readBookPicture } from "../pictureFiles.js";
import { usePictureUrl } from "../usePictureUrl.js";
import { t } from "../../i18n/i18n.js";

/** A thumbnail of a picture in the book's bilder/ folder; "" is none. */
export const useBookPicture = (dir: string, name: string) =>
  usePictureUrl(name ? `${dir}/${name}` : null, () => readBookPicture(dir, name));

function usePickPicture(dir: string, onChange: (name: string) => void) {
  const [problem, setProblem] = useState<string | null>(null);
  const choose = async () => {
    try {
      const name = await choosePicture(dir);
      if (name) onChange(name);
      setProblem(null);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : t("Bilden kunde inte sparas."));
    }
  };
  return { problem, choose };
}

/** Choose, change or remove one of the book's pictures. `name` is "" for none. */
export function PictureRow(props: {
  dir: string;
  label: string;
  name: string;
  /** What undoing the choice is called; null hides it. "Ta bort" by default. */
  removeLabel?: string | null;
  onChange: (name: string) => void;
}) {
  const url = useBookPicture(props.dir, props.name);
  const removeLabel = props.removeLabel === undefined ? t("Ta bort") : props.removeLabel;
  const { problem, choose } = usePickPicture(props.dir, props.onChange);
  return (
    <div className="picture-row">
      <span>{props.label}</span>
      <span className="picture-control">
        {url && <img className="picture-thumb" src={url} alt="" />}
        <button type="button" className="button secondary small" onClick={() => void choose()}>
          {props.name ? t("Byt bild…") : t("Välj bild…")}
        </button>
        {props.name && removeLabel && (
          <button type="button" className="link-button quiet" onClick={() => props.onChange("")}>
            {removeLabel}
          </button>
        )}
      </span>
      {problem && <span className="setting-hint">{problem}</span>}
    </div>
  );
}
