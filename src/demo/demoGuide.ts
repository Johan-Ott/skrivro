import type { StickyNote } from "../project/stickyNotes.js";
// The example as a guide: a note that says what to try and where, and one of each thing Skrivro
// keeps beside the text, so every part of it has something to show.

export const GUIDE_IDS = {
  guide: "01J9Z4K2QX0000000000000011",
  secret: "01J9Z4K2QX0000000000000012",
};

export const GUIDE = `Vintervägen är en liten bok att prova Skrivro med. Allt i den går att ändra och ta bort.

**Skriva.** Öppna Köket under Brevet och skriv vidare. Skrivro sparar av sig själv. Ord med prickar under står flera gånger nära varandra: tryck på ett. I Isen är ett namn felstavat. Hittar du det?

**Anteckningar.** Elin, Arvid och Maja är personer, och deras namn blir länkar i texten. Elin är kopplad till de andra: öppna henne och se. En ny person börjar som ett kort blad med Vill, Rädd för och Döljer. Under Hemligheter står vad läsaren får veta, och när.

**Planera.** Innehåll visar kapitlen med vems ögon, vad som händer och när, och var en hemlighet avslöjas. Rollista visar alla personer på en gång. Vad ett kapitel ska göra står också under dess rubrik när du skriver. Etiketterna Skriv om, Lucka och Kolla fakta sitter på scenerna i trädet. Kommentaren i Fyren finns också i Granska, och Lappar ligger bland modulerna.

**Se boken.** Läs som bok visar sidorna som i tryck. Publicera gör manus, e-bok och tryck-PDF, och Till förlag hjälper dig med synopsis och följebrev.

När du vill börja på din egen: gå till Bokhyllan och tryck på Ny bok.
`;

export const SECRET = `Henrik försvann aldrig på isen. Han lämnade Ön med flit, och Arvid hjälpte honom.
`;

/** Where the reader learns the secret, and from where Arvid has known it. */
export const secretNode = (revealId: string, arvidId: string, knownFromId: string) => ({
  id: GUIDE_IDS.secret,
  kind: "scene",
  reveal: revealId,
  knownBy: { [arvidId]: knownFromId },
});

export const connections = (ids: { elin: string; arvid: string; maja: string }) => ({
  [ids.elin]: [
    { id: ids.arvid, role: "farbror" },
    { id: ids.maja, role: "barndomsvän" },
  ],
});

/** One open comment, on the lights Arvid saw on the ice. */
export const COMMENT = [
  {
    id: "01J9Z4K2QX00000000000000K1",
    quote: "Två ljus på isen",
    prefix: "han sett dem den natten. ",
    suffix: ", där inga ljus skulle vara.",
    body: "Vem bar ljusen? Här kan en ledtråd planteras.",
    author: "Redaktören",
    createdAt: 1_760_000_000_000,
    resolved: false,
  },
];

/** A note to write and draw on beside the text. */
export const STICKY: StickyNote[] = [
  {
    id: "01J9Z4K2QX00000000000000L1",
    color: "gul" as const,
    text: "Vem tände ljusen på isen?\n\nRita och sudda med pennan och sudden här ovanför.",
    strokes: [],
    left: 24,
    top: 64,
    width: 220,
    height: 190,
  },
];
