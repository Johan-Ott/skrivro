import { expect, test, type Page } from "@playwright/test";
import { editor, openExample, selectFirstWord } from "./helpers";

// Skriv, Redigera and Publicera: the writing's three steps at the top.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

const step = (page: Page, name: string) =>
  page.getByRole("tablist", { name: "Steg" }).getByRole("tab", { name });

const review = (page: Page) => page.getByRole("complementary", { name: "Granskning" });

test("Skriv is clean, and Redigera shows the repeated words beside Granska", async ({ page }) => {
  await expect(step(page, "Skriv")).toHaveAttribute("aria-selected", "true");
  await expect(editor(page).locator(".repeat")).toHaveCount(0);
  await expect(review(page)).toHaveCount(0);

  await step(page, "Redigera").click();
  await expect(editor(page).locator(".repeat").first()).toBeVisible();
  await expect(review(page)).toHaveClass(/open/);
});

test("a comment begun in Skriv is written in Redigera, and waits there", async ({ page }) => {
  await selectFirstWord(page);
  await page.keyboard.press("ControlOrMeta+Shift+m");
  await expect(step(page, "Redigera")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.type("Ska brevet vara gult?");
  await page.getByRole("button", { name: "Kommentera", exact: true }).last().click();

  await step(page, "Skriv").click();
  await expect(page.getByText("Ska brevet vara gult?")).toBeHidden();
  await expect(step(page, "Redigera")).toContainText(/\d/);
});

test("Publicera shows the book, and Tillbaka goes back to the text in its step", async ({
  page,
}) => {
  await step(page, "Redigera").click();
  await step(page, "Publicera").click();
  await expect(editor(page)).toBeHidden();

  await page.getByRole("button", { name: "Tillbaka till texten" }).click();
  await expect(step(page, "Redigera")).toHaveAttribute("aria-selected", "true");
});
