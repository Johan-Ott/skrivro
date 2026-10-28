import { BackButton } from "@llkit/controls.js";
import type { ImageCardId } from "./studioDraw.js";
import { t } from "../../i18n/i18n.js";

export type CardId = ImageCardId | "nyhetsbrev";

function groups(): [string, [CardId, string, string][]][] {
  return [
    [
      t("Skrivande"),
      [
        ["vecka", t("Veckan i siffror"), t("Ord, dagar och streak")],
        ["skrivar", t("Ditt skrivår"), t("Hela året, i alla böcker")],
        ["milstolpe", t("Milstolpe"), t("Första utkastet, eller det du vill fira")],
        ["forfattare", t("Författarkort"), t("Du, din ram och titel, och det du skrivit")],
      ],
    ],
    [
      t("Lansering"),
      [
        ["omslag", t("Omslaget är här"), t("Visa omslaget")],
        ["nedrakning", t("Nedräkning"), t("Dagar kvar till release")],
        ["handeln", t("Nu i handeln"), t("Med ett citat ur boken")],
      ],
    ],
    [t("Läsare"), [["nyhetsbrev", t("Kapitel till nyhetsbrev"), t("Substack, Patreon, e-post")]]],
  ];
}

function StudioGroup(props: {
  label: string;
  items: ReturnType<typeof groups>[number][1];
  card: CardId;
  onCard: (card: CardId) => void;
}) {
  return (
    <div className="studio-group">
      <span className="sidebar-heading">{props.label}</span>
      {props.items.map(([id, name, hint]) => (
        <button
          key={id}
          className="studio-item"
          aria-pressed={props.card === id}
          onClick={() => props.onCard(id)}
        >
          <span className="studio-item-name">{name}</span>
          <span className="insight-muted">{hint}</span>
        </button>
      ))}
    </div>
  );
}

export function StudioNav(props: {
  card: CardId;
  onCard: (card: CardId) => void;
  onBack: () => void;
}) {
  return (
    <aside className="studio-nav" aria-label={t("Studio")}>
      <BackButton
        className="publish-back"
        label={t("Publicera")}
        isPhoneBack
        onBack={props.onBack}
      />
      {groups().map(([label, items]) => (
        <StudioGroup
          key={label}
          label={label}
          items={items}
          card={props.card}
          onCard={props.onCard}
        />
      ))}
    </aside>
  );
}
