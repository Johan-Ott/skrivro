import { expect, test } from "@playwright/test";
import { openExample, togglePanel } from "./helpers";

test("Granska is drawn down to its head with Minimera, and stays so", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
  await page.getByRole("tab", { name: "Redigera" }).click();
  const panel = page.locator(".review-panel.open");
  await expect(panel.getByText("Granska", { exact: true })).toBeVisible();

  await panel.getByRole("button", { name: "Minimera" }).click();
  await expect(panel).toHaveClass(/minimized/);
  expect((await panel.boundingBox())?.height).toBeLessThan(50);
  expect(await page.evaluate(() => localStorage.getItem("skrivro.minimized"))).toContain("granska");

  await panel.getByRole("button", { name: "Visa hela panelen" }).click();
  await expect(panel).not.toHaveClass(/minimized/);
});

test("a panel opens docked beside the text, Lossa lets it float and Docka lays it back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
  await togglePanel(page, "I scenen");
  const dock = page.getByRole("complementary", { name: "Dockade paneler" });
  const block = page.getByRole("region", { name: "I scenen" });
  await expect(dock.getByRole("region", { name: "I scenen" })).toBeVisible();
  const text = await page.locator(".writing").boundingBox();
  const docked = await dock.boundingBox();
  expect((text?.x ?? 0) + (text?.width ?? 0)).toBeLessThanOrEqual((docked?.x ?? 0) + 1);

  await block.getByRole("button", { name: "Lossa panelen" }).click();
  await expect(dock).toBeHidden();
  await expect(block).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("skrivro.blocks.floating"))).toContain(
    "iscenen",
  );

  await block.getByRole("button", { name: "Docka panelen" }).click();
  await expect(dock.getByRole("region", { name: "I scenen" })).toBeVisible();
});
