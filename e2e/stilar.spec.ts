import { expect, test } from "@playwright/test";
import { editor, openExample, selectFirstWord } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

test("the selected paragraph is centred from the style menu, and back to body text", async ({
  page,
}) => {
  await selectFirstWord(page);
  await page.getByRole("button", { name: "Stil: Brödtext" }).click();
  await page.getByRole("menuitemradio", { name: "Centrerat" }).click();

  await expect(editor(page).locator(".style-centrerat")).toHaveCount(1);
});

test("the row's list button makes the paragraph a list, and a second click takes it back", async ({
  page,
}) => {
  await selectFirstWord(page);
  const numbered = page
    .getByRole("toolbar", { name: "Formatering" })
    .getByRole("button", { name: "Numrerad lista", exact: true });
  await numbered.click();

  await expect(editor(page).locator(".style-numrerad")).toHaveCount(1);
  await expect(numbered).toHaveAttribute("aria-pressed", "true");
  await numbered.click();
  await expect(editor(page).locator(".style-numrerad")).toHaveCount(0);
});

test("Upphöjd in the row's ⋯ raises the selected word", async ({ page }) => {
  await selectFirstWord(page);
  await page
    .getByRole("toolbar", { name: "Formatering" })
    .getByRole("button", { name: "Mer" })
    .click();
  await page.getByRole("menuitem", { name: "Upphöjd" }).click();

  await expect(editor(page).locator("sup", { hasText: "Brevet" })).toHaveCount(1);
});

test("Ändra stilar in the style menu sets the book's letters in bold", async ({ page }) => {
  await selectFirstWord(page);
  await page.getByRole("button", { name: "Stil: Brödtext" }).click();
  await page.getByRole("menuitem", { name: "Ändra stilar…" }).click();

  const dialog = page.getByRole("dialog", { name: "Stilar" });
  await expect(dialog.getByRole("radio", { name: "Brev" })).toHaveAttribute("aria-checked", "true");
  await dialog.getByRole("switch", { name: "Fetstil" }).click();

  await expect(editor(page).locator(".style-brev").first()).toHaveCSS("font-weight", "700");
  await expect(dialog.locator(".style-preview p")).toHaveCSS("font-weight", "700");
});
