import type { Node } from "prosemirror-model";
import { documentText } from "../../editor/documentText.js";
import type { AppState } from "../App.js";
import { SceneSecretWarnings } from "../notes/SecretPanel.js";
import { sidebarProps } from "../paneProps.js";
import type { OpenScene } from "../sceneSession.js";
import type { Project } from "../useProject.js";
import { BookTasks } from "./BookTasks.js";
import { CommentsSection } from "./CommentsSection.js";
import { PlaceholderTasks } from "./PlaceholderTasks.js";
import type { useComments } from "./useComments.js";

interface CommentsAndTasksProps {
  app: AppState;
  project: Project;
  scene: OpenScene;
  doc: Node;
  comments: ReturnType<typeof useComments>;
}

// The open scene's comments, then what is still open elsewhere in the book.
export function CommentsAndTasks(props: CommentsAndTasksProps) {
  const text = documentText(props.doc).text;
  const onOpen = sidebarProps(props.app, props.project).onOpenScene;
  return (
    <>
      <CommentsSection comments={props.comments} text={text} />
      <SceneSecretWarnings
        book={props.project}
        sceneId={props.scene.id}
        notes={props.app.notes}
        onOpen={onOpen}
      />
      <PlaceholderTasks
        project={props.project}
        open={{ id: props.scene.id, text }}
        onOpen={onOpen}
      />
      <BookTasks
        project={props.project}
        openSceneId={props.scene.id}
        comments={props.comments.comments}
        onOpen={onOpen}
      />
    </>
  );
}
