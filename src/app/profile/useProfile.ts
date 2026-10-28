import { useCallback, useEffect, useState } from "react";
import { writeAtomic } from "@llkit/storage/atomicWrite.js";
import { joinPath } from "@llkit/storage/fileSystem.js";
import { recordFailure } from "@llkit/errorLog.js";
import { libraryOf } from "../libraryFolder.js";
import { platform } from "../platform.js";

/** What the writer says about themselves; the name itself lives in the settings, as before. */
export interface Profile {
  about: string;
  link: string;
  /** A small picture as a data URL, or empty for the first letter of the name. */
  picture: string;
  /** The frame around the picture and the title under the name, by id; empty for none. */
  frame: string;
  title: string;
}

const NO_PROFILE: Profile = { about: "", link: "", picture: "", frame: "", title: "" };
const profilePath = (library: string) => joinPath(library, "profil.json");
const text = (value: unknown) => (typeof value === "string" ? value : "");

function profileFrom(fileText: string): Profile {
  try {
    const parsed = JSON.parse(fileText) as Record<string, unknown>;
    return {
      about: text(parsed["about"]),
      link: text(parsed["link"]),
      picture: text(parsed["picture"]),
      frame: text(parsed["frame"]),
      title: text(parsed["title"]),
    };
  } catch {
    return NO_PROFILE;
  }
}

/** The profile in the Skrivro folder; signed in with Google, it follows to every device. */
export function useProfile(libraryDir: string | null) {
  const [profile, setProfile] = useState(NO_PROFILE);
  const [isLoaded, setLoaded] = useState(false);
  const [isOpen, setOpen] = useState(false);
  useEffect(() => {
    void libraryOf(libraryDir)
      .then((library) => platform.fileSystem.readText(profilePath(library)))
      .then((fileText) => setProfile(profileFrom(fileText)))
      .catch(() => setProfile(NO_PROFILE))
      .finally(() => setLoaded(true));
  }, [libraryDir]);
  const save = useCallback(
    (next: Profile) => {
      setProfile(next);
      void libraryOf(libraryDir)
        .then(async (library) => {
          await platform.fileSystem.makeDir(library);
          await writeAtomic(
            platform.fileSystem,
            profilePath(library),
            `${JSON.stringify(next, null, 2)}\n`,
          );
        })
        .catch(recordFailure("Profilen kunde inte sparas"));
    },
    [libraryDir],
  );
  const close = () => setOpen(false);
  return { profile, save, isLoaded, isOpen, open: () => setOpen(true), close };
}
