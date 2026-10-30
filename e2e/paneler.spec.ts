import { expect, test, type Page } from "@playwright/test";
import { columnToggle, openExample, showPanel } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

const column = (page: Page) => page.getByRole("complementary", { name: "Högerspalten" });
const titles = (page: Page) => column(page).locator(".block-fold");

test("the panels lie as sections in the column beside the text, one under the other", async ({
  page,
}) => {
  await showPanel(page, "Insikter");
  await expect(column(page).getByRole("region", { name: "Insikter" })).toBeVisible();
  await expect(column(page).getByRole("region", { name: "I scenen" })).toBeVisible();
  await expect(titles(page)).toHaveText(["Insikter", "I scenen", "Referensbild"]);
  const text = await page.locator(".writing").boundingBox();
  const docked = await column(page).boundingBox();
  expect((text?.x ?? 0) + (text?.width ?? 0)).toBeLessThanOrEqual((docked?.x ?? 0) + 1);

  await page.getByRole("tablist", { name: "Steg" }).getByRole("tab", { name: "Redigera" }).click();
  await expect(titles(page).first()).toHaveAccessibleName(/^Granska · \d+$/);
});

test("a section folds shut and open from its title, and is kept as it was left", async ({
  page,
}) => {
  await showPanel(page, "Insikter");
  const insights = column(page).getByRole("region", { name: "Insikter" });
  const title = column(page).getByRole("button", { name: "Insikter", exact: true });
  const open = (await insights.boundingBox())?.height ?? 0;
  await title.click();
  await expect(title).toHaveAttribute("aria-expanded", "false");
  expect((await insights.boundingBox())?.height).toBeLessThan(open / 2);
  expect(await page.evaluate(() => localStorage.getItem("skrivro.minimized"))).toContain(
    "insikter",
  );
  await title.click();
  await expect(title).toHaveAttribute("aria-expanded", "true");
});

test("the column folds out and away from the top bar, and is kept as it was left", async ({
  page,
}) => {
  const kept = () => page.evaluate(() => localStorage.getItem("skrivro.column"));
  await expect(column(page)).toBeHidden();
  await columnToggle(page).click();
  await expect(column(page).getByRole("region", { name: "Insikter" })).toBeVisible();
  expect(await kept()).toContain('"isOpen":true');

  await columnToggle(page).click();
  await expect(column(page)).toBeHidden();
  expect(await kept()).toContain('"isOpen":false');
});
