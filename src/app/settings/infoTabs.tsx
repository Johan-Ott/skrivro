import { platform } from "../platform.js";
import { useState } from "react";
import { errorLog } from "@llkit/errorLog.js";
import { feedbackReport } from "@llkit/feedback/sendFeedback.js";
import { Row } from "@llkit/controls.js";
import { CopyButton } from "../CopyButton.js";
import { checkForUpdates } from "@llkit/updates.js";
import { isSwedish, numberLocale, t } from "../../i18n/i18n.js";

// The report goes to the clipboard, so the writer chooses where to send it and sees what it holds.
const ErrorReportButton = () => (
  <CopyButton
    className="button secondary small"
    label={t("Kopiera felrapport")}
    copy={() => navigator.clipboard.writeText(feedbackReport())}
  />
);

// What went wrong since Skrivro started, shown here instead of only in the copied report.
function RecentErrors() {
  const [latest] = useState(() => errorLog.latest());
  if (latest.length === 0)
    return <p className="error-list-empty">{t("Inga fel sedan starten.")}</p>;
  return (
    <ul className="error-list" aria-label={t("Fel sedan starten")}>
      {latest.map(({ time, message }) => (
        <li key={`${time} ${message}`}>
          <span className="error-time">
            {new Date(time).toLocaleTimeString(numberLocale(), { timeStyle: "short" })}
          </span>{" "}
          {message}
        </li>
      ))}
    </ul>
  );
}

// What Skrivro is built with, as their licences ask.
function Credits() {
  return (
    <>
      <Row
        label={t("Typsnitt")}
        hint={t(
          "Literata, EB Garamond, Crimson Pro, Libre Baskerville, Source Serif 4 och Geist, under SIL Open Font License.",
        )}
      />
      <Row label={t("Boksättning")} hint={t("Typst, under Apache License 2.0.")} />
      <Row
        label={t("Stavning")}
        hint={t(
          "Spellbook, under MPL 2.0. Svensk ordlista av Göran Andersson, under LGPL 3. Brittisk engelsk ordlista ur SCOWL, under MIT och BSD. Danska, norska och tyska ordlistor hämtas första gången en bok behöver dem, under sina egna licenser.",
        )}
      />
    </>
  );
}

// The website's pages, in the language Skrivro is shown in.
const SITE = "https://johan-ott.github.io/skrivro/";
const sitePage = (swedish: string, english: string) => SITE + (isSwedish() ? swedish : english);
const SUPPORT_URL = "https://github.com/Johan-Ott/skrivro/issues";

const Link = ({ url, label }: { url: string; label: string }) => (
  <button className="link-button" onClick={() => void platform.openLink(url)}>
    {label}
  </button>
);

// Privacy, terms and support, which live on the website.
function SiteLinks() {
  return (
    <>
      <Row
        label={t("Integritet")}
        hint={t(
          "Skrivro har inga konton och samlar inte in något. Dina texter lämnar enheten bara till din egen Google Drive, om du kopplar den. Skrivro frågar GitHub om det finns en ny version och hämtar ordlistor från jsDelivr. De ser att en enhet frågar, aldrig vad du skriver. Feedback skickar du själv, som ett vanligt mejl.",
        )}
      >
        <Link url={sitePage("integritet.html", "privacy.html")} label={t("Integritetspolicy")} />
      </Row>
      <Row
        label={t("Villkor och licenser")}
        hint={t(
          "Skrivro är gratis under betan och levereras i befintligt skick. Dina texter är dina; ta egna säkerhetskopior av det som är viktigt.",
        )}
      >
        <Link url={sitePage("villkor.html", "terms.html")} label={t("Läs villkoren")} />
      </Row>
      <Row label={t("Hjälp och support")} hint={t("Frågor, fel och önskemål.")}>
        <Link url={SUPPORT_URL} label={t("Skriv till oss")} />
      </Row>
    </>
  );
}

export function AboutTab() {
  return (
    <>
      <Row label={t("Version")} hint={__APP_VERSION__}>
        {/* The Store updates its own build. */}
        {!__STORE__ && (
          <button className="button secondary small" onClick={() => void checkForUpdates(true)}>
            {t("Sök efter uppdateringar")}
          </button>
        )}
      </Row>
      <Row
        label={t("Felrapport")}
        hint={t("Version, enhet och de senaste felen, att klistra in när du ber om hjälp.")}
      >
        <ErrorReportButton />
      </Row>
      <RecentErrors />
      <SiteLinks />
      <Credits />
    </>
  );
}
