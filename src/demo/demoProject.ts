import { stickyNoteFileText } from "../project/stickyNotes.js";
import { COMMENT, connections, GUIDE, GUIDE_IDS, SECRET, secretNode, STICKY } from "./demoGuide.js";

export const DEMO_PROJECT_DIR = "/Vintervägen.skrivro";

// The example shows what Skrivro does: chapters with what happens and when, a subtitle and an
// epigraph, a footnote, notes linked by name, and one misspelt name for the review to find.

const scene = (id: string, title: string, status: string, body: string) => ({
  [`${DEMO_PROJECT_DIR}/scenes/${id}.md`]: `---\nid: ${id}\ntitle: ${title}\nstatus: ${status}\n---\n${body}`,
});

const KOKET = `Brevet låg på köksbordet när Elin kom in från kylan. *Kuvertet var gult av ålder*, och handstilen kände hon igen innan hon ens hunnit ta av sig vantarna.

– Det kom i morse, sa Arvid utan att se upp från spisen. Med posten. Som om ingenting hade hänt.

Hon satte sig. Utanför fönstret hade isen lagt sig över viken, grå och orörlig, och bortom udden blinkade fyren som den gjort varje natt i fyrtio år.

– Vet du vem det är från?

::: brev
Kära Elin. Om du läser det här har isen till slut släppt.

Din Henrik
:::
`;

const ISEN = `Isen bar. Den hade burit sedan jul, men Elin gick ändå nära stranden, där vassen stack upp genom snön.

Hon tänkte på det Arvid hade sagt, eller snarare på det han inte hade sagt. Fyrtio år av tystnad hade gjort honom bra på det.

* * *

På kvällen kom Maja över med en termos.

– Du har läst det, sa hon. Det syns på dig.
`;

const FYREN = `Arvid hade inte varit uppe i fyren sedan den automatiserades.[^1] Trappan var brantare än han mindes, och varje steg ekade i tornet.

Högst upp stod linsen kvar, stor som en människa, dammig men hel. Han lade handen mot glaset.

Det var härifrån han hade sett dem den natten. Två ljus på isen, där inga ljus skulle vara.

[^1]: Fyren på Ön släcktes för sista gången med hand 1979.
`;

const SMALTNINGEN = `I april kom regnet, och isen blev grå och porös. Elin stod på bryggan varje morgon och lyssnade.

Det lät som att någon andades under viken.
`;

const ELIN = `Trettioåtta. Lämnade Ön när hon var arton och har inte varit tillbaka sedan pappans begravning.

Säger sällan vad hon tänker, men skriver allt i en svart anteckningsbok.
`;

const ARVID = `Elins farbror. Fiskare, och fyrens siste vakt innan den automatiserades.

Vet mer om brevet än han vill säga.
`;

const MAJA = `Elins barndomsvän. Stannade kvar på Ön och driver affären vid hamnen.
`;

const ISLAND = `Liten ö i den yttre skärgården, ett trettiotal fastboende vintertid. Fyren står på udden i norr.
`;

const KUVERTET = `Gult, med frimärke från 1987. Poststämpeln är från ett postkontor som inte finns längre.
`;

const SCENE_IDS = {
  koket: "01J9Z4K2QX0000000000000001",
  isen: "01J9Z4K2QX0000000000000002",
  fyren: "01J9Z4K2QX0000000000000003",
  elin: "01J9Z4K2QX0000000000000004",
  arvid: "01J9Z4K2QX0000000000000005",
  smaltningen: "01J9Z4K2QX0000000000000006",
  hamnen: "01J9Z4K2QX0000000000000007",
  maja: "01J9Z4K2QX0000000000000008",
  island: "01J9Z4K2QX0000000000000009",
  kuvertet: "01J9Z4K2QX0000000000000010",
};

const PROJECT = {
  title: "Vintervägen",
  type: "roman",
  dailyGoal: 500,
  connections: connections(SCENE_IDS),
  tree: [
    {
      id: "01J9Z4K2QX00000000000000P1",
      kind: "part",
      title: "Vintern",
      children: [
        {
          id: "01J9Z4K2QX00000000000000C1",
          kind: "chapter",
          title: "Brevet",
          summary: "Elin får ett brev från Henrik, som försvann på isen för trettio år sedan.",
          when: "Januari",
          pov: "Elin",
          children: [
            { id: SCENE_IDS.koket, kind: "scene" },
            { id: SCENE_IDS.isen, kind: "scene" },
          ],
        },
        {
          id: "01J9Z4K2QX00000000000000C2",
          kind: "chapter",
          title: "Fyren",
          subtitle: "Arvid",
          summary: "Arvid går upp i fyren och minns natten då ljusen syntes på isen.",
          when: "Samma natt",
          pov: "Arvid",
          children: [{ id: SCENE_IDS.fyren, kind: "scene", labels: ["kolla-fakta"] }],
        },
      ],
    },
    {
      id: "01J9Z4K2QX00000000000000P2",
      kind: "part",
      title: "Våren",
      children: [
        {
          id: "01J9Z4K2QX00000000000000C3",
          kind: "chapter",
          title: "Smältningen",
          subtitle: "Elin, april",
          pov: "Elin",
          epigraph: "Det som isen tar, ger våren tillbaka.",
          epigraphBy: "Ordspråk från skärgården",
          when: "April",
          children: [
            { id: SCENE_IDS.smaltningen, kind: "scene", labels: ["skriv-om"] },
            { id: SCENE_IDS.hamnen, kind: "scene", labels: ["lucka"] },
          ],
        },
      ],
    },
    {
      id: "karaktarer",
      kind: "sort",
      title: "Personer",
      children: [
        { id: SCENE_IDS.elin, kind: "scene" },
        { id: SCENE_IDS.arvid, kind: "scene" },
        { id: SCENE_IDS.maja, kind: "scene" },
      ],
    },
    {
      id: "platser",
      kind: "sort",
      title: "Platser",
      children: [{ id: SCENE_IDS.island, kind: "scene" }],
    },
    {
      id: "saker",
      kind: "sort",
      title: "Saker",
      children: [{ id: SCENE_IDS.kuvertet, kind: "scene" }],
    },
    {
      id: "anteckningar",
      kind: "sort",
      title: "Övrigt",
      children: [{ id: GUIDE_IDS.guide, kind: "scene" }],
    },
    {
      id: "lappar",
      kind: "sort",
      title: "Lappar",
      children: STICKY.map((note) => ({ id: note.id, kind: "scene" })),
    },
    {
      id: "hemligheter",
      kind: "sort",
      title: "Hemligheter",
      children: [secretNode(SCENE_IDS.smaltningen, SCENE_IDS.arvid, SCENE_IDS.fyren)],
    },
  ],
};

/** Shown when Skrivro runs in a browser without Tauri. */
export const DEMO_PROJECT_FILES: Record<string, string> = {
  [`${DEMO_PROJECT_DIR}/project.json`]: `${JSON.stringify(PROJECT, null, 2)}\n`,
  ...scene(SCENE_IDS.koket, "Köket", "redigering", KOKET),
  ...scene(SCENE_IDS.isen, "Isen", "utkast", ISEN),
  ...scene(SCENE_IDS.fyren, "Fyren", "utkast", FYREN),
  ...scene(SCENE_IDS.smaltningen, "Regnet", "utkast", SMALTNINGEN),
  ...scene(SCENE_IDS.hamnen, "Hamnen", "idé", ""),
  ...scene(SCENE_IDS.elin, "Elin", "utkast", ELIN),
  ...scene(SCENE_IDS.arvid, "Arvid", "utkast", ARVID),
  ...scene(SCENE_IDS.maja, "Maja", "utkast", MAJA),
  ...scene(SCENE_IDS.island, "Ön", "utkast", ISLAND),
  ...scene(SCENE_IDS.kuvertet, "Kuvertet", "utkast", KUVERTET),
  ...scene(GUIDE_IDS.guide, "Börja här", "klar", GUIDE),
  ...scene(GUIDE_IDS.secret, "Henrik lever", "utkast", SECRET),
  [`${DEMO_PROJECT_DIR}/comments/${SCENE_IDS.fyren}.json`]: `${JSON.stringify(COMMENT, null, 2)}
`,
  ...Object.fromEntries(
    STICKY.map((note) => [`${DEMO_PROJECT_DIR}/scenes/${note.id}.md`, stickyNoteFileText(note)]),
  ),
};
