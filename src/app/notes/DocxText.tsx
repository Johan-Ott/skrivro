import { useEffect, useState } from "react";
import type { Node } from "prosemirror-model";
import { recordFailure } from "@llkit/errorLog.js";
import { docxToMarkdown } from "../../import/docxImport.js";
import { parseMarkdown } from "../../manuscript/parseMarkdown.js";
import { SceneText } from "../contents/sceneDocs.js";
import { platform } from "../platform.js";

/** A Word file read as text, with its bold and italics, by the import the book already has. */
export function DocxText({ path }: { path: string }) {
  const [doc, setDoc] = useState<Node | null>(null);
  useEffect(() => {
    setDoc(null);
    let isCurrent = true;
    platform.fileSystem
      .readBytes(path)
      .then(docxToMarkdown)
      .then((markdown) => isCurrent && setDoc(parseMarkdown(markdown)))
      .catch(recordFailure("Word-filen kunde inte läsas"));
    return () => void (isCurrent = false);
  }, [path]);
  return doc ? (
    <div className="research-text research-docx">
      <SceneText doc={doc} />
    </div>
  ) : null;
}
