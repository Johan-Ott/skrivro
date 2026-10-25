import { expect, test } from "@playwright/test";
import { editor, openExample, selectFirstWord } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openExample(page);
});

test("Fortsätt skriva opens the text, and back returns to Boken", async ({ page }) => {
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();
  await expect(editor(page)).toBeVisible();

  await page.evaluate(() => history.back());

  await expect(page.getByRole("button", { name: /Fortsätt skriva/ })).toBeVisible();
});

test("Fortsätt skriva leads to the book's text, not a note looked at since", async ({ page }) => {
  await page.getByRole("treeitem", { name: /^Personer/ }).click();
  await page.getByRole("treeitem").filter({ hasText: "Elin" }).click();
  await expect(editor(page)).toContainText("Trettioåtta");
  await page.evaluate(() => history.back());
  await page
    .getByRole("navigation", { name: "Läge" })
    .getByRole("button", { name: "Boken" })
    .click();

  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();

  await expect(editor(page)).not.toContainText("Trettioåtta");
});

test("a person opens from Personer in the tree, and back returns to Boken", async ({ page }) => {
  await page.getByRole("treeitem", { name: /^Personer/ }).click();
  await page.getByRole("treeitem").filter({ hasText: "Elin" }).click();
  await expect(editor(page)).toContainText("Trettioåtta");

  await page.evaluate(() => history.back());

  await expect(page.getByRole("treeitem").filter({ hasText: "Arvid" })).toBeVisible();
});

test("Granska opens over the whole text and closes again", async ({ page }) => {
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();

  await page.getByRole("button", { name: /att se över/ }).click();
  await expect(page.getByRole("complementary", { name: "Granskning" })).toBeVisible();
  await page.getByRole("button", { name: "Stäng granskning" }).click();

  await expect(page.getByRole("complementary", { name: "Granskning" })).toBeHidden();
});

test("selecting a word shows the bar with Kopiera, since the phone's own menu is turned off", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();

  await selectFirstWord(page);

  await expect(page.getByRole("toolbar", { name: "Markering" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kopiera", exact: true })).toBeVisible();
});

test("the tabs go to Innehåll and Publicera, and back to Boken", async ({ page }) => {
  await page.getByRole("button", { name: "Innehåll" }).click();
  await expect(page.locator(".contents-view")).toBeVisible();
  await page.getByRole("button", { name: "Publicera" }).click();
  await expect(page.locator(".phone-view")).toContainText(/Exportera|Design/);

  await page.getByRole("button", { name: "Boken" }).click();

  await expect(page.getByRole("button", { name: /Fortsätt skriva/ })).toBeVisible();
});

test("Android's back leaves Studio, then goes from Publicera to Innehåll", async ({ page }) => {
  const back = () =>
    page.evaluate(() => (window as { skrivroBack?: () => boolean }).skrivroBack?.());
  await page.getByRole("button", { name: "Innehåll" }).click();
  await page.getByRole("button", { name: "Publicera" }).click();
  await page.getByRole("button", { name: /Studio/ }).click();
  await expect(page.locator(".studio")).toBeVisible();

  await back();
  await expect(page.locator(".studio")).toHaveCount(0);
  await back();

  await expect(page.locator(".contents-view")).toBeVisible();
});

test("Android's back closes Granska and stays in the text", async ({ page }) => {
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();
  await page.getByRole("button", { name: /att se över/ }).click();
  await expect(page.locator(".review-panel.open")).toBeVisible();

  await page.evaluate(() => (window as { skrivroBack?: () => boolean }).skrivroBack?.());

  await expect(page.locator(".review-panel.open")).toHaveCount(0);
  await expect(editor(page)).toBeVisible();
});

test("the palette on the phone has no folder to pick", async ({ page }) => {
  await page.getByRole("button", { name: "Sök" }).first().click();
  await page.keyboard.type("mapp");

  await expect(page.getByText("Öppna projektmapp…")).toBeHidden();
});

test("the shelf on the phone has a menu with Inställningar, and no folder to pick", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Bokhylla" }).click();

  await page.getByRole("button", { name: "Meny", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Öppna bok…" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Inställningar" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
});

test("a note is renamed from its menu in the tree", async ({ page }) => {
  await page.getByRole("treeitem", { name: /^Personer/ }).click();
  await page.getByRole("button", { name: "Meny för Elin" }).click();

  await expect(page.getByRole("menuitem", { name: "Byt namn" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /papperskorg/i })).toBeVisible();
});

test("a person renamed is renamed in the manuscript too, and Ångra takes it back", async ({
  page,
}) => {
  await page.getByRole("treeitem", { name: /^Personer/ }).click();
  await page.getByRole("button", { name: "Meny för Elin" }).click();
  await page.getByRole("menuitem", { name: "Byt namn" }).click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("Ella");
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "Byt", exact: true }).click();
  await expect(page.getByText(/^Ändrade \d+ förekomster av ”Elin”$/)).toBeVisible();
  await page
    .getByRole("navigation", { name: "Läge" })
    .getByRole("button", { name: "Boken" })
    .click();
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();
  await expect(editor(page)).toContainText("när Ella kom in");

  await page.getByRole("button", { name: "Ångra", exact: true }).last().click();
  await expect(editor(page)).toContainText("när Elin kom in");
});

test("a scene in Boken has its menu behind ⋯", async ({ page }) => {
  await page.getByRole("button", { name: "Meny för Köket" }).click();

  await expect(page.getByRole("menuitem", { name: /Ny scen efter/ })).toBeVisible();
});

test("Läs kapitlet reads the chapter on the phone", async ({ page }) => {
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();
  await page.getByRole("button", { name: "Läs kapitlet" }).click();

  await expect(page.locator(".read-view")).toContainText("Brevet låg på köksbordet");
});

test("the tools over the keyboard undo, and put in a scene break", async ({ page }) => {
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();
  await editor(page).click();
  await page.keyboard.press("End");
  await page.keyboard.type(" Snön föll.");
  await expect(editor(page)).toContainText("Snön föll.");

  await page.getByRole("button", { name: "Ångra" }).click();
  await expect(editor(page)).not.toContainText("Snön föll.");
  await page.getByRole("button", { name: "Scenbrytning" }).click();

  await expect(editor(page).locator("hr, .scene-break").first()).toBeVisible();
});

test("Boken adds with a button, moves a scene down, and keeps the trash in reach", async ({
  page,
}) => {
  await page.getByRole("button", { name: "+ Lägg till" }).click();
  await expect(page.getByRole("menuitem", { name: /Nytt kapitel/ })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Meny för Köket" }).click();
  await page.getByRole("menuitem", { name: "Flytta ned" }).click();

  const scenes = page.locator(".tree-row").filter({ hasText: /^(Köket|Isen)/ });
  await expect(scenes.first()).toContainText("Isen");
  await expect(page.locator(".tree")).toContainText("Papperskorg");
});

test("the phone's menu has Serie… under Boken, and the editor's Word file", async ({ page }) => {
  const menu = () => page.getByRole("button", { name: "Meny" }).first().click();
  await menu();
  await page.getByRole("menuitem", { name: "Boken" }).click();
  await expect(page.getByRole("menuitem", { name: "Serie…" })).toBeVisible();
  await page.keyboard.press("Escape");
  await menu();
  await page.getByRole("menuitem", { name: "Dela och samarbeta" }).click();
  await expect(page.getByRole("menuitem", { name: /kommenterad Word-fil/ })).toBeVisible();
});

test("Öppna bredvid from Boken shows the other text over the whole screen", async ({ page }) => {
  await page.getByRole("button", { name: "Meny för Isen" }).click();
  await page.getByRole("menuitem", { name: "Öppna bredvid" }).click();

  await expect(page.locator(".beside-pane")).toContainText("Isen bar.");
});

test("who is named in the scene is atop the text, and opens the note", async ({ page }) => {
  await page.locator(".phone-tabs").getByRole("button", { name: "Skriv" }).click();
  const strip = page.getByRole("navigation", { name: "I scenen" });
  await expect(strip).toContainText("Elin");
  await strip.getByRole("button", { name: "Arvid" }).click();

  await expect(page.locator(".beside-pane")).toBeVisible();
});

test("the genre packs open from the book's menu, and a pack is added to the book once", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Meny", exact: true }).first().click();
  await page.getByRole("menuitem", { name: "Boken ›" }).click();
  await page.getByRole("menuitem", { name: "Genrepaket…" }).click();

  const crime = page.locator(".pack-tile").filter({ hasText: "Deckare" });
  await crime.getByRole("button", { name: "Lägg till i boken" }).click();
  await expect(crime.getByText("✓ I boken")).toBeVisible();
  await crime.getByRole("button", { name: "Se vad som ingår" }).click();
  await expect(page.locator(".pack-preview-page h3")).toBeVisible();
  await expect(page.getByRole("button", { name: "Stäng" })).toBeInViewport();
});
