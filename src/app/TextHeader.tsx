import { useEffect, useRef, useState } from "react";
import { useMenuButton, type MenuItem } from "@llkit/Menu.js";
import { withNodeText } from "../project/contents.js";
import { findNode, type TreeNode } from "../project/tree.js";
import { chapterOf, type SceneChapter } from "../project/treeLabels.js";
import type { Project } from "./useProject.js";
import { chapterLabel, isBareNumber } from "./bookLook.js";
import { PartPage } from "./PartPage.js";
import { t } from "../i18n/i18n.js";

interface TextHeaderProps {
  project: Project;
  sceneId: string;
  onChangeTree: (tree: TreeNode[]) => void;
  onReadChapter: (chapterId: string) => void;
  /** The scene's saved versions, at hand where the text begins. */
  onShowVersions: (sceneId: string) => void;
}

// What was asked for from the menu is focused where it appears.
function useFocusWhenAsked<Element extends HTMLElement>(isAsked: boolean) {
  const ref = useRef<Element>(null);
  useEffect(() => {
    if (isAsked) ref.current?.focus();
  }, [isAsked]);
  return ref;
}

function WhenField(props: { when: string; isAsked: boolean; onSave: (text: string) => void }) {
  const ref = useFocusWhenAsked<HTMLInputElement>(props.isAsked);
  return (
    <label className="eyebrow-end text-when">
      <span>{t("När:")}</span>
      <input
        ref={ref}
        key={props.when}
        aria-label={t("När händer det?")}
        placeholder={t("ange")}
        defaultValue={props.when}
        onBlur={(event) => event.target.value !== props.when && props.onSave(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
      />
    </label>
  );
}

// "När" belongs to the chapter, or to a scene that is not in a chapter.
function headingOf(project: Project, sceneId: string) {
  const chapter = chapterOf(project.tree, sceneId);
  const title = project.summaries[sceneId]?.title ?? "";
  const whenId = chapter?.id ?? sceneId;
  const place = chapter
    ? t("Kapitel {number} · {title}", { number: chapter.number, title })
    : title;
  return { chapter, place, whenId, when: findNode(project.tree, whenId)?.node.when ?? "" };
}

// What the chapter is for, as Innehåll and the book's structure say it, at hand while writing it.
// Not part of the book: it is never read or printed.
function ChapterTask(
  props: Pick<TextHeaderProps, "project" | "onChangeTree"> & {
    chapterId: string;
    isAsked: boolean;
  },
) {
  const { project, chapterId } = props;
  const ref = useFocusWhenAsked<HTMLTextAreaElement>(props.isAsked);
  const summary = findNode(project.tree, chapterId)?.node.summary ?? "";
  const save = (text: string) =>
    text !== summary && props.onChangeTree(withNodeText(project.tree, chapterId, "summary", text));
  return (
    <textarea
      ref={ref}
      key={summary}
      className="chapter-task"
      aria-label={t("Vad händer i kapitlet?")}
      placeholder={t("Vad händer i kapitlet?")}
      defaultValue={summary}
      rows={1}
      onBlur={(event) => save(event.target.value.trim())}
      onKeyDown={(event) =>
        event.key === "Enter" && (event.preventDefault(), event.currentTarget.blur())
      }
    />
  );
}

// The number shows only with book type, as the printed book numbers it above the title.
function ChapterOpening(
  props: Pick<TextHeaderProps, "project" | "onChangeTree"> & {
    chapter: SceneChapter;
    isTaskAsked: boolean;
    hasTask: boolean;
  },
) {
  const { chapter, project } = props;
  const fields = project.fields;
  const label = chapterLabel(fields, chapter.number, chapter.title);
  return (
    <>
      <PartPage project={project} chapterId={chapter.id} onChangeTree={props.onChangeTree} />
      {label && (
        <span className={isBareNumber(fields) ? "chapter-number bare" : "chapter-number"}>
          {label}
        </span>
      )}
      <h1 className="chapter-title">{chapter.title}</h1>
      {props.hasTask && (
        <ChapterTask
          project={project}
          chapterId={chapter.id}
          isAsked={props.isTaskAsked}
          onChangeTree={props.onChangeTree}
        />
      )}
    </>
  );
}

type Field = "when" | "task";
type AskedHere = { sceneId: string; field: Field };

// Fields without text stay out of the way until the menu asks for them.
function chapterItems(
  props: TextHeaderProps,
  chapter: SceneChapter | null,
  ask: (field: "when" | "task") => void,
) {
  const items: MenuItem[] = [];
  if (chapter)
    items.push({ label: t("Läs kapitlet"), onSelect: () => props.onReadChapter(chapter.id) });
  items.push({ label: t("Versioner"), onSelect: () => props.onShowVersions(props.sceneId) });
  items.push({ label: t("När händer det…"), onSelect: () => ask("when") });
  if (chapter?.isFirstScene)
    items.push({ label: t("Vad händer i kapitlet…"), onSelect: () => ask("task") });
  return items;
}

function Eyebrow(
  props: TextHeaderProps & { askedHere: Field | null; onAsk: (field: Field) => void },
) {
  const { project, sceneId, onChangeTree } = props;
  const { chapter, place, whenId, when } = headingOf(project, sceneId);
  const menu = useMenuButton(t("Kapitlet"), chapterItems(props, chapter, props.onAsk));
  return (
    <div className="text-eyebrow">
      <span className="text-place">
        {place}
        <button className="read-link" aria-label={t("Meny för kapitlet")} onClick={menu.open}>
          ⋯
        </button>
        {menu.menu}
      </span>
      {(when !== "" || props.askedHere === "when") && (
        <WhenField
          when={when}
          isAsked={props.askedHere === "when"}
          onSave={(text) => onChangeTree(withNodeText(project.tree, whenId, "when", text))}
        />
      )}
    </div>
  );
}

const hasTask = (project: Project, chapterId: string) =>
  (findNode(project.tree, chapterId)?.node.summary ?? "") !== "";

export function TextHeader(props: TextHeaderProps) {
  const { project, sceneId } = props;
  const chapter = chapterOf(project.tree, sceneId);
  const [asked, setAsked] = useState<AskedHere | null>(null);
  const askedHere = asked?.sceneId === sceneId ? asked.field : null;
  return (
    <header className="text-header">
      <Eyebrow {...props} askedHere={askedHere} onAsk={(field) => setAsked({ sceneId, field })} />
      {chapter?.isFirstScene && (
        <ChapterOpening
          chapter={chapter}
          project={project}
          isTaskAsked={askedHere === "task"}
          hasTask={hasTask(project, chapter.id) || askedHere === "task"}
          onChangeTree={props.onChangeTree}
        />
      )}
    </header>
  );
}
