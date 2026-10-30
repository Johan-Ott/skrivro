import { expect, test, type Page } from "@playwright/test";
import { columnToggle, openExample, showPanel } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

const column = (page: Page) => page.getByRole("complementary", { name: "Högerspalten" });
const tabs = (page: Page) => page.getByRole("tablist", { name: "Paneler" });

test("the panels lie as tabs in the column beside the text, one in front", async ({ page }) => {
  await showPanel(page, "Insikter");
  await expect(column(page).getByRole("complementary", { name: "Insikter" })).toBeVisible();
  const text = await page.locator(".writing").boundingBox();
  const docked = await column(page).boundingBox();
  expect((text?.x ?? 0) + (text?.width ?? 0)).toBeLessThanOrEqual((docked?.x ?? 0) + 1);

  await showPanel(page, "I scenen");
  await expect(tabs(page).getByRole("tab", { name: "I scenen" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(column(page).getByRole("region", { name: "I scenen" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Insikter" })).toHaveCount(0);

  await page.getByRole("tablist", { name: "Steg" }).getByRole("tab", { name: "Redigera" }).click();
  await expect(tabs(page).getByRole("tab").first()).toHaveAccessibleName(/^Granska · \d+$/);
});

test("the column folds out and away from the top bar, and is kept as it was left", async ({
  page,
}) => {
  const kept = () => page.evaluate(() => localStorage.getItem("skrivro.column"));
  await expect(column(page)).toBeHidden();
  await columnToggle(page).click();
  await expect(column(page).getByRole("complementary", { name: "Insikter" })).toBeVisible();
  expect(await kept()).toContain('"isOpen":true');

  await columnToggle(page).click();
  await expect(column(page)).toBeHidden();
  expect(await kept()).toContain('"isOpen":false');
});

test("Lossa lets a panel float over the text, and Docka lays it back as a tab", async ({ page }) => {
  await showPanel(page, "I scenen");
  await column(page).getByRole("button", { name: "Lossa panelen" }).click();
  const block = page.getByRole("region", { name: "I scenen" });
  await expect(block).toBeVisible();
  await expect(tabs(page).getByRole("tab", { name: "I scenen" })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("skrivro.blocks.floating"))).toContain(
    "iscenen",
  );

  await block.getByRole("button", { name: "Minimera" }).click();
  await expect(block).toHaveClass(/minimized/);
  expect((await block.boundingBox())?.height).toBeLessThan(50);
  await block.getByRole("button", { name: "Visa hela panelen" }).click();

  await block.getByRole("button", { name: "Docka panelen" }).click();
  await expect(column(page).getByRole("region", { name: "I scenen" })).toBeVisible();
});
