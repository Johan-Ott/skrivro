import { useRef, useState } from "react";
import logo from "../../assets/skrivro-logo.png";
import { platform } from "../platform.js";
import { useRootClass } from "@llkit/useRootClass.js";
import type { Theme } from "../../editor/writingSettings.js";
import { UiLanguageChoice } from "../settings/UiLanguageChoice.js";
import { FirstChoices, freshDraft, type Choices, type Draft } from "./FirstChoices.js";
import { IntroBook, reveal } from "./IntroBook.js";
import { WindowBar } from "@llkit/shell/WindowControls.js";
import { t } from "../../i18n/i18n.js";
import { recordFailure } from "@llkit/errorLog.js";

// The first start, the same on a computer and a phone: Skrivro's language at the top, signed in
// with Google so the books follow, or not, and then the few choices that make Skrivro one's own.

type Start = (withGoogle: boolean | null) => void;

// While the browser is open, a closed tab gives no answer, so Avbryt takes the writer back.
function WayIn(props: { onStart: Start; canSignIn: boolean; isSigningIn: boolean }) {
  const { onStart, canSignIn, isSigningIn } = props;
  if (!canSignIn)
    return (
      <button className="button primary large" onClick={() => onStart(false)}>
        {t("Kom igång")}
      </button>
    );
  return (
    <>
      <button
        className="button primary large"
        disabled={isSigningIn}
        aria-busy={isSigningIn}
        onClick={() => onStart(true)}
      >
        {isSigningIn ? t("Loggar in…") : t("Logga in med Google")}
      </button>
      {isSigningIn ? (
        <button className="link-button" onClick={() => onStart(null)}>
          {t("Avbryt")}
        </button>
      ) : (
        <button className="link-button" onClick={() => onStart(false)}>
          {t("Börja utan konto")}
        </button>
      )}
    </>
  );
}

type WelcomeProps = {
  onStart: (choices: Choices) => Promise<void>;
  /** Signs in; true when the writer's account from another device was found and taken. */
  onSignIn: () => Promise<boolean>;
  theme: Theme;
  onTheme: (theme: Theme) => void;
};

const Problem = ({ text }: { text: string | null }) =>
  text ? (
    <p className="onboarding-problem" role="alert">
      {text}
    </p>
  ) : null;

// The way in: Skrivro's language, what Skrivro is, and signed in or not.
function Greeting(props: { onWay: Start; problem: string | null; isSigningIn: boolean }) {
  const canSignIn = platform.googleSignIn !== undefined;
  return (
    <>
      <div className="welcome-language">
        <UiLanguageChoice />
      </div>
      <Problem text={props.problem} />
      <img className="brand-mark large" src={logo} alt="" />
      <h1>{t("Skriv var du än är.")}</h1>
      <p className="welcome-text">
        {canSignIn
          ? t("Logga in med Google så följer dina böcker med mellan dina enheter.")
          : t("Böckerna sparas som vanliga filer på den här enheten. Inget konto behövs.")}
      </p>
      <span className="spacer" />
      <WayIn onStart={props.onWay} canSignIn={canSignIn} isSigningIn={props.isSigningIn} />
      <p className="welcome-promise">{t("Dina texter är dina. Aldrig AI-träning.")}</p>
    </>
  );
}

// Signed in or not; each try has a number, so the answer to a try given up on is left unread.
function useWayIn(onSignIn: () => Promise<boolean>) {
  const [problem, setProblem] = useState<string | null>(null);
  const [isChoosing, setChoosing] = useState(false);
  const [isSigningIn, setSigningIn] = useState(false);
  const attempt = useRef(0);
  const onWay = (withGoogle: boolean | null) => {
    setProblem(null);
    const current = ++attempt.current;
    setSigningIn(withGoogle === true);
    if (withGoogle === false) return setChoosing(true);
    if (withGoogle === null) return;
    const isCurrent = () => current === attempt.current;
    void onSignIn()
      .then((hasAccount) => isCurrent() && setChoosing(!hasAccount))
      .catch(() => isCurrent() && setProblem(t("Inloggningen blev inte klar. Försök igen.")))
      .finally(() => isCurrent() && setSigningIn(false));
  };
  return { problem, isChoosing, setChoosing, isSigningIn, onWay };
}

// Klar: the card goes, and the book's cover flies to the shelf.
function useReveal(onStart: WelcomeProps["onStart"]) {
  const [isLeaving, setLeaving] = useState(false);
  const onDone = (choices: Choices) => {
    setLeaving(true);
    void reveal(() => onStart(choices)).catch((error: unknown) => {
      setLeaving(false);
      recordFailure("Första starten")(error);
    });
  };
  return { isLeaving, onDone };
}

// Signed in on another device already, the writer has made their choices there.
export function Welcome(props: WelcomeProps) {
  const { problem, isChoosing, setChoosing, isSigningIn, onWay } = useWayIn(props.onSignIn);
  const [draft, setDraft] = useState(freshDraft);
  const { isLeaving, onDone } = useReveal(props.onStart);
  const onDraft = (change: Partial<Draft>) => setDraft((now) => ({ ...now, ...change }));
  useRootClass("welcome-shown");
  return (
    <main className="welcome-room" data-tauri-drag-region>
      <WindowBar />
      <div className="welcome" data-tauri-drag-region>
        {isChoosing ? (
          <FirstChoices
            draft={draft}
            onDraft={onDraft}
            isLeaving={isLeaving}
            onDone={onDone}
            theme={props.theme}
            onTheme={props.onTheme}
            onBack={() => setChoosing(false)}
          />
        ) : (
          <Greeting onWay={onWay} problem={problem} isSigningIn={isSigningIn} />
        )}
      </div>
      <IntroBook draft={draft} isAsking={isChoosing} />
    </main>
  );
}
