import { expect, test } from "@playwright/test";
import { openExample, showPanel } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openExample(page);
});

test("I scenen lists who is named in the scene, and opens a note beside the text", async ({
  page,
}) => {
  await showPanel(page, "I scenen");
  const block = page.getByRole("region", { name: "I scenen" });
  await expect(block).toContainText("Elin");
  await expect(block).toContainText("Arvid");

  await block.getByRole("button", { name: /Arvid/ }).click();

  await expect(page.locator(".beside-pane")).toContainText("Arvid");
});

test("the steps and the column's tabs have words, not only pictures", async ({ page }) => {
  await expect(page.getByRole("tablist", { name: "Steg" }).getByRole("tab")).toHaveText([
    "Skriv",
    "Redigera",
    "Publicera",
  ]);
  await showPanel(page, "Insikter");
  await expect(page.getByRole("tablist", { name: "Paneler" }).getByRole("tab")).toHaveText([
    "Insikter",
    "I scenen",
    "Referensbild",
  ]);
});
