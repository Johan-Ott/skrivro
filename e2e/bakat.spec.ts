import { expect, test, type Page } from "@playwright/test";
import { editor, openExample } from "./helpers";

// Android's back, as MainActivity asks it of the page: what lies on top closes first.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openExample(page);
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();
  await expect(editor(page)).toBeVisible();
});

const pressBack = (page: Page) =>
  page.evaluate(() => (window as { skrivroBack?: () => boolean }).skrivroBack?.());

test("back closes Aa and stays in the text", async ({ page }) => {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.getByRole("button", { name: "Skrivinställningar" }).click();
  const panel = page.getByRole("dialog", { name: "Skrivinställningar" });
  await expect(panel).toBeVisible();

  await pressBack(page);

  await expect(panel).toBeHidden();
  await expect(editor(page)).toBeVisible();
});

test("back from Insikter, opened on Boken after Publicera, returns to Boken", async ({ page }) => {
  const tabs = page.getByRole("navigation", { name: "Läge" });
  await tabs.getByRole("button", { name: "Publicera" }).click();
  await tabs.getByRole("button", { name: "Boken" }).click();
  await page
    .getByText(/ord idag/)
    .first()
    .click();
  await expect(page.getByRole("button", { name: "Stäng insikter" })).toBeVisible();

  await pressBack(page);

  await expect(page.getByRole("button", { name: "Stäng insikter" })).toBeHidden();
  await expect(page.getByRole("button", { name: /Fortsätt skriva/ })).toBeVisible();
});
