import { useCallback, useEffect, useState } from "react";
import { findCover, saveCover, type CoverPicture } from "../../project/cover.js";
import { recordFailure } from "@llkit/errorLog.js";
import { useCoverUrl } from "../exporting/useCover.js";
import { platform } from "../platform.js";
import { t } from "../../i18n/i18n.js";

const PICTURE = { name: t("Bild"), extensions: ["jpg", "jpeg", "png"] };

/** The book's cover picture as an image URL, null while it is read or when it has none. */
export function useShelfCover(dir: string) {
  const [picture, setPicture] = useState<CoverPicture | null>(null);
  const reload = useCallback(
    // A cover that cannot be read leaves the plain cover, as for a book without one.
    () => findCover(platform.fileSystem, dir).catch(() => null),
    [dir],
  );
  useEffect(() => {
    let isCurrent = true;
    void reload().then((found) => isCurrent && setPicture(found));
    return () => {
      isCurrent = false;
    };
  }, [reload]);
  const choose = async () => {
    const picked = await platform.pickFile(PICTURE);
    if (!picked) return;
    await saveCover(platform.fileSystem, dir, picked.bytes).catch(recordFailure(t("Omslaget")));
    setPicture(await reload());
  };
  return { url: useCoverUrl(picture), choose: () => void choose() };
}
