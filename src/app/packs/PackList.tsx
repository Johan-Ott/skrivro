import { createStore } from "@llkit/store.js";
import { CloseButton, Dialog } from "@llkit/controls.js";
import { packs } from "../../project/packs.js";
import { PackRow, PackTile, type Book } from "./PackCard.js";
import { PackDetail } from "./PackDetail.js";
import { t } from "../../i18n/i18n.js";

// The genre packs: found in the logo's menu and in Mallar och bitar, never pushed. No reminders,
// nothing that opens by itself.

// The packs with guides and templates first, then those that so far hold a structure.
const inOrder = () =>
  [...packs()].sort((one, other) => Number(other.notes.length > 0) - Number(one.notes.length > 0));

const INTRO = () =>
  t(
    "Grunderna är gratis. En genre kommer som ett paket med struktur, guider och mallar, och köps en gång. Under betan ingår alla.",
  );

/** Every pack as a short row, each to add to the open book. */
export const PackRows = ({ book }: { book: Book }) => (
  <div className="pack-rows">
    {inOrder().map((pack) => (
      <PackRow key={pack.id} pack={pack} book={book} onOpen={() => openPacks(pack.id)} />
    ))}
  </div>
);

// Closed, all packs (""), or one pack by its id.
const shown = createStore<string | null>(null);

/** Genrepaket… in the logo's menu, or straight to one pack. */
export const openPacks = (packId = "") => shown.set(packId);

const All = ({ book }: { book?: Book }) => (
  <>
    <p className="setting-hint">{INTRO()}</p>
    <div className="pack-grid">
      {inOrder().map((pack) => (
        <PackTile key={pack.id} pack={pack} book={book} onOpen={() => shown.set(pack.id)} />
      ))}
    </div>
  </>
);

export function PacksLayer({ book }: { book?: Book }) {
  const packId = shown.use();
  if (packId === null) return null;
  const pack = packs().find((each) => each.id === packId);
  return (
    <Dialog label={t("Genrepaket")} className="packs-dialog" onClose={() => shown.set(null)}>
      <span className="packs-close">
        <CloseButton onClose={() => shown.set(null)} />
      </span>
      <div className="packs-body">
        {pack ? (
          <PackDetail pack={pack} book={book} onBack={() => shown.set("")} />
        ) : (
          <All book={book} />
        )}
      </div>
    </Dialog>
  );
}
