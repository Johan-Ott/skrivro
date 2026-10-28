import { expect, test, type Page } from "@playwright/test";
import {
  cursorAfterFirstParagraph,
  editor,
  openExample,
  runCommand,
  selectFirstWord,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await openExample(page);
});

async function comment(page: Page, body: string) {
  await selectFirstWord(page);
  await page.keyboard.press("ControlOrMeta+Shift+m");
  await page.keyboard.type(body);
  await page.getByRole("button", { name: "Kommentera", exact: true }).last().click();
  await expect(page.getByText(body)).toBeVisible();
}

const reviewButton = (page: Page) => page.getByRole("button", { name: /^Granska · / }).first();

test("Granska counts what still waits: not a reply, and not a resolved comment", async ({
  page,
}) => {
  const count = async () =>
    Number((await reviewButton(page).getAttribute("aria-label"))?.match(/\d+/)?.[0]);
  await comment(page, "Ska brevet vara gult?");
  await expect(reviewButton(page)).toHaveAttribute("aria-label", /Granska · \d+/);
  const withComment = await count();

  await page.getByRole("button", { name: "Svara" }).first().click();
  await page.keyboard.type("Ja, gulnat.");
  await page.getByRole("button", { name: "Svara" }).last().click();
  await expect(page.getByText("Ja, gulnat.")).toBeVisible();
  expect(await count()).toBe(withComment);

  await page.getByRole("button", { name: "Lös" }).first().click();
  await expect(reviewButton(page)).toHaveAttribute("aria-label", `Granska · ${withComment - 1}`);
});

test("a comment can be removed, and its mark in the text goes with it", async ({ page }) => {
  await comment(page, "Stryk detta?");

  await page.getByRole("button", { name: "Ta bort" }).first().click();

  await expect(page.getByText("Stryk detta?")).toBeHidden();
  await expect(editor(page).locator(".commented")).toHaveCount(0);
});

test("Förslagsläge shows what is typed and what is cut while it is written", async ({ page }) => {
  await runCommand(page, "Skriv förslag");
  await cursorAfterFirstParagraph(page);

  await page.keyboard.type(" Hon log.");
  const added = editor(page).locator(".suggestion-added");
  await expect.poll(async () => (await added.allInnerTexts()).join("")).toContain("Hon log.");

  await selectFirstWord(page);
  await page.keyboard.press("Backspace");

  await expect(editor(page).locator(".suggestion-removed")).toBeVisible();
});

test("Escape within Granska closes it", async ({ page }) => {
  await reviewButton(page).click();
  const panel = page.locator(".review-panel.open");
  await expect(panel).toBeVisible();

  await panel.getByRole("button").first().focus();
  await page.keyboard.press("Escape");

  await expect(panel).toBeHidden();
});

test("on a phone Granska opens with nothing to look at too", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("Det snöade.");

  await page.getByRole("button", { name: "Granska", exact: true }).click();

  await expect(page.getByRole("complementary", { name: "Granskning" })).toBeVisible();
});
