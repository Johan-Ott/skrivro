import { expect, test } from "@playwright/test";
import { openExample } from "./helpers";

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
