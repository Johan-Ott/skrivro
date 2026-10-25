import { expect, test } from "@playwright/test";
import { openExample } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

test("pieces are added to a book that exists once: its notes, labels and closing chapter", async ({
  page,
}) => {
  await page.locator(".book-title-menu:not(.contents)").click();
  await page.getByRole("menuitem", { name: "Mallar och bitar…" }).click();
  const dialog = page.getByRole("dialog", { name: "Mallar och bitar" });
  await dialog.getByRole("button", { name: "Litterär roman" }).click();
  await dialog.getByRole("button", { name: "Serie" }).click();
  await dialog.getByRole("button", { name: "Lägg till", exact: true }).click();

  const sidebar = page.locator(".sidebar");
  await expect(sidebar.getByText("Teman", { exact: true })).toBeVisible();
  await expect(sidebar.getByText("Kroken")).toBeVisible();

  await page.locator(".book-title-menu:not(.contents)").click();
  await page.getByRole("menuitem", { name: "Mallar och bitar…" }).click();
  await dialog.getByRole("button", { name: "Serie" }).click();
  await dialog.getByRole("button", { name: "Lägg till", exact: true }).click();
  await expect(sidebar.getByText("Kroken")).toHaveCount(1);
  await expect(sidebar.getByText("Teman", { exact: true })).toHaveCount(1);
});

test("a genre pack is added from Mallar och bitar, and its templates start new notes", async ({
  page,
}) => {
  await page.locator(".book-title-menu:not(.contents)").click();
  await page.getByRole("menuitem", { name: "Mallar och bitar…" }).click();
  const dialog = page.getByRole("dialog", { name: "Mallar och bitar" });
  const crime = dialog.locator(".pack-row").filter({ hasText: "Deckare" });
  await crime.getByRole("button", { name: "Lägg till i boken" }).click();

  await expect(crime.getByText("✓ I boken")).toBeVisible();
  await expect(crime.getByRole("button", { name: "Lägg till i boken" })).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator(".sidebar")).toContainText("Guide");
  await expect(page.locator(".sidebar")).toContainText("Ledtrådar");

  await page.getByRole("button", { name: "+ Ny anteckning" }).click();
  const note = page.getByRole("dialog", { name: "Ny anteckning" });
  await note.getByRole("textbox", { name: "Namn" }).fill("Kommissarie Berg");
  await note.getByRole("radio", { name: "Utredaren" }).click();
  await page.screenshot({ path: `${process.env["TMP"]}/ny-anteckning-mall.png` });
  await note.getByRole("button", { name: "Skapa" }).click();
  await expect(page.locator(".ProseMirror")).toContainText("Roll och mandat");
  await page.screenshot({ path: `${process.env["TMP"]}/mall-anteckning.png` });
});

test("a note saved as a template starts the next note in its sort", async ({ page }) => {
  const sidebar = page.locator(".sidebar");
  await sidebar.getByText("Personer", { exact: true }).click();
  await sidebar.getByText("Elin", { exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Spara som mall" }).click();

  await page.getByRole("button", { name: "+ Ny anteckning" }).click();
  const note = page.getByRole("dialog", { name: "Ny anteckning" });
  await note.getByRole("textbox", { name: "Namn" }).fill("Elins syster");
  await note.getByRole("radio", { name: "Elin" }).click();
  await note.getByRole("button", { name: "Skapa" }).click();

  await expect(page.locator(".ProseMirror")).not.toBeEmpty();
  await page.screenshot({ path: `${process.env["TMP"]}/egen-mall.png` });
});
