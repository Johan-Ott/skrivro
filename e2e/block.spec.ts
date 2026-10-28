import { expect, test, type Page } from "@playwright/test";
import type { platform as appPlatform } from "../src/app/platform";
import { openExample, openLayouts, togglePanel } from "./helpers";

const BOOK = "/Användare/Elin/Dokument/Skrivro/Vintervägen.skrivro";

test.beforeEach(async ({ page }) => {
  await openExample(page);
});

// The example's lapp is a note file in the sort Lappar; its colour and lines stand in its front matter.
const LAPP = "01J9Z4K2QX00000000000000A1";

const lappFile = (page: Page) =>
  page.evaluate(
    async ({ dir, id }) => {
      const url = "/src/app/platform.ts";
      const { platform } = (await import(url)) as { platform: typeof appPlatform };
      return platform.fileSystem.readText(`${dir}/scenes/${id}.md`).catch(() => "");
    },
    { dir: BOOK, id: LAPP },
  );

test("Lappar are written in and drawn on, and kept in the book's folder", async ({ page }) => {
  await togglePanel(page, "Lappar");
  const note = page.getByRole("region", { name: "Lapp" });
  await note.getByRole("textbox", { name: "Lappens text" }).fill("Kolla årtalet på fyren.");
  await note.getByRole("button", { name: "Rosa" }).click();
  await note.getByRole("button", { name: "Rita" }).click();
  const box = (await note.locator(".note-drawing").boundingBox()) ?? { x: 0, y: 0 };
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 60, { steps: 5 });
  await page.mouse.up();

  await expect.poll(() => lappFile(page)).toContain("---\nKolla årtalet på fyren.");
  const saved = await lappFile(page);
  expect(saved).toContain("color: rosa\n");
  expect(saved).toMatch(/strokes: \[\[\[/);
});

test("I scenen lists who is named in the scene, and opens a note beside the text", async ({
  page,
}) => {
  await togglePanel(page, "I scenen");
  const block = page.getByRole("region", { name: "I scenen" });
  await expect(block).toContainText("Elin");
  await expect(block).toContainText("Arvid");

  await block.getByRole("button", { name: /Arvid/ }).click();

  await expect(page.locator(".beside-pane")).toContainText("Arvid");
});

test("a layout keeps which panels are open, and brings them back", async ({ page }) => {
  await togglePanel(page, "I scenen");
  await openLayouts(page);
  await page.getByRole("menuitem", { name: "Spara som layout 1" }).click();
  await togglePanel(page, "I scenen");
  await expect(page.getByRole("region", { name: "I scenen" })).toBeHidden();

  await openLayouts(page);
  await page.getByRole("menuitemradio", { name: "Layout 1" }).click();

  await expect(page.getByRole("region", { name: "I scenen" })).toBeVisible();
});

test("the mode tabs and the dock have words, not only pictures", async ({ page }) => {
  await expect(page.getByRole("tab", { name: "Skriv" })).toHaveText("Skriv");
  await expect(page.getByRole("tab", { name: "Publicera" })).toHaveText("Publicera");
  await expect(page.getByRole("button", { name: /^Paneler/ })).toContainText("Paneler");
  await expect(page.getByRole("button", { name: /^Layouter/ })).toContainText("Layouter");
});
