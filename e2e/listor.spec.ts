import { expect, test } from "@playwright/test";
import { editor, openExample } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

test('"- " starts a bullet list in a note, and each Enter an item', async ({ page }) => {
  await page.getByRole("button", { name: "+ Ny anteckning" }).click();
  const dialog = page.getByRole("dialog", { name: "Ny anteckning" });
  await dialog.getByRole("textbox", { name: "Namn" }).fill("Inköp");
  await dialog.getByRole("button", { name: "Skapa" }).click();
  await page.locator(".prompt-hint").first().click();
  await page.waitForTimeout(300);

  await page.keyboard.type("- Kaffe");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Te");

  const list = editor(page).locator(".style-punktlista");
  await expect(list).toHaveCount(1);
  await expect(list.locator("p")).toHaveText(["Kaffe", "Te"]);
});

test('"- " is a dialogue dash in a scene', async ({ page }) => {
  await page.locator(".sidebar").getByText("Isen", { exact: true }).click();
  await expect(editor(page)).toContainText("Isen bar.");
  await editor(page).locator("p").first().click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");

  await page.keyboard.type("- Hej");

  await expect(editor(page).locator("p").filter({ hasText: "– Hej" })).toHaveCount(1);
  await expect(editor(page).locator(".style-punktlista")).toHaveCount(0);
});

test("the phone has a button for a bullet list", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();
  await editor(page).locator("p").first().click();

  await page
    .getByRole("toolbar", { name: "Verktyg" })
    .getByRole("button", { name: "Punktlista" })
    .click();

  await expect(editor(page).locator(".style-punktlista")).toHaveCount(1);
});

test('"- " is a dialogue dash at once in a note that was just made a scene', async ({ page }) => {
  await page.getByRole("button", { name: "+ Ny anteckning" }).click();
  const dialog = page.getByRole("dialog", { name: "Ny anteckning" });
  await dialog.getByRole("textbox", { name: "Namn" }).fill("Gäst");
  await dialog.getByRole("button", { name: "Skapa" }).click();
  await page.locator(".prompt-hint").first().click();
  await page.waitForTimeout(300);
  await page.keyboard.type("Svar.");
  await page.waitForTimeout(1500);
  const sidebar = page.locator(".sidebar");
  await sidebar.getByText("Gäst", { exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Gör till scen i" }).hover();
  await page.getByRole("menuitem", { name: "Sist i manuset" }).click();
  await page.waitForTimeout(500);

  await editor(page).locator("p").last().click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("- Hej");

  await expect(editor(page).locator("p").filter({ hasText: "– Hej" })).toHaveCount(1);
  await expect(editor(page).locator(".style-punktlista")).toHaveCount(0);
});
