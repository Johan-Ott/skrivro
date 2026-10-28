import { expect, test } from "@playwright/test";
import { editor, openExample, sidebar, treeRow } from "./helpers";

// The tree's two sections, the manuscript and Anteckningar, fold apart and remember it.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

test("the notes fold apart from the manuscript, and stay folded for a note opened", async ({
  page,
}) => {
  const notes = sidebar(page).getByRole("button", { name: "Anteckningar" });
  await notes.click();
  await expect(notes).toHaveAttribute("aria-expanded", "false");
  await expect(treeRow(page, "Personer")).toBeHidden();
  await expect(treeRow(page, "1. Brevet")).toBeVisible();

  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("Elin");
  await page.keyboard.press("Enter");
  await expect(editor(page)).toContainText("Trettioåtta");
  await expect(notes).toHaveAttribute("aria-expanded", "false");
});

test("a note just made unfolds the notes and shows its row", async ({ page }) => {
  const notes = sidebar(page).getByRole("button", { name: "Anteckningar" });
  await notes.click();
  await expect(notes).toHaveAttribute("aria-expanded", "false");

  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("Ny anteckning");
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Ny anteckning" });
  await dialog.getByRole("textbox", { name: "Namn" }).fill("Henrik");
  await dialog.getByRole("button", { name: "Skapa" }).click();

  await expect(notes).toHaveAttribute("aria-expanded", "true");
  await expect(sidebar(page).locator(".tree-row.active")).toContainText("Henrik");
});

test("a scene is made a note in Platser from its menu, and shows there", async ({ page }) => {
  await treeRow(page, "Isen").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Gör till anteckning i" }).click();
  await page.getByRole("menuitem", { name: "Platser", exact: true }).click();

  const notes = sidebar(page).getByRole("button", { name: "Anteckningar" });
  await expect(notes).toHaveAttribute("aria-expanded", "true");
  // The moved row is marked like the open one, so its word count shows after the name.
  const texts = await sidebar(page).getByRole("treeitem").allInnerTexts();
  const rows = texts.map((text) => text.split("\n")[0]);
  const isen = rows.indexOf("Isen");
  expect(isen).toBeGreaterThan(rows.indexOf("Platser"));
  expect(isen).toBeLessThan(rows.indexOf("Saker"));
  await expect(treeRow(page, "Isen")).toBeInViewport();
  await expect(sidebar(page).getByRole("treeitem", { name: "Isen" })).toBeFocused();
});
