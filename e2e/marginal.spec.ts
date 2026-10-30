import { expect, test } from "@playwright/test";
import { cursorAfterFirstParagraph, editor, openExample, selectFirstWord } from "./helpers";

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
  await expect(draft).toContainText("Kommentar");
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

test("Redigera's tools: Läs types nothing, F suggests until Escape, and A notes the words selected", async ({
  page,
}) => {
  const tools = page.getByRole("toolbar", { name: "Verktyg" });
  const isOn = (name: string) =>
    expect(tools.getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
  await isOn("Läs (V)");
  await cursorAfterFirstParagraph(page);
  await page.keyboard.type(" Hon log.");
  await expect(editor(page)).not.toContainText("Hon log.");

  await page.keyboard.press("f");
  await isOn("Föreslå (F)");
  await page.keyboard.type(" Hon log.");
  await expect(editor(page).locator(".revision-added")).toHaveText("Hon log.");
  await page.keyboard.press("Escape");
  await isOn("Läs (V)");

  await page.keyboard.press("a");
  await editor(page)
    .locator("p")
    .first()
    .dblclick({ position: { x: 4, y: 10 } });
  const draft = page.locator(".margin-note.new");
  await expect(draft).toContainText("Anteckning · bara du");
  await page.keyboard.type("Gulnat?");
  await draft.getByRole("button", { name: "Spara" }).click();
  await expect(page.locator(".margin-note.noted")).toContainText("Gulnat?");
});
