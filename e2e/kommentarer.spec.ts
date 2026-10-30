import { expect, test, type Page } from "@playwright/test";
import { cursorAfterFirstParagraph, editor, openExample, selectFirstWord } from "./helpers";

// Too narrow for a margin beside the text, so the comments are written and read in Granska.
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await openExample(page);
});

// The margin's cards stay in the page while it has no room, hidden, so the text is looked for here.
const granska = (page: Page) => page.getByRole("complementary", { name: "Granskning" });

async function comment(page: Page, body: string) {
  await selectFirstWord(page);
  await page.keyboard.press("ControlOrMeta+Shift+m");
  await page.keyboard.type(body);
  await page.getByRole("button", { name: "Kommentera", exact: true }).last().click();
  await expect(granska(page).getByText(body)).toBeVisible();
}

const reviewButton = (page: Page) => page.getByRole("button", { name: /^Granska · / });

test("Granska counts what still waits: not a reply, and not a resolved comment", async ({
  page,
}) => {
  const count = async () =>
    Number((await reviewButton(page).getAttribute("aria-label"))?.match(/\d+/)?.[0]);
  await comment(page, "Ska brevet vara gult?");
  // Granska reads the text at the writer's pause, so the new comment's words are found a moment on.
  await expect(granska(page).getByText("Citatet finns inte längre i texten.")).toBeHidden();
  const withComment = await count();

  await page.getByRole("button", { name: "Svara" }).first().click();
  await page.keyboard.type("Ja, gulnat.");
  await page.getByRole("button", { name: "Svara" }).last().click();
  await expect(granska(page).getByText("Ja, gulnat.")).toBeVisible();
  expect(await count()).toBe(withComment);

  await page.getByRole("button", { name: "Lös" }).first().click();
  await expect(reviewButton(page)).toHaveAttribute("aria-label", `Granska · ${withComment - 1}`);
});

test("a comment can be removed, and its mark in the text goes with it", async ({ page }) => {
  await comment(page, "Stryk detta?");

  await page.getByRole("button", { name: "Ta bort" }).first().click();

  await expect(granska(page).getByText("Stryk detta?")).toBeHidden();
  await expect(editor(page).locator(".commented")).toHaveCount(0);
});

test("in Redigera what is typed and what is deleted are suggestions, and Ctrl+Z takes them back", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "Redigera" }).click();
  await cursorAfterFirstParagraph(page);
  await page.keyboard.press("f");

  await page.keyboard.type(" Hon log.");
  await expect(editor(page).locator(".revision-added")).toHaveText("Hon log.");

  await selectFirstWord(page);
  await page.keyboard.press("Backspace");
  await expect(editor(page).locator(".revision-removed")).toHaveText("Brevet");

  await page.keyboard.press("ControlOrMeta+z");
  await expect(editor(page).locator(".revision-removed")).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(editor(page).locator(".revision-added")).toHaveCount(0);
});

test("on a phone Granska opens with nothing to look at too", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("Det snöade.");

  await page.getByRole("button", { name: "Meny", exact: true }).click();
  await page.getByRole("menuitem", { name: /^Granska/ }).click();

  await expect(page.getByRole("complementary", { name: "Granskning" })).toBeVisible();
});
