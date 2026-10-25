import { expect, test } from "@playwright/test";
import { openExample } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
  await page.getByRole("button", { name: "Meny", exact: true }).click();
  await page.getByRole("menuitem", { name: "Bokhylla" }).click();
});

test("a book is made a favourite with its star, and stays one", async ({ page }) => {
  await page.locator(".book").filter({ hasText: "Vintervägen" }).hover();
  await page.getByRole("button", { name: "Lägg till i favoriter" }).click();

  await expect(page.getByRole("button", { name: "Ta bort från favoriter" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Ta bort från favoriter" })).toBeVisible();
});

test("the shelf is sorted by title from Sortera", async ({ page }) => {
  await page.getByRole("button", { name: "Sortera: Senast skrivet" }).click();
  await page.getByRole("menuitemradio", { name: "Titel" }).click();

  await expect(page.getByRole("button", { name: "Sortera: Titel" })).toBeVisible();
});

test("a cover's colours are chosen from Omslag in the book's menu", async ({ page }) => {
  const book = page.locator(".book").filter({ hasText: "Vintervägen" });
  await book.getByRole("button", { name: "Bokens meny" }).click();
  await page.getByRole("menuitem", { name: "Omslag" }).click();
  await page.getByRole("menuitemradio", { name: "Plommon" }).click();

  await expect(book.locator(".book-cover")).toHaveClass(/cover-plommon/);
});

test("the genre packs are found in the logo's menu, each saying what it holds", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Skrivro", exact: true }).click();
  await page.getByRole("menuitem", { name: "Genrepaket…" }).click();

  const dialog = page.getByRole("dialog", { name: "Genrepaket" });
  const romantasy = dialog.locator(".pack-tile").filter({ hasText: "Romantasy" });
  await expect(romantasy).toContainText("5 guider");
  await expect(romantasy).toContainText("Ingår under betan");

  await romantasy.getByRole("button", { name: "Se vad som ingår" }).click();
  await expect(dialog.locator(".pack-structure").first()).toBeVisible();
  const guide = dialog.locator(".pack-note").first();
  await guide.locator("summary").click();
  await expect(guide.locator(".pack-note-text p").first()).toBeVisible();
  await page.screenshot({ path: `${process.env["TMP"]}/paketsida.png`, fullPage: true });
  await dialog.getByRole("button", { name: "← Alla paket" }).click();
  await expect(romantasy).toBeVisible();
});
