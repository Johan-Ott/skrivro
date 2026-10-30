import { expect, test } from "@playwright/test";
import { openExample, sidebar } from "./helpers";

test("the book gets a new name from Boken in the menu", async ({ page }) => {
  await openExample(page);
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Boken" }).click();
  await page.getByRole("menuitem", { name: "Byt namn på boken…" }).click();

  const dialog = page.getByRole("dialog", { name: "Byt namn på boken" });
  await dialog.getByLabel("Titel").fill("Isvägen");
  await dialog.getByRole("button", { name: "Byt namn" }).click();

  await expect(sidebar(page)).toContainText("Isvägen");
});

test("the profile picture opens the account: profile, sign-in and updates", async ({ page }) => {
  await openExample(page);
  await page.getByRole("button", { name: "Din profil" }).first().click();

  await expect(page.getByRole("menuitem", { name: "Din profil…" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Sök efter uppdateringar…" }).click();
  await expect(page.getByText("Du har den senaste versionen av Skrivro.")).toBeVisible();
});

test("the example book is copied once, however often it is asked for", async ({ page }) => {
  await openExample(page);
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Bokhylla" }).click();
  const summary = page.locator(".shelf-summary");
  await expect(summary).toContainText("·");
  const before = await summary.innerText();

  await page.getByRole("button", { name: "Prova exempelboken" }).click();
  await expect(sidebar(page)).toContainText("Vintervägen");
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Bokhylla" }).click();

  await expect(summary).toHaveText(before);
});

test("a book renamed on the shelf shows its new name there at once", async ({ page }) => {
  await openExample(page);
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Bokhylla" }).click();
  await page.getByRole("button", { name: "Bokens meny" }).first().click();
  await page.getByRole("menuitem", { name: "Byt namn…" }).click();

  const dialog = page.getByRole("dialog", { name: "Byt namn på boken" });
  await dialog.getByLabel("Titel").fill("Isvägen");
  await dialog.getByRole("button", { name: "Byt namn" }).click();

  await expect(page.locator(".books")).toContainText("Isvägen");
});

test("the profile is opened from the top bar and keeps what was written", async ({ page }) => {
  await openExample(page);
  await page.getByRole("button", { name: "Din profil" }).click();
  await page.getByRole("menuitem", { name: "Din profil…" }).click();
  const profile = page.getByRole("dialog", { name: "Författarprofil" });
  await profile.getByRole("textbox", { name: "Namn", exact: true }).fill("Elin Berg");
  await profile.getByRole("textbox", { name: "Om författaren" }).fill("Skriver om is och fyrar.");
  await profile.getByRole("button", { name: "Klar" }).click();

  await page.getByRole("button", { name: "Din profil" }).click();
  await page.getByRole("menuitem", { name: "Din profil…" }).click();
  await expect(profile.getByRole("textbox", { name: "Om författaren" })).toHaveValue(
    "Skriver om is och fyrar.",
  );
});
