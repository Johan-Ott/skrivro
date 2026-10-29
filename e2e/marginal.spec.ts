import { expect, test } from "@playwright/test";
import { openExample, selectFirstWord } from "./helpers";

test.beforeEach(async ({ page }) => {
  // Wide enough for a margin beside the sheet, with the sidebar open.
  await page.setViewportSize({ width: 1600, height: 820 });
  await page.addInitScript(() =>
    localStorage.setItem("skrivro.writing", JSON.stringify({ commentsInMargin: true })),
  );
  await openExample(page);
});

test("a comment stands in the margin beside its words, and Klar ticks it off", async ({ page }) => {
  await selectFirstWord(page);
  await page.keyboard.press("ControlOrMeta+Shift+m");
  await page.keyboard.type("Gulnat?");
  await page.getByRole("button", { name: "Kommentera", exact: true }).last().click();

  const note = page.locator(".margin-note[data-comment]");
  await expect(note).toContainText("Gulnat?");
  await expect(note).toBeVisible();
  const offCentre = await page.evaluate(() => {
    const middle = (box: DOMRect) => (box.left + box.right) / 2;
    const text = document.querySelector(".ProseMirror")?.getBoundingClientRect() ?? new DOMRect();
    const card = document.querySelector(".page")?.getBoundingClientRect() ?? new DOMRect();
    return Math.abs(middle(text) - middle(card));
  });
  expect(offCentre).toBeLessThan(2);
  await note.getByRole("button", { name: "Klar" }).click();
  await expect(note).toHaveCount(0);
});
