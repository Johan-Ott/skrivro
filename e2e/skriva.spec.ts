import { expect, test } from "@playwright/test";
import {
  cursorAfterFirstParagraph,
  editor,
  openExample,
  runCommand,
  selectFirstWord,
  togglePanel,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

test("writing adds words to today's count", async ({ page }) => {
  await cursorAfterFirstParagraph(page);

  await page.keyboard.type(" Hon log.");

  await expect(editor(page)).toContainText("vantarna. Hon log.");
  await expect(page.getByText(/^2 \/ /)).toBeVisible();
});

test("Ctrl+S saves at once and says that Skrivro saves by itself", async ({ page }) => {
  await cursorAfterFirstParagraph(page);
  await page.keyboard.type(" Spara nu.");

  await page.keyboard.press("ControlOrMeta+s");

  await expect(page.getByRole("status").filter({ hasText: "Sparat" })).toBeVisible();
});

test("a right-click in the text opens Skrivro's own menu, and Markera allt selects it all", async ({
  page,
}) => {
  await selectFirstWord(page);
  await editor(page).locator("p").first().click({ button: "right" });

  const menu = page.getByRole("menu", { name: "Text" });
  await expect(menu.getByRole("menuitem", { name: "Kopiera" })).toBeVisible();
  await menu.getByRole("menuitem", { name: "Markera allt" }).click();

  const selected = await page.evaluate(() => String(getSelection()));
  expect(selected).toContain("Brevet låg på köksbordet");
  expect(selected).toContain("Din Henrik");
});

test("undo takes back what was just typed", async ({ page }) => {
  await cursorAfterFirstParagraph(page);
  await page.keyboard.type(" Ångra mig.");

  await page.keyboard.press("ControlOrMeta+z");

  await expect(editor(page)).not.toContainText("Ångra mig.");
});

test("bold is set on the selected word", async ({ page }) => {
  await selectFirstWord(page);

  await page.keyboard.press("ControlOrMeta+b");

  await expect(editor(page).locator("strong")).toHaveText("Brevet");
});

test("a footnote is inserted and its text written in the box", async ({ page }) => {
  await cursorAfterFirstParagraph(page);

  await page.keyboard.press("ControlOrMeta+Alt+f");
  await page.getByRole("textbox", { name: "Fotnotens text" }).fill("Brevet kom med postbåten.");
  await page.keyboard.press("Enter");

  const note = editor(page).locator("sup.footnote");
  await expect(note).toHaveAttribute("data-text", "Brevet kom med postbåten.");
  await expect(page.getByRole("dialog", { name: "Fotnot" })).toBeHidden();
});

test("a new scene from the palette opens empty, ready to write", async ({ page }) => {
  await editor(page).click();

  await runCommand(page, "Ny scen");

  await expect(editor(page)).toHaveText("");
  await page.keyboard.type("Ny början.");
  await expect(editor(page)).toHaveText("Ny början.");
});

test("the palette's chips narrow the search to the kinds chosen", async ({ page }) => {
  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog", { name: "Kommandopalett" });

  await palette.getByRole("button", { name: "Kapitel", exact: true }).click();
  await page.keyboard.type("fyren");

  await expect(palette.getByRole("option", { name: /Fyren/ })).toHaveCount(1);
  await expect(palette.locator(".palette-group")).toHaveText(["Kapitel", "Kommandon"]);
});

test("Insikter shows today's page and the week", async ({ page }) => {
  await cursorAfterFirstParagraph(page);
  await page.keyboard.type(" Hon log.");
  await expect(page.getByText(/^2 \/ 500 ord$/).first()).toBeVisible();
  await togglePanel(page, "Insikter");

  const progress = page.getByRole("complementary", { name: "Insikter" });
  await expect(progress.getByText("Den här veckan")).toBeVisible();
});

test("a chapter's point of view is written in Innehåll and kept", async ({ page }) => {
  await editor(page).click();
  await runCommand(page, "Gå till Innehåll");

  const pov = page.getByRole("textbox", { name: "Vems ögon?" }).first();
  await pov.fill("Elin");
  await pov.press("Enter");
  await runCommand(page, "Gå till Skriv");
  await runCommand(page, "Gå till Innehåll");

  await expect(page.getByRole("textbox", { name: "Vems ögon?" }).first()).toHaveValue("Elin");
});

test("Innehåll's filter fades the chapters where a person is not named", async ({ page }) => {
  await editor(page).click();
  await runCommand(page, "Gå till Innehåll");

  await page.getByRole("textbox", { name: "Filtrera" }).fill("Arvid");

  const rows = page.locator(".contents-row");
  await expect(rows.filter({ hasText: "Brevet" })).not.toHaveClass(/dimmed/);
  await expect(rows.filter({ hasText: "Smältningen" })).toHaveClass(/dimmed/);
});

test("the focus mode opens and Escape leaves it", async ({ page }) => {
  await editor(page).click();

  await page.keyboard.press("ControlOrMeta+Shift+f");
  await expect(page.locator(".focus-mode")).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(page.locator(".focus-mode")).toHaveCount(0);
});

test("settings open with Ctrl+comma and show the sync tab", async ({ page }) => {
  await editor(page).click();

  await page.keyboard.press("ControlOrMeta+,");
  await page.getByRole("button", { name: "Konto" }).click();

  await expect(page.getByText("Synk finns inte på den här enheten än.")).toBeVisible();
});

test("Om Skrivro shows the errors since the start, here none", async ({ page }) => {
  await editor(page).click();

  await page.keyboard.press("ControlOrMeta+,");
  await page.getByRole("button", { name: "Om Skrivro" }).click();

  await expect(page.getByText("Inga fel sedan starten.")).toBeVisible();
});

test("Innehåll lists the chapters", async ({ page }) => {
  await editor(page).click();

  await runCommand(page, "Gå till Innehåll");

  await expect(page.getByText("Fyren").first()).toBeVisible();
  await expect(page.getByText("Brevet").first()).toBeVisible();
  // The page map waits for the book to be set, which takes a moment.
  const pages = page.getByRole("list", { name: "Bokens sidor" });
  await expect(pages.getByRole("button", { name: /^Sida \d+, Brevet$/ }).first()).toBeVisible({
    timeout: 30_000,
  });
});

test("versions of the open scene can be opened", async ({ page }) => {
  await editor(page).click();

  await runCommand(page, "Versioner av den här texten");

  await expect(page.getByRole("dialog")).toBeVisible();
});

test("the text's own header opens its versions from the chapter menu", async ({ page }) => {
  await page.locator(".text-header").getByRole("button", { name: "Meny för kapitlet" }).click();
  await page.getByRole("menuitem", { name: "Versioner" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
});

test("the standard manuscript is exported as a Word file", async ({ page }) => {
  await editor(page).click();
  await runCommand(page, "Gå till Publicera");
  await page
    .locator(".publish-tile")
    .filter({ hasText: /^Exportera/ })
    .click();

  await page.getByText("Standardmanus", { exact: true }).click();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportera manus" }).click();

  expect((await download).suggestedFilename()).toMatch(/\.docx$/);
});

test("Skicka till redaktör in the menu makes the Word manuscript at once", async ({ page }) => {
  await page.getByRole("button", { name: "Meny" }).first().click();

  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Dela och samarbeta" }).click();
  await page.getByRole("menuitem", { name: "Skicka till redaktör eller testläsare…" }).click();

  expect((await download).suggestedFilename()).toMatch(/\.docx$/);
});

test("the focus mode button keeps the cursor in the text, so nothing typed is lost", async ({
  page,
}) => {
  await cursorAfterFirstParagraph(page);
  await page.getByRole("button", { name: /^Fokusläge/ }).click();
  await page.keyboard.press("Enter");
  await page.keyboard.type("Vädret håller.");

  await expect(editor(page).locator("p").nth(1)).toHaveText("Vädret håller.");
});

test("Förslagsläge keeps the text as it was, and what was typed comes back to accept", async ({
  page,
}) => {
  await runCommand(page, "Skriv förslag");
  await cursorAfterFirstParagraph(page);
  await page.keyboard.type(" Hon log.");
  await expect(page.getByRole("status").filter({ hasText: "Förslagsläge" })).toBeVisible();

  await page.getByRole("status").getByRole("button", { name: "Klar" }).click();

  // The suggestion shows in the text as an insertion to accept, not as the text itself.
  await expect(editor(page).locator(".revision-added")).toContainText("Hon log.");
  const review = page.getByRole("complementary", { name: "Granskning" });
  await expect(review).toContainText("Ändringar att gå igenom (1)");
  await review.getByRole("button", { name: "Godta" }).click();
  await expect(editor(page)).toContainText("vantarna. Hon log.");
});

test("the folded sidebar floats out while the pointer rests on its button", async ({ page }) => {
  await page.getByRole("button", { name: "Visa eller dölj sidomenyn" }).click();
  await page.mouse.move(700, 400);
  await expect(page.locator(".sidebar")).toBeHidden();

  await page.getByRole("button", { name: "Visa eller dölj sidomenyn" }).hover();

  await expect(page.locator(".sidebar")).toBeVisible();
});

test("the text stays when the window turns narrow and the phone's screen takes over", async ({
  page,
}) => {
  await expect(editor(page)).toContainText("Brevet låg på köksbordet");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();

  await expect(editor(page)).toContainText("Brevet låg på köksbordet");
  await page.setViewportSize({ width: 1280, height: 820 });
  await expect(editor(page)).toContainText("Brevet låg på köksbordet");
});
