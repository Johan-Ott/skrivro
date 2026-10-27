import { useEffect, useState } from "react";
import { isPictureFile, researchPath } from "../../project/researchFiles.js";
import { recordFailure } from "@llkit/errorLog.js";
import { platform } from "../platform.js";
import { t } from "../../i18n/i18n.js";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  txt: "text/plain",
};
const mimeOf = (name: string) =>
  MIME[name.slice(name.lastIndexOf(".") + 1).toLowerCase()] ?? "application/octet-stream";

// A computer opens the file in its own program; a phone hands it to the share sheet.
async function openResearchFile(dir: string, name: string) {
  const path = researchPath(dir, name);
  if (platform.openFile) return platform.openFile(path);
  const bytes = await platform.fileSystem.readBytes(path);
  await platform.shareFile?.(name, bytes, mimeOf(name));
}

export function usePictureUrl(dir: string, name: string) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    // The picture of the file before is not this file's.
    setUrl(null);
    if (!isPictureFile(name)) return;
    let made: string | null = null;
    const show = (bytes: Uint8Array) => {
      made = URL.createObjectURL(new Blob([bytes.slice()]));
      setUrl(made);
    };
    platform.fileSystem
      .readBytes(researchPath(dir, name))
      .then(show)
      .catch(() => setUrl(null));
    return () => {
      if (made) URL.revokeObjectURL(made);
    };
  }, [dir, name]);
  return url;
}

/** The file a research note holds, above the writer's own words about it. */
export function ResearchFile({ dir, name }: { dir: string; name: string }) {
  const url = usePictureUrl(dir, name);
  const canOpen = Boolean(platform.openFile ?? platform.shareFile);
  return (
    <div className="research-file">
      {url && <img className="research-picture" src={url} alt={name} />}
      <div className="research-file-row">
        <span className="research-file-name">{name}</span>
        {canOpen && (
          <button
            className="button secondary small"
            onClick={() =>
              void openResearchFile(dir, name).catch(recordFailure("Filen kunde inte öppnas"))
            }
          >
            {t("Öppna")}
          </button>
        )}
      </div>
    </div>
  );
}
