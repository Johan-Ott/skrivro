import { useEffect, useState } from "react";
import { usePictureUrl } from "../usePictureUrl.js";
import {
  isDocxFile,
  isPdfFile,
  isPictureFile,
  isTextFile,
  researchPath,
} from "../../project/researchFiles.js";
import { DocxText } from "./DocxText.js";
import { PdfPages } from "./PdfPages.js";
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

/** The picture a research note holds; null for a PDF or any other file. */
export function useResearchPicture(dir: string, name: string) {
  const path = researchPath(dir, name);
  return usePictureUrl(isPictureFile(name) ? path : null, () =>
    platform.fileSystem.readBytes(path),
  );
}

function useFileText(path: string, isText: boolean) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    setText(null);
    if (!isText) return;
    let isCurrent = true;
    platform.fileSystem.readText(path).then(
      (read) => isCurrent && setText(read),
      () => undefined,
    );
    return () => void (isCurrent = false);
  }, [path, isText]);
  return text;
}

/** The file itself, read in the book: the picture, the PDF page by page, or the text. */
export function FileContent({ dir, name }: { dir: string; name: string }) {
  const path = researchPath(dir, name);
  const url = useResearchPicture(dir, name);
  const text = useFileText(path, isTextFile(name));
  if (isPdfFile(name))
    return <PdfPages path={path} read={() => platform.fileSystem.readBytes(path)} />;
  if (isDocxFile(name)) return <DocxText path={path} />;
  if (text !== null) return <pre className="research-text">{text}</pre>;
  return url ? <img className="research-picture" src={url} alt={name} /> : null;
}

/** The file a research note holds, above the writer's own words about it. Its whole name, with
 * the ending, comes right under the title, so mini.pdf and mini.txt can be told apart. */
export function ResearchFile({ dir, name }: { dir: string; name: string }) {
  const canOpen = Boolean(platform.openFile ?? platform.shareFile);
  return (
    <div className="research-file">
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
      <FileContent dir={dir} name={name} />
    </div>
  );
}
