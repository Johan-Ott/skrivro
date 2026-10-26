import { expect, test } from "@playwright/test";
import { editor, openExample, runCommand } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await editor(page).click();
  await runCommand(page, "Gå till Innehåll");
});

test("a chapter folds out to its scenes, each with its own Vad händer?", async ({ page }) => {
  await page.getByRole("button", { name: "Scener i Brevet" }).click();
  const scenes = page.locator(".contents-row.scene");
  await expect(scenes).toHaveCount(2);
  await expect(scenes.first()).toContainText("Köket");

  const summary = scenes.first().getByRole("textbox", { name: "Vad händer?" });
  await summary.fill("Elin hittar brevet.");
  await summary.press("Enter");
  await page.getByRole("button", { name: "Scener i Brevet" }).click();
  await page.getByRole("button", { name: "Scener i Brevet" }).click();
  await expect(
    page.locator(".contents-row.scene").first().getByRole("textbox", { name: "Vad händer?" }),
  ).toHaveValue("Elin hittar brevet.");
});

test("a scene dragged onto another chapter moves into it", async ({ page }) => {
  await page.getByRole("button", { name: "Scener i Brevet" }).click();
  const isen = page.locator(".contents-row.scene", { hasText: "Isen" });
  const fyren = page.locator(".contents-row:not(.scene)", { hasText: "Fyren" }).first();
  await isen.dragTo(fyren);

  await page.getByRole("button", { name: "Scener i Fyren" }).click();
  await expect(page.locator(".contents-row.scene", { hasText: "Isen" })).toHaveCount(1);
  await page
    .locator(".tree")
    .getByRole("treeitem", { name: /2\. Fyren/ })
    .click();
  await expect(page.locator(".tree")).toContainText(/2\. Fyren[\s\S]*Isen/);
});

test("a filter that finds nothing says so", async ({ page }) => {
  await page.getByRole("textbox", { name: "Filtrera" }).fill("xyzzy");

  await expect(page.getByText("Inget kapitel har ”xyzzy”.")).toBeVisible();
});

test("a filter also finds the notes by name, so a person is one click away", async ({ page }) => {
  await page.getByRole("textbox", { name: "Filtrera" }).fill("Elin");

  const notes = page.locator(".contents-notes");
  await expect(notes.getByRole("button", { name: "Elin", exact: true })).toBeVisible();
  await expect(page.getByText("Inget kapitel har")).toHaveCount(0);
});
