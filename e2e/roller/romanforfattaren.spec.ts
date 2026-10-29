import { editor } from "../helpers";
import { expect, test, type Page } from "@playwright/test";

// A novelist who only has her phone: starts a book, writes a first chapter over a few
// sittings, fixes what she wrote, and reads it back. As a person would, through the screen.

// Typed one key at a time, so Skrivro's typography turns "--" into a dash as she writes.
async function write(page: Page, text: string) {
  await page.keyboard.type(text, { delay: 2 });
}

test("a novelist starts a book on her phone and writes the first chapter", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Kom igång" }).click({ timeout: 50_000 });
  await page.getByRole("button", { name: "Fortsätt" }).click();
  await page.getByRole("button", { name: "Klar" }).click();
  await page.getByRole("button", { name: "+ Ny bok" }).click();
  for (let step = 0; step < 2; step++) await page.getByRole("button", { name: "Fortsätt" }).click();
  await page.getByPlaceholder("Arbetstitel duger").fill("Fyrvaktarens dotter");
  await page.getByRole("button", { name: "Skapa boken" }).click();
  await page.getByRole("button", { name: "Börja skriva" }).click();
  await page
    .getByRole("button", { name: /Börja skriva|Fortsätt skriva/ })
    .first()
    .click();

  await editor(page).click();
  await write(page, "Havet var grått den morgonen. Sigrid stod vid fönstret och räknade båtarna.");
  await page.keyboard.press("Enter");
  await write(page, '-- Du ser trött ut, sa modern. "Sov du alls?"');
  await expect(editor(page)).toContainText("– Du ser trött ut");
  await expect(editor(page)).toContainText("”Sov du alls?”");

  // A sentence too many: undone from the tools over the keyboard.
  await page.keyboard.press("Enter");
  await write(page, "Det här ska bort.");
  await page.getByRole("button", { name: "Ångra" }).click();
  await expect(editor(page)).not.toContainText("Det här ska bort.");

  // A footnote and a scene break, from the same tools.
  await page.getByRole("button", { name: "Infoga fotnot" }).click();
  await page.keyboard.type("Fyren släcktes 1962.");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Scenbrytning" }).click();
  await write(page, "Kvällen kom tidigt.");

  // Back to the book: a new scene after this one, named, and a look at Innehåll.
  await page
    .getByRole("navigation", { name: "Läge" })
    .getByRole("button", { name: "Boken" })
    .click();
  await page.getByRole("button", { name: "+ Lägg till" }).click();
  await page.getByRole("menuitem", { name: "Ny scen" }).click();
  await write(page, "Nästa dag var stormen över.");
  await page
    .getByRole("navigation", { name: "Läge" })
    .getByRole("button", { name: "Boken" })
    .click();
  await expect(page.locator(".tree")).toContainText(/Namnlös scen|Ny scen/);

  await page.getByRole("button", { name: "Innehåll" }).click();
  await expect(page.locator(".contents-view")).toContainText("Fyrvaktarens dotter");
  await page.getByRole("button", { name: "Läs hela boken" }).click();
  await expect(page.locator(".read-view")).toContainText("Havet var grått den morgonen.");
  await expect(page.locator(".read-view")).toContainText("Nästa dag var stormen över.");
});
