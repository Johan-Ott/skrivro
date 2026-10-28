import { expect, test, type Page } from "@playwright/test";
import { openExample } from "./helpers";

// Nothing reaches past the window's right edge, from the smallest window Skrivro allows
// (tauri.conf.json) to a large screen.
const SIZES = [
  { width: 720, height: 500 },
  { width: 1920, height: 1080 },
];

const pastTheEdge = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const box = element.getBoundingClientRect();
        const isShown = box.width > 0 && getComputedStyle(element).visibility !== "hidden";
        return isShown && box.left < innerWidth && box.right > innerWidth + 1;
      })
      .map((element) => element.className.toString()),
  );

for (const size of SIZES) {
  test(`every view fits a ${size.width}×${size.height} window`, async ({ page }) => {
    await page.setViewportSize(size);
    await openExample(page);
    expect(await pastTheEdge(page)).toEqual([]);

    await page.getByRole("tab", { name: "Publicera" }).click();
    await expect(page.locator(".publish-button")).toBeVisible();
    expect(await pastTheEdge(page)).toEqual([]);

    await page.getByRole("tab", { name: "Skriv" }).click();
    await page.getByRole("button", { name: "Meny", exact: true }).click();
    await page.getByRole("menuitem", { name: "Bokhylla" }).click();
    await expect(page.getByRole("heading", { name: "Dina böcker" })).toBeVisible();
    expect(await pastTheEdge(page)).toEqual([]);
  });
}

test("the format row keeps alignment in its ⋯, and a narrow window does not cut it off", async ({
  page,
}) => {
  await page.setViewportSize({ width: 720, height: 500 });
  await openExample(page);
  await page.locator(".ProseMirror p").first().click();
  const row = page.getByRole("toolbar", { name: "Formatering" });
  await expect(row.getByRole("button", { name: "Centrerat" })).toHaveCount(0);

  await row.getByRole("button", { name: "Mer" }).click();
  await page.getByRole("menuitemradio", { name: "Centrerat" }).click();

  await expect(page.locator(".ProseMirror .style-centrerat")).toHaveCount(1);
});
