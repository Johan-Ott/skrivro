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

test("the row's ⋯ makes the paragraph a list, and a second choice takes it back", async ({
  page,
}) => {
  await selectFirstWord(page);
  const more = page
    .getByRole("toolbar", { name: "Formatering" })
    .getByRole("button", { name: "Mer" });
  await more.click();
  await page.getByRole("menuitemradio", { name: "Numrerad lista" }).click();

  await expect(editor(page).locator(".style-numrerad")).toHaveCount(1);
  await more.click();
  await expect(page.getByRole("menuitemradio", { name: "Numrerad lista" })).toBeChecked();
  await page.getByRole("menuitemradio", { name: "Numrerad lista" }).click();
  await expect(editor(page).locator(".style-numrerad")).toHaveCount(0);
});
