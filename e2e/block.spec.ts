import { expect, test } from "@playwright/test";
import { openExample, openLayouts, togglePanel } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openExample(page);
});

test("I scenen lists who is named in the scene, and opens a note beside the text", async ({
  page,
}) => {
  await togglePanel(page, "I scenen");
  const block = page.getByRole("region", { name: "I scenen" });
  await expect(block).toContainText("Elin");
  await expect(block).toContainText("Arvid");

  await block.getByRole("button", { name: /Arvid/ }).click();

  await expect(page.locator(".beside-pane")).toContainText("Arvid");
});

test("a layout keeps which panels are open, and brings them back", async ({ page }) => {
  await togglePanel(page, "I scenen");
  await openLayouts(page);
  await page.getByRole("menuitem", { name: "Spara som layout 1" }).click();
  await togglePanel(page, "I scenen");
  await expect(page.getByRole("region", { name: "I scenen" })).toBeHidden();

  await openLayouts(page);
  await page.getByRole("menuitemradio", { name: "Layout 1" }).click();

  await expect(page.getByRole("region", { name: "I scenen" })).toBeVisible();
});

test("the steps and the dock have words, not only pictures", async ({ page }) => {
  await expect(page.getByRole("tablist", { name: "Steg" }).getByRole("tab")).toHaveText([
    "1Skriv",
    "2Redigera",
    "3Publicera",
  ]);
  await expect(page.getByRole("button", { name: /^Paneler/ })).toContainText("Paneler");
  await expect(page.getByRole("button", { name: /^Layouter/ })).toContainText("Layouter");
});
