import { useState } from "react";
import { createStore } from "@llkit/store.js";
import { Dialog } from "@llkit/controls.js";
import { recordFailure } from "@llkit/errorLog.js";
import { isPackOwned, packs, type Pack } from "../../project/packs.js";
import { t } from "../../i18n/i18n.js";

// The genre packs, as cards that say what each holds. Found in the logo's menu and in Mallar och
// bitar, never pushed: no reminders, nothing that opens by itself.

const count = (amount: number, one: string, many: string) => (amount === 1 ? one : many);

/** "1 struktur · 10 guider och mallar · 5 etiketter", or what of it the pack has. */
export function packContents(pack: Pack) {
  const [structures, notes] = [pack.structures.length, pack.notes.length];
  const labels = pack.pieces.flatMap((piece) => piece.labels).length;
  return [
    structures > 0 &&
      count(structures, t("1 struktur"), t("{count} strukturer", { count: structures })),
    notes > 0 &&
      count(notes, t("1 guide eller mall"), t("{count} guider och mallar", { count: notes })),
    labels > 0 && count(labels, t("1 etikett"), t("{count} etiketter", { count: labels })),
  ]
    .filter(Boolean)
    .join(" · ");
}

function PackCard(props: { pack: Pack; onAdd?: ((pack: Pack) => Promise<void>) | undefined }) {
  const { pack, onAdd } = props;
  const [isAdded, setAdded] = useState(false);
  const add = () =>
    void onAdd?.(pack)
      .then(() => setAdded(true))
      .catch(recordFailure("Paketet"));
  return (
    <div className="pack-card">
      <span className="pack-card-text">
        <span className="pack-card-name">
          {pack.name} <span className="pack-card-holds">{packContents(pack)}</span>
        </span>
        <span className="choice-hint">{pack.hint}</span>
      </span>
      {onAdd && isPackOwned(pack.id) ? (
        <button className="button secondary small" disabled={isAdded} onClick={add}>
          {isAdded ? t("Tillagt") : t("Lägg till i boken")}
        </button>
      ) : (
        <span className="pack-tag">
          {isPackOwned(pack.id) ? t("Ingår under betan") : t("Köps en gång")}
        </span>
      )}
    </div>
  );
}

/** Every pack; with `onAdd`, each can be added to the open book. */
export function PackList(props: { onAdd?: (pack: Pack) => Promise<void> }) {
  return (
    <div className="pack-list">
      <p className="setting-hint">
        {t(
          "Grunderna är gratis. En genre kommer som ett paket med struktur, guider och mallar, och köps en gång. Under betan ingår alla.",
        )}
      </p>
      {packs().map((pack) => (
        <PackCard key={pack.id} pack={pack} onAdd={props.onAdd} />
      ))}
    </div>
  );
}

const isOpen = createStore(false);

/** Genrepaket… in the logo's menu. */
export const openPacks = () => isOpen.set(true);

export function PacksLayer() {
  if (!isOpen.use()) return null;
  return (
    <Dialog label={t("Genrepaket")} className="templates-dialog" onClose={() => isOpen.set(false)}>
      <PackList />
    </Dialog>
  );
}
