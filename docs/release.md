# Första släppet: vad som är klart och vad Johan gör

## Klart i koden

- Alla desktopskärmar enligt den nya designen (toppfält, sidomeny, Innehåll, Publicera,
  Framsteg, Granska), på svenska och engelska. Mobilskärmarna hör till v2.
- Anteckningar i sorter, egna sorter, kopplingar och serier som delar anteckningar.
- Läsläge, dela och slå ihop scener, ordantal för markeringen.
- Släppbygget kompilerar (`npx tauri build --no-bundle`) och startar på introduktionen.
- Version 0.1.0 (`npm run version -- X.Y.Z` sätter den överallt).
- Signerade uppdateringar: appen frågar GitHub Releases vid start.
- `.github/workflows/release.yml`: en tagg `vX.Y.Z` bygger Windows till ett utkast. macOS väntar
  på Apple Developer-kontot i punkt 3.
- Typsnittens licenser ligger i `public/fonts/`; Om Skrivro nämner typsnitten och Typst.

## Johan gör, en gång

1. **GitHub-hemlighet:** repo → Settings → Secrets → Actions → `TAURI_SIGNING_PRIVATE_KEY` med
   innehållet i `~/.tauri/penna-updater.key`. Lösenordet är tomt. Säkerhetskopiera nyckelfilen.
2. **Repot publikt eller en egen adress för uppdateringar.** Appen läser
   `https://github.com/Johan-Ott/skrivro/releases/latest/download/latest.json`. Är repot privat
   når appen den inte; då behövs ett publikt repo bara för släpp, eller en annan adress i
   `tauri.conf.json` under `plugins.updater.endpoints`.
3. **Kodsignering**
   - Windows: Microsoft Store (sköter signeringen) eller ett eget certifikat. Utan det visar
     Windows "okänd utgivare" vid installation. Stegen för Store står i `docs/butiker.md`
     under Microsoft Store.
   - macOS: Apple Developer-konto (cirka 99 USD per år) för signering och notarisering. Lägg
     certifikatet som hemligheter i GitHub enligt tauri-action.
4. **Butiker:** pris och engångsköp, skärmdumpar, butikstext på svenska och engelska,
   integritetsetiketten "Data samlas inte in".
5. **Webbsida:** nedladdning, support-e-post och integritetspolicy (krävs av butikerna även när
   ingen data samlas in). När adressen och e-posten finns kan Om Skrivro länka till dem.
6. **Varumärkeskoll** av namnet Skrivro.

## Prova innan släppet, i det riktiga fönstret

- Stavning: skriv "speling kökbordet" i en scen. Rött bara under "speling" betyder att den
  svenska ordlistan används.
- Tryck-PDF: exportera exempelboken och öppna PDF:en.
- Uppdatering: släpp 0.1.0, installera, släpp 0.1.1 och se att appen erbjuder den.
- Påminnelsen: sätt den till en timme som har passerat en dag utan skrivande.
- Serie: lägg en bok i en ny serie med anteckningarna, öppna en andra bok i samma serie och se
  att namnen kopplas där också. Windows har svensk ordlista (sv-SE) på den här datorn.

## Släpp

```bash
npm run version -- 0.1.0
git commit -am "Skrivro 0.1.0" && git tag v0.1.0 && git push --follow-tags
```

Bygg Android-appen och lägg den på utkastet innan det publiceras. Telefonerna letar efter en
`.apk` i den senaste publicerade releasen och erbjuder den under Sök efter uppdateringar:

```bash
npm run build:android
gh release upload v0.1.0 out/Skrivro.apk
```

Publicera sedan utkastet under Releases på GitHub. Datorerna och telefonerna ser det från
och med nu, vid start och var sjätte timme.
