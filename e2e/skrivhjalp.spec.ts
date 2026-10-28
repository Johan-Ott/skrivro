import { expect, test } from "@playwright/test";
import { cursorAfterFirstParagraph, editor, openExample } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

test("autocorrect gives a sentence its capital and HEj its case, and Backspace takes it back", async ({
  page,
}) => {
  await cursorAfterFirstParagraph(page);

  await page.keyboard.type(" hon log. HEjsan ", { delay: 5 });
  await expect(editor(page)).toContainText("vantarna. Hon log. Hejsan ");

  await page.keyboard.type("då. d");
  await page.keyboard.press("Backspace");
  await expect(editor(page)).toContainText("Hejsan då. d");
});

test("in a line of dialogue, who said it after a question keeps its small letter", async ({
  page,
}) => {
  await cursorAfterFirstParagraph(page);
  await page.keyboard.press("Enter");

  await page.keyboard.type("– Varför? sa hon. sedan gick hon.", { delay: 5 });

  await expect(editor(page)).toContainText("– Varför? sa hon. Sedan gick hon.");
});

test("Sök efter uppdateringar says so when this is the newest Skrivro", async ({ page }) => {
  await page.getByRole("button", { name: "Skrivro", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sök efter uppdateringar…" }).click();

  await expect(page.getByText("Du har den senaste versionen av Skrivro.")).toBeVisible();
});

test("a name from the notes is offered while typing, and Tab fills it in", async ({ page }) => {
  await cursorAfterFirstParagraph(page);

  await page.keyboard.type(" Arv");
  await expect(editor(page).locator(".completion")).toHaveText("id");
  await page.keyboard.press("Tab");

  await expect(editor(page)).toContainText("vantarna. Arvid");
  await expect(editor(page).locator(".completion")).toHaveCount(0);
});

test("a name comes after two letters, and the book's own words after three", async ({ page }) => {
  await cursorAfterFirstParagraph(page);

  await page.keyboard.type(" Ar");
  await expect(editor(page).locator(".completion")).toHaveText("vid");
  await page.keyboard.press("Escape");
  // The book's words are learned a moment after it opens.
  await page.waitForTimeout(3500);
  await page.keyboard.type(" fyr");
  await expect(editor(page).locator(".completion")).toHaveText("en");
});

test("a click on a repeated word says so and leads to Granska", async ({ page }) => {
  await page.locator(".ProseMirror .repeat").first().click();

  const help = page.locator(".click-corrections");
  await expect(help).toContainText("står flera gånger nära varandra");
  await help.getByRole("button", { name: "Granska" }).click();
  await expect(page.locator(".review-panel.open")).toBeVisible();
});

test("an Upprepning card in Granska selects the word in the text", async ({ page }) => {
  await page.locator(".ProseMirror .repeat").first().click();
  await page.locator(".click-corrections").getByRole("button", { name: "Granska" }).click();

  await page
    .getByRole("button", { name: /^Upprepning/ })
    .first()
    .click();

  const selected = await page.evaluate(() => window.getSelection()?.toString() ?? "");
  expect(selected.length).toBeGreaterThan(1);
});
