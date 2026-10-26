import { expect, test } from "@playwright/test";
import { editor, openExample, runCommand } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

test("the restore message does not follow to another scene's versions", async ({ page }) => {
  await editor(page).click();
  await runCommand(page, "Versioner av den här texten");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Namn på versionen" }).fill("Min version");
  await dialog.getByRole("button", { name: "Spara version" }).click();
  await dialog.getByRole("button", { name: /Min version/ }).click();
  await dialog.getByRole("button", { name: /Återställ/ }).click();
  await expect(dialog.getByText(/Versionen är återställd/)).toBeVisible();
  await page.keyboard.press("Escape");

  await page.locator(".sidebar").getByText("Isen", { exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Versioner…" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText(/Versionen är återställd/)).toHaveCount(0);
});
