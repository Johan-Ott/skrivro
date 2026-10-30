import { expect, test } from "@playwright/test";
import { editor, openExample } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

test("a book opens where the writer left off, and a key goes on from there", async ({ page }) => {
  await editor(page).locator("p").first().click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Hon log. Sedan gick hon");
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Bokhylla" }).click();
  await page.getByText("Vintervägen").first().click();

  const resume = page.locator(".resume-screen");
  await expect(resume).toContainText("Du slutade här · 1. Brevet · Köket");
  await expect(resume.locator(".resume-sentence")).toHaveText("Sedan gick hon");
  await page.keyboard.press("Shift");
  await expect(resume).toBeHidden();
});

test("the profile is opened from the top bar and keeps what was written", async ({ page }) => {
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

test("a chapter is shown alone in the sidebar, and Hela boken brings the book back", async ({
  page,
}) => {
  await page.locator(".tree").getByText("2. Fyren").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Visa bara kapitlet" }).click();

  const tree = page.locator(".sidebar .tree");
  await expect(tree).not.toContainText("1. Brevet");
  await expect(tree).toContainText("Fyren");
  await page.getByRole("button", { name: "Hela boken" }).click();
  await expect(tree).toContainText("1. Brevet");
});

test("Mål under the day's words opens the goals", async ({ page }) => {
  await page.locator(".day-progress").click();
  await page.getByRole("button", { name: "Ändra mål och deadline" }).click();

  await expect(page.getByRole("dialog", { name: "Mål för projektet" })).toBeVisible();
});

test("a daily goal below zero is not saved, and the field says why", async ({ page }) => {
  await page.locator(".day-progress").click();
  await page.getByRole("button", { name: "Ändra mål och deadline" }).click();
  const goals = page.getByRole("dialog", { name: "Mål för projektet" });

  await goals.getByLabel("Dagligt ordmål").fill("-5");

  await expect(goals).toContainText("Skriv ett helt antal ord, större än noll.");
  await expect(goals.getByRole("button", { name: "Spara" })).toBeDisabled();
});
