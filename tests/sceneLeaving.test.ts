import type { Node } from "prosemirror-model";
import { createMemoryFileSystem } from "@llkit/storage/memoryFileSystem.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSceneSession, openScene, sceneEdited } from "../src/app/sceneSession";
import { flushOrKeep } from "../src/app/keepText";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { listSnapshots } from "../src/project/snapshots";

const SCENE_PATH = "/bok/scenes/01J9Z4K2QX.md";
const SCENE = "---\nid: 01J9Z4K2QX\ntitle: Köket\n---\nBrevet låg där.\n";

async function opened() {
  const files = createMemoryFileSystem({ [SCENE_PATH]: SCENE });
  let editorDoc: Node | null = null;
  const session = createSceneSession(files, {
    editor: { load: (doc) => (editorDoc = doc), currentDoc: () => editorDoc },
    onScene: () => undefined,
    onConflict: () => undefined,
    onSaveStatus: () => undefined,
  });
  await openScene(session, "/bok", "01J9Z4K2QX");
  const type = (markdown: string) => {
    editorDoc = parseMarkdown(markdown);
    sceneEdited(session, editorDoc);
  };
  return { files, session, type };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("leaving the app with text that waits", () => {
  it("writes it to the scene file as usual", async () => {
    const { files, session, type } = await opened();
    type("Brevet låg kvar.");

    const isSafe = await flushOrKeep(session);

    expect(isSafe).toBe(true);
    expect(await files.readText(SCENE_PATH)).toContain("Brevet låg kvar.");
  });

  it("keeps it as a version when a conflict or a sync holds the save, so it is not lost", async () => {
    const { files, session, type } = await opened();
    session.autosave.hold();
    type("Brevet låg kvar, och mer.");

    const isSafe = await flushOrKeep(session);

    expect(isSafe).toBe(true);
    expect(await files.readText(SCENE_PATH)).toBe(SCENE);
    const versions = await listSnapshots(files, { dir: "/bok", id: "01J9Z4K2QX" });
    expect(versions.map((version) => version.body).join("")).toContain("Brevet låg kvar, och mer.");
  });

  it("makes no version when nothing waits", async () => {
    const { files, session } = await opened();
    session.autosave.hold();

    await flushOrKeep(session);

    expect(await listSnapshots(files, { dir: "/bok", id: "01J9Z4K2QX" })).toEqual([]);
  });
});

describe("leaving the app several times in a row while the save is held", () => {
  it("keeps the waiting text as one version, not one for each time the page is hidden", async () => {
    const { files, session, type } = await opened();
    session.autosave.hold();
    type("Brevet låg kvar, och mer.");

    await flushOrKeep(session);
    await flushOrKeep(session);
    await flushOrKeep(session);

    expect(await listSnapshots(files, { dir: "/bok", id: "01J9Z4K2QX" })).toHaveLength(1);
  });
});
