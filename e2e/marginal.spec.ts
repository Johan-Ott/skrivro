import { expect, test } from "@playwright/test";
import { openExample, selectFirstWord } from "./helpers";

test.beforeEach(async ({ page }) => {
  // Wide enough for a margin beside the sheet, with the sidebar open.
  await page.setViewportSize({ width: 1600, height: 820 });
  await openExample(page);
  await page.getByRole("tablist", { name: "Steg" }).getByRole("tab", { name: "Redigera" }).click();
});

test("a comment stands in the margin beside its words, opens on a click, and Klar ticks it off", async ({
  page,
}) => {
  await selectFirstWord(page);
  await page.keyboard.press("ControlOrMeta+Shift+m");
  await page.keyboard.type("Gulnat?");
  const draft = page.locator(".margin-note.new");
  await draft.getByRole("radio", { name: "Kommentar" }).click();
  await draft.getByRole("button", { name: "Spara" }).click();

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

  // One line until it is clicked, then whole with its buttons.
  await expect(note.getByRole("button", { name: "Klar" })).toBeHidden();
  await note.click();
  await expect(note).toHaveClass(/current/);
  await note.getByRole("button", { name: "Klar" }).click();
  await expect(note).toHaveCount(0);
});
