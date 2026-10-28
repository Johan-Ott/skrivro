import type { AppState } from "./App.js";
import { ReadAloud } from "./ReadAloud.js";
import { SuggestingBar } from "./review/Suggesting.js";
import type { Project } from "./useProject.js";

/** Over the text on the computer and the phone alike: reading aloud and suggestions. */
export function TextBands({ app, project }: { app: AppState; project: Project }) {
  return (
    <>
      <ReadAloud app={app} project={project} />
      <SuggestingBar app={app} />
    </>
  );
}
