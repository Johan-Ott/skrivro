# Butikerna och Google-inloggningen

Allt som behövs för att Skrivro ska kunna släppas till alla: Google Play, Microsoft Store och
Googles inloggning i produktion. Texterna nedan klistras in som de står.

## Google-inloggningen (Google Cloud Console)

Skrivro ber bara om `drive.file`: filer som Skrivro själv skapat. Det är ett icke-känsligt scope,
så ingen säkerhetsgranskning krävs, bara varumärkesverifiering.

- **OAuth consent screen → Publishing status:** Testing → **In production**.
- **App name:** Skrivro
- **User support email och Developer contact:** johan.lonelodge@gmail.com
- **App logo:** `site/skrivro-logo.png` (120 × 120 px eller större, kvadratisk)
- **Application home page:** https://johan-ott.github.io/skrivro/
- **Privacy policy:** https://johan-ott.github.io/skrivro/integritet.html
- **Terms of service:** https://johan-ott.github.io/skrivro/villkor.html
- **Authorized domains:** `johan-ott.github.io`. Domänen verifieras i Google Search Console
  med en HTML-tagg i `site/index.html`.
- **Scopes:** endast `.../auth/drive.file`.
- **Android-klienten:** OAuth-klienten av typen Android ska ha SHA-1 för **både** Skrivros egen
  nyckel och Play-signeringen om Play signerar om appen (se Google Play nedan). Annars fungerar
  inloggningen inte i appen från Play.

## Google Play (Play Console)

### Fil och signering

- Bygg: `npm run build:android -- --play` → `out/Skrivro.aab`.
- **App signing:** välj att ladda upp Skrivros egen nyckel (`~/.penna/penna-release.jks`) som
  appens signeringsnyckel. Då har appen från Play och APK:n från webbplatsen samma signatur, och
  en telefon kan byta mellan dem utan att avinstallera. Väljer Play en egen nyckel måste dess
  SHA-1 läggas till i Google Cloud (se ovan), och webbplatsens APK och Play-appen kan inte
  uppdatera varandra.
- **Nya privatkonton:** ett **stängt test med minst 12 testare i 14 dagar** krävs innan appen
  får släppas i produktion.

### Butikstexter

**Appens namn:** Skrivro: skriv din bok

**Kort beskrivning (sv, högst 80 tecken):**
Skriv din bok i lugn och ro, från första idé till färdigt manus och e-bok.

**App name (en):** Skrivro: write your book

**Short description (en, max 80 characters):**
Write your book in peace, from first idea to finished manuscript and e-book.

**Fullständig beskrivning (sv):**

Skrivro är ett skrivprogram för dig som skriver böcker. Lugnt, svenskt och utan konto.

Skriv

- En lugn skrivyta med fokusläge, skrivmaskinsläge och mål för dagen.
- Kapitel och scener i ett träd som du flyttar runt med fingret.
- Stavningskontroll och upprepningar markerade medan du skriver.

Håll ordning

- Anteckningar om personer, platser och saker, kopplade till namnen i texten.
- Hemligheter: vem vet vad, och när får läsaren veta.
- Versioner av varje scen och säkerhetskopior av hela boken.

Gör klart

- Granska med kommentarer och förslag, som en redaktör.
- Exportera som standardmanus, e-bok (EPUB), tryck-PDF med omslag, Word, Markdown eller webbsida.
- Synopsis och följebrev till förlag, och en lista över dina inskick.

Dina texter är dina

- Böckerna ligger på din telefon. Skrivro har ingen server och samlar inget om dig.
- Vill du ha dem på flera enheter synkar Skrivro via din egen Google Drive.

Skrivro finns även för Windows och är gratis under betan.

**Full description (en):**

Skrivro is a writing app for people who write books. Calm, simple and with no account.

Write

- A calm page with focus mode, typewriter mode and a goal for the day.
- Chapters and scenes in a tree you rearrange with your finger.
- Spelling and repeated words marked as you write.

Stay organised

- Notes on people, places and things, linked to the names in your text.
- Secrets: who knows what, and when the reader finds out.
- Versions of every scene and backups of the whole book.

Finish it

- Review with comments and suggestions, like an editor.
- Export as a standard manuscript, e-book (EPUB), print PDF with cover, Word, Markdown or a web page.
- Synopsis and cover letter for publishers, and a list of your submissions.

Your writing is yours

- Your books stay on your phone. Skrivro has no server and collects nothing about you.
- If you want them on several devices, Skrivro syncs through your own Google Drive.

Skrivro is also available for Windows and is free during the beta.

### Övrigt i Play Console

- **Kategori:** Produktivitet. **Taggar:** Skrivande, Anteckningar, Dokument.
- **Kontakt:** johan.lonelodge@gmail.com, webbplats https://johan-ott.github.io/skrivro/
- **Integritetspolicy:** https://johan-ott.github.io/skrivro/integritet.html
- **Annonser:** Nej.
- **Appåtkomst:** Alla funktioner finns utan inloggning (inloggning behövs bara för synk).
- **Innehållsklassning (IARC):** Verktyg/produktivitet; inget våld, inga köp, ingen chatt
  mellan användare, ingen platsdelning → Alla / PEGI 3.
- **Målgrupp:** 13 år och äldre (Skrivro är inte gjord för barn, och Google-inloggning kräver 13).
- **Nyhetsappar, statliga appar, hälsa, finans:** Nej.

### Datasäkerhet (Data safety)

Play räknar allt som lämnar telefonen som insamlat, även till användarens egen Drive, så:

- **Samlar appen in data?** Ja: endast **Filer och dokument** (böckerna), insamlat men inte
  delat, inte tillfälligt, **valfritt** (bara med synk påslagen), syfte **App functionality**.
- **Krypterat under överföring:** Ja. **Konton:** appen skapar inga egna; inloggning med eget
  Google-konto (Other).
- **Radering:** Ja, med steg på https://johan-ott.github.io/skrivro/privacy.html#delete
- Felrapporter skickas bara när användaren själv mejlar dem, så de räknas inte.

## Microsoft Store (Partner Center)

- När appen är reserverad: **Product management → Product identity**. Där står de fyra
  värdena som ska in i `src-tauri/store.json`: Package/Identity/Name → `identityName`,
  Package/Identity/Publisher → `publisher`, Package/Properties/PublisherDisplayName →
  `publisherDisplayName`, och appens namn → `displayName`.
- Bygg sedan: `npm run build:store` → `out/Skrivro.msix` att ladda upp. Store signerar den, så
  SmartScreen-varningen försvinner. Det bygget letar inte efter uppdateringar och visar inga
  knappar för det; Store uppdaterar appen.
- Varje uppladdning behöver ett högre versionsnummer än förra: `npm run version -- 0.4.14`
  först.

### Johan gör i Partner Center

1. **Namnet Skrivro.** Identiteten reserverades när appen hette Penna (`LoneLodge.PennaWriter`
   står kvar och behöver inte ändras). Reservera namnet Skrivro för samma app under Product
   management, annars stoppas paketet: dess DisplayName måste vara ett reserverat namn.
2. **Ny inlämning → Packages:** ladda upp `out/Skrivro.msix`.
3. **Submission options → Restricted capabilities:** paketet kräver `runFullTrust`. Motivering:
   "Skrivro is a desktop app (Tauri and WebView2) and runs as a full trust Win32 app."
4. **Store listings:** svenska och engelska, eftersom paketet anger båda språken. Bilderna finns
   i `out/store` och `out/store/en` (`node scripts/store/storeImages.mjs`).
5. **Pricing, Properties, Age ratings** enligt punkterna nedan, sedan Submit to the Store.

- **Pris:** Gratis. **Kategori:** Produktivitet.
- **Integritetspolicy:** https://johan-ott.github.io/skrivro/integritet.html
- **Ålder:** IARC-frågorna besvaras som för Play → 3+.
- **Beskrivning:** samma texter som för Play.
- **Kraschdata:** Partner Center visar krascher för Store-appen utan kod i Skrivro.

## Kraschdata och felrapporter

Skrivro skickar ingenting av sig själv. Krascher och "svarar inte" syns i Play Console (Android
vitals) och i Partner Center. Skrivro sparar sina senaste fel på enheten, och efter en krasch
erbjuder nästa start att mejla dem.

## Pris

Gratis i alla butiker under betan. Från 1.0 är tanken Skrivro Pro: skrivandet förblir gratis, och
export till tryck, e-bok, omslag och Studio låses upp med ett engångsköp, samma i alla versioner
(Play Billing på Android, egen licens för Windows och webbplatsen).
