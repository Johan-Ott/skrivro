import { useCallback, useEffect, useState } from "react";
import { findCover, saveCover, type CoverPicture } from "../../project/cover.js";
import { platform } from "../platform.js";
import { usePictureUrl } from "../usePictureUrl.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

const PICTURE = { name: t("Bild"), extensions: ["jpg", "jpeg", "png"] };

export function useCover(project: Project) {
  const [picture, setPicture] = useState<CoverPicture | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const dir = project.dir;
  const reload = useCallback(
    async () => setPicture(await findCover(platform.fileSystem, dir)),
    [dir],
  );
  useEffect(() => void reload(), [reload]);
  const url = useCoverUrl(picture);
  const choose = async () => {
    const picked = await platform.pickFile(PICTURE);
    if (!picked) return;
    try {
      await saveCover(platform.fileSystem, dir, picked.bytes);
      setProblem(null);
      await reload();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : t("Bilden kunde inte sparas."));
    }
  };
  return { picture, url, problem, choose: () => void choose() };
}

/** The cover as an address for an <img>; a new cover read is a new picture. */
export const useCoverUrl = (picture: CoverPicture | null) =>
  usePictureUrl(picture, async () => picture?.bytes ?? null);
