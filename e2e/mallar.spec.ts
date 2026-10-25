import { expect, test } from "@playwright/test";
import { openExample } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

test("pieces are added to a book that exists: its notes, labels and closing chapter", async ({
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
});

test("a genre pack is added to the book from Mallar och bitar, with its guides and clue notes", async ({
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
});
