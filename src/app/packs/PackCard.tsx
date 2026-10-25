import { useState } from "react";
import { recordFailure } from "@llkit/errorLog.js";
import { guidesOf, isPackOwned, templatesOf, type Pack } from "../../project/packs.js";
import { t } from "../../i18n/i18n.js";

// A pack wears its genre's cover, as a book on the shelf does, and says plainly what it holds.

export type OnAdd = ((pack: Pack) => Promise<void>) | undefined;

export const PackCover = ({ pack, isSmall }: { pack: Pack; isSmall?: boolean }) => (
  <span className={`pack-cover cover-${pack.look}${isSmall ? " small" : ""}`} aria-hidden="true">
    {!isSmall && <span className="pack-cover-kicker">{t("Genrepaket")}</span>}
    <span className="pack-cover-name">{isSmall ? pack.name.slice(0, 1) : pack.name}</span>
  </span>
);

/** What the pack holds, line by line: its structure, guides, templates and labels. */
export function packHolds(pack: Pack) {
  const labels = pack.pieces.flatMap((piece) => piece.labels).length;
  const [guides, templates] = [guidesOf(pack).length, templatesOf(pack).length];
  return [
    ...pack.structures.map((structure) => t("Strukturen {name}", { name: structure.name })),
    guides > 0 && (guides === 1 ? t("1 guide") : t("{count} guider", { count: guides })),
    templates > 0 &&
      (templates === 1
        ? t("1 mall")
        : t("{count} mallar för karaktärer och värld", { count: templates })),
    labels > 0 && (labels === 1 ? t("1 etikett") : t("{count} etiketter", { count: labels })),
  ].filter((line): line is string => Boolean(line));
}

export const Status = ({ pack }: { pack: Pack }) => (
  <span className="pack-tag">
    {isPackOwned(pack.id) ? t("Ingår under betan") : t("Köps en gång")}
  </span>
);

export function AddButton({ pack, onAdd }: { pack: Pack; onAdd: OnAdd }) {
  const [isAdded, setAdded] = useState(false);
  if (!onAdd || !isPackOwned(pack.id)) return null;
  const add = () =>
    void onAdd(pack)
      .then(() => setAdded(true))
      .catch(recordFailure("Paketet"));
  return (
    <button className="button secondary small" disabled={isAdded} onClick={add}>
      {isAdded ? t("Tillagt") : t("Lägg till i boken")}
    </button>
  );
}

/** In Genrepaket: the cover, what the pack promises and holds, and the way inside. */
export function PackTile(props: { pack: Pack; onAdd?: OnAdd; onOpen: () => void }) {
  const { pack, onAdd } = props;
  return (
    <article className="pack-tile">
      <button className="pack-cover-button" onClick={props.onOpen} aria-label={pack.name}>
        <PackCover pack={pack} />
      </button>
      <div className="pack-tile-body">
        <p className="pack-tile-hint">{pack.hint}</p>
        <ul className="pack-holds">
          {packHolds(pack).map((line) => (
            <li key={line}>{line}</li>
          ))}
          {pack.notes.length === 0 && <li className="later">{t("Guider och mallar kommer")}</li>}
        </ul>
        <button className="link-button quiet" onClick={props.onOpen}>
          {t("Se vad som ingår")}
        </button>
        <div className="pack-tile-foot">
          <Status pack={pack} />
          <AddButton pack={pack} onAdd={onAdd} />
        </div>
      </div>
    </article>
  );
}

/** In Mallar och bitar: the same pack as a short row with a small cover. */
export const PackRow = (props: { pack: Pack; onAdd?: OnAdd; onOpen: () => void }) => (
  <div className="pack-row">
    <PackCover pack={props.pack} isSmall />
    <span className="pack-row-text">
      <span className="pack-row-name">{props.pack.name}</span>
      <span className="choice-hint">{packHolds(props.pack).join(" · ")}</span>
      <button className="link-button quiet" onClick={props.onOpen}>
        {t("Se vad som ingår")}
      </button>
    </span>
    <AddButton pack={props.pack} onAdd={props.onAdd} />
  </div>
);
