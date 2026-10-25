import { invoke } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { createTauriPlatform, isPhone, withForwardSlashes } from "@llkit/platform/tauri.js";
import { tauriFileSystem } from "@llkit/storage/tauriFileSystem.js";
import { STATE_FILE } from "../sync/syncState.js";
import { confirmInApp } from "./ConfirmLayer.js";
import type { Platform, RemoteState, Spelling } from "./platform.js";
import { androidSignIn, computerSignIn } from "./tauriGoogleSignIn.js";
import { t } from "../i18n/i18n.js";

// Skrivro through Tauri: llkit's device, and the books' own parts: removing a book, its backups,
// the spelling check, Typst, Google and the remote control, each a command in Skrivro's Rust.

function googleSignInHere() {
  if (/Android/i.test(navigator.userAgent)) return { googleSignIn: androidSignIn };
  return isPhone ? {} : { googleSignIn: computerSignIn };
}

// A computer puts the book in its trash; a phone has none, so the question says so, and says
// whether Drive has the book at all.
async function phoneMessage(dir: string, title: string) {
  const isSynced = (await tauriFileSystem.modifiedAt(`${dir}/${STATE_FILE}`)) !== null;
  return isSynced
    ? t("”{title}” raderas från telefonen. Det som hunnit synkas finns kvar i Google Drive.", {
        title,
      })
    : t("”{title}” raderas från telefonen för gott. Den finns inte i Google Drive.", { title });
}

async function removeBook(dir: string, title: string, isEverywhere = false) {
  const here = t("”{title}” flyttas till papperskorgen, där du kan lägga tillbaka den.", { title });
  const message = isPhone ? await phoneMessage(dir, title) : here;
  const everywhere = t("”{title}” tas bort här och läggs i papperskorgen i din Drive i 30 dagar.", {
    title,
  });
  const isSure = await confirmInApp({
    title: t("Ta bort boken"),
    message: isEverywhere ? everywhere : message,
    okLabel: t("Ta bort"),
  });
  if (isSure) await invoke("remove_book", { path: dir });
  return isSure;
}

const backups = {
  dir: async () => `${withForwardSlashes(await appDataDir())}/backups`,
  remove: (path: string) => invoke("remove_backup", { path }).then(() => undefined),
};

const spelling: Spelling = {
  misspelled: (language, words) => invoke("misspelled_words", { language, words }),
  suggestions: (language, word) => invoke("spelling_suggestions", { language, word }),
  prepare: (language) => invoke("prepare_dictionary", { language }),
};

const remoteControl = (turnOn?: boolean) => invoke<RemoteState>("remote_control", { turnOn });

export const tauriPlatform: Platform = {
  ...createTauriPlatform({ releases: "Johan-Ott/skrivro" }),
  ...(__STORE__ ? { checkForUpdate: async () => null } : {}),
  removeBook,
  backups,
  spelling,
  typstCompiler: () => invoke<ArrayBuffer>("typst_compiler"),
  prepareTypst: () => invoke("prepare_typst"),
  fetchedParts: () => invoke("fetched_parts"),
  ...(isPhone ? {} : { remoteControl }),
  ...googleSignInHere(),
};
