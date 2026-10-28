import type { AppState } from "../App.js";
import { useNamedHere } from "../blocks/InSceneBlock.js";
import { usePhone } from "./usePhone.js";
import { t } from "../../i18n/i18n.js";

// On a phone, what the computer keeps in its blocks is at the top of the scene instead: who and
// what is named here, each opening its note. Granska is in the menu.

export function SceneStrip({ app }: { app: AppState }) {
  const named = useNamedHere(app);
  if (!usePhone() || named.length === 0) return null;
  const open = (dir: string, sceneId: string) =>
    app.writingMode.setBeside({ kind: "text", dir, sceneId });
  return (
    <nav className="scene-strip" aria-label={t("I scenen")}>
      {named.map((card) => (
        <button key={card.id} className="scene-chip" onClick={() => open(card.dir, card.id)}>
          {card.name}
        </button>
      ))}
    </nav>
  );
}
