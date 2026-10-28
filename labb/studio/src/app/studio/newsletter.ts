import { DOMSerializer, type Node } from "prosemirror-model";
import { readBookScenes } from "../../export/book.js";
import { manuscriptSchema } from "../../manuscript/schema.js";
import { excerptBlocks } from "../../project/studio.js";
import { findNode, manuscriptSceneIds } from "../../project/tree.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";

const EXCERPT_WORDS = 600;
const serializer = DOMSerializer.fromSchema(manuscriptSchema);
const wordsOf = (node: Node) => node.textContent.split(/\s+/).filter(Boolean).length;

/** The chapter's paragraphs as HTML, all of them or the first EXCERPT_WORDS words' worth. */
export async function chapterBlocks(project: Project, chapterId: string, isExcerpt: boolean) {
  const chapter = findNode(project.tree, chapterId)?.node;
  if (!chapter) return [];
  const ids = manuscriptSceneIds([chapter]);
  const titles = Object.fromEntries(ids.map((id) => [id, project.summaries[id]?.title ?? id]));
  const scenes = await readBookScenes(platform.fileSystem, project.dir, ids, titles);
  const blocks = ids.flatMap((id) => {
    const children: Node[] = [];
    scenes.get(id)?.forEach((child) => children.push(child));
    return children;
  });
  return isExcerpt ? excerptBlocks(blocks, wordsOf, EXCERPT_WORDS) : blocks;
}

function htmlOf(blocks: Node[], style: (tag: string) => string) {
  const holder = document.createElement("div");
  blocks.forEach((block) => holder.append(serializer.serializeNode(block)));
  holder
    .querySelectorAll("p, div")
    .forEach((element) => element.setAttribute("style", style(element.tagName)));
  return holder.innerHTML;
}

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain HTML for Substack and Patreon, which take their own type. */
export const simpleHtml = (title: string, blocks: Node[]) =>
  `<h2>${escape(title)}</h2>${htmlOf(blocks, () => "")}`;

/** About the author, from the profile, under the chapter; nothing when the profile is empty. */
export interface Signature {
  about: string;
  link: string;
}

function signatureHtml({ about, link }: Signature) {
  const style = "font-family:system-ui,sans-serif;font-size:13px;line-height:1.6;color:#5c5c5c;";
  const linked = link
    ? ` <a href="${escape(link)}" style="color:#0e6b4f;">${escape(link)}</a>`
    : "";
  return about || link
    ? `<p style="${style}border-top:1px solid #e7e5e1;padding-top:14px;margin-top:24px;">${escape(about)}${linked}</p>`
    : "";
}

/** HTML with its type set inline, as a mail program keeps it. */
export function mailHtml(title: string, intro: string, blocks: Node[], signature: Signature) {
  const prose = "font-family:Georgia,serif;font-size:16px;line-height:1.75;color:#1a1a1a;margin:0;";
  const body = htmlOf(blocks, (tag) =>
    tag === "P" ? `${prose}text-indent:1.5em;` : "margin:12px 0;",
  );
  return [
    `<div style="max-width:560px;margin:0 auto;">`,
    `<p style="font-family:system-ui,sans-serif;font-size:14px;color:#3d3d3d;">${escape(intro)}</p>`,
    `<h2 style="font-family:Georgia,serif;font-size:24px;">${escape(title)}</h2>`,
    body,
    signatureHtml(signature),
    `</div>`,
  ].join("");
}

/** Put on the clipboard as HTML, with the plain text beside it for programs that take only that. */
export async function copyHtml(html: string) {
  // A parsed page has no layout, so innerText would run the paragraphs together.
  const page = new DOMParser().parseFromString(html, "text/html");
  const plain = Array.from(page.body.querySelectorAll("p, h1, h2, h3, li"))
    .map((block) => block.textContent?.trim())
    .filter(Boolean)
    .join("\n\n");
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plain], { type: "text/plain" }),
    }),
  ]);
}
