# Genrepaket

Grunderna för alla böcker är gratis och ligger i `src/project/templates.sv.json` och `.en.json`.
En genre är ett paket, som köps en gång. Varje paket är en egen mapp i `src/packs/`, som ett
plugin. Appen hittar mapparna själv; det finns ingen lista att uppdatera.

```
src/packs/romantasy/
  pack.json                 id, version, look (omslaget), namn och beskrivning, ev. covers
  structures.sv.json        strukturerna, i samma form som i templates.sv.json
  structures.en.json
  pieces.sv.json            bitarna (etiketter och anteckningssorter), om paketet har några
  pieces.en.json
  notes/sv/01-namn.md       guider och mallar, en fil per anteckning
  notes/en/01-name.md
```

Alla filer utom `pack.json` är valfria. Svenska och engelska ska ha samma strukturer, bitar och
lika många anteckningar; `tests/packs.test.ts` kontrollerar det.

`covers` listar paket som det här redan rymmer det bästa av: en bok med romantasy får inte också
romance- och fantasypaketens anteckningar. En struktur tar med paketets bit med samma id, så att
dess etiketter och sorter följer med.

## En anteckning

```
---
sort: Guide
---
# Romantasyns löften

Texten, i vanlig Markdown.
```

`sort: Guide` gör anteckningen till en guide: den skrivs in i bokens sort Guide när paketet läggs
till, med listorna som punktlistor. Alla andra är mallar: de skrivs inte in, utan erbjuds under Mall
i Ny anteckning för sin sort, `karaktarer` för Personer eller en egen sort som `Världen`, så många
gånger skribenten vill. Mallens första stycke om att byta namn och "(mall)" i titeln tas bort där.

## Köp

`isPackOwned` i `src/project/packs.ts` säger om ett paket är köpt. Under betan är alla köpta.
Inför 1.0 flyttar betalpaketen till ett privat repo och hämtas efter köp.

## Egna mallar

Spara som mall i en antecknings meny sparar den som en fil i Skrivro-mappens `mallar/anteckningar/`,
i samma form som paketens mallar. Den erbjuds sedan under Mall i Ny anteckning för samma sort, i
alla böcker.
