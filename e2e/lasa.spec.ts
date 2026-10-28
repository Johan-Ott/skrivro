import { expect, test, type Page } from "@playwright/test";
import { editor, openExample } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

// Selects a word on the page as a reader would, by its text.
async function selectOnPage(page: Page, word: string) {
  await page.evaluate((wanted) => {
    const walker = document.createTreeWalker(
      document.querySelector(".read-flow") ?? document.body,
      NodeFilter.SHOW_TEXT,
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const start = node.textContent?.indexOf(wanted) ?? -1;
      if (start < 0) continue;
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + wanted.length);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
      return;
    }
  }, word);
}

test("Läs som bok shows the book in spreads that turn with the arrows", async ({ page }) => {
  await page.keyboard.press("ControlOrMeta+r");

  await expect(page.locator(".read-place")).toHaveText(/1\. Brevet · sida 1–2 av \d+/);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".read-place")).toHaveText(/sida 3–4/);
  await page.getByRole("button", { name: "Föregående uppslag" }).click();
  await expect(page.locator(".read-place")).toHaveText(/sida 1–2/);
});

test("a correction made in the page is in the text when the writer goes back", async ({ page }) => {
  await page.keyboard.press("ControlOrMeta+r");
  await selectOnPage(page, "gult");
  await page.getByRole("button", { name: "Rätta", exact: true }).click();
  await page.getByRole("textbox", { name: "Rätta text" }).fill("gulnat");
  await page.keyboard.press("Enter");

  await expect(page.locator(".read-flow")).toContainText("Kuvertet var gulnat av ålder");
  await page.keyboard.press("Escape");
  await expect(editor(page)).toContainText("Kuvertet var gulnat av ålder");
});

test("a comment made in the page marks the words in Skriv", async ({ page }) => {
  await page.keyboard.press("ControlOrMeta+r");
  await selectOnPage(page, "handstilen");
  await page.getByRole("button", { name: "Kommentera" }).click();
  await page.getByRole("textbox", { name: "Kommentar" }).fill("Vems handstil?");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Kommentar" })).toBeHidden();

  await page.keyboard.press("Escape");
  await expect(editor(page).locator(".commented")).toHaveText("handstilen");
});
