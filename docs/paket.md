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

`sort` är var anteckningen hamnar i den nya boken: `karaktarer` för Personer, eller namnet på en
egen sort, som `Guide` eller `Världen`, som då skapas. Filerna läggs in i namnordning.

## Köp

`isPackOwned` i `src/project/packs.ts` säger om ett paket är köpt. Under betan är alla köpta.
Inför 1.0 flyttar betalpaketen till ett privat repo och hämtas efter köp.
