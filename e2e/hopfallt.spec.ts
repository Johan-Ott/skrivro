import { expect, test } from "@playwright/test";
import { openExample } from "./helpers";

// On a phone the add buttons stay in sight with a section folded, and adding unfolds it.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openExample(page);
});

test("+ Lägg till shows with the manuscript folded, and a new chapter unfolds it", async ({
  page,
}) => {
  const book = page.getByRole("button", { name: "Manus" });
  await book.click();
  await expect(book).toHaveAttribute("aria-expanded", "false");
  const add = page.getByRole("button", { name: "+ Lägg till" });
  await expect(add).toBeVisible();

  await add.click();
  await page.getByRole("menuitem", { name: "Nytt kapitel" }).click();

  await expect(book).toHaveAttribute("aria-expanded", "true");
});

test("+ Ny anteckning shows with Anteckningar folded, and the new note unfolds it", async ({
  page,
}) => {
  const notes = page.getByRole("button", { name: "Anteckningar" });
  if ((await notes.getAttribute("aria-expanded")) === "true") await notes.click();
  await expect(notes).toHaveAttribute("aria-expanded", "false");

  await page.getByRole("button", { name: "+ Ny anteckning" }).click();
  const dialog = page.getByRole("dialog", { name: "Ny anteckning" });
  await dialog.getByRole("textbox", { name: "Namn" }).fill("Henrik");
  await dialog.getByRole("button", { name: "Skapa" }).click();

  await page.evaluate(() => history.back());
  await expect(notes).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("treeitem").filter({ hasText: "Henrik" })).toBeVisible();
});
