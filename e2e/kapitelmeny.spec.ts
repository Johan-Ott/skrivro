import { expect, test, type Page } from "@playwright/test";
import { editor, openExample } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await editor(page).click();
});

const header = (page: Page) => page.locator(".text-header");

test("the scene's header holds the place and one menu, not four buttons", async ({ page }) => {
  await expect(header(page).getByRole("button")).toHaveCount(1);
  await expect(header(page).getByRole("button", { name: "Meny för kapitlet" })).toBeVisible();
});

test("När shows where it has text, and the menu takes the cursor to it", async ({ page }) => {
  const when = header(page).getByRole("textbox", { name: "När händer det?" });
  await expect(when).toHaveValue("Januari");

  await header(page).getByRole("button", { name: "Meny för kapitlet" }).click();
  await page.getByRole("menuitem", { name: "När händer det…" }).click();

  await expect(when).toBeFocused();
});

test("Läs kapitlet is in the menu and opens the chapter", async ({ page }) => {
  await header(page).getByRole("button", { name: "Meny för kapitlet" }).click();
  await page.getByRole("menuitem", { name: "Läs kapitlet" }).click();

  await expect(page.locator(".read-view")).toBeVisible();
});
