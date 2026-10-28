import { expect, test } from "@playwright/test";
import { editor, openExample, runCommand } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await editor(page).click();
  await runCommand(page, "Publicera");
  await page.getByRole("button", { name: /Studio/ }).click();
});

test("Studio draws the week as a picture, and the countdown asks for a release day", async ({
  page,
}) => {
  await expect(page.locator("canvas.studio-card")).toBeVisible();
  await page.getByRole("button", { name: /Nedräkning/ }).click();
  await page.getByLabel("Utgivningsdag").fill("2027-03-12");
  await page.getByLabel("Utgivningsdag").blur();

  await page.getByRole("button", { name: "Publicera", exact: true }).click();
  await page.getByRole("button", { name: /Studio/ }).click();
  await page.getByRole("button", { name: /Nedräkning/ }).click();
  await expect(page.getByLabel("Utgivningsdag")).toHaveValue("2027-03-12");
});

test("a chapter is shown as the newsletter mail it becomes", async ({ page }) => {
  await page.getByRole("button", { name: /Kapitel till nyhetsbrev/ }).click();

  await expect(page.locator(".studio-mail")).toContainText("Brevet låg på köksbordet");
  await expect(page.locator(".studio-mail-subject")).toContainText("Vintervägen: Brevet");
});

test("a milestone is named and kept with the book", async ({ page }) => {
  await page.getByRole("button", { name: /Milstolpe/ }).click();
  await page.getByLabel("Milstolpe").fill("Halvvägs");
  await page.getByLabel("Milstolpe").blur();

  await page.getByRole("button", { name: /Veckan i siffror/ }).click();
  await page.getByRole("button", { name: /Milstolpe/ }).click();
  await expect(page.getByLabel("Milstolpe")).toHaveValue("Halvvägs");
});

test("the newsletter is signed with Om författaren from the profile", async ({ page }) => {
  await page.getByRole("button", { name: "Publicera", exact: true }).click();
  await page.getByRole("button", { name: /Tillbaka till texten/ }).click();
  await page.getByRole("button", { name: "Din profil" }).click();
  await page.getByRole("menuitem", { name: "Din profil…" }).click();
  await page.getByRole("textbox", { name: "Om författaren" }).fill("Skriver om is och fyrar.");
  await page.getByRole("button", { name: "Klar" }).click();
  await runCommand(page, "Publicera");
  await page.getByRole("button", { name: /Studio/ }).click();
  await page.getByRole("button", { name: /Kapitel till nyhetsbrev/ }).click();

  await expect(page.locator(".studio-mail")).toContainText("Skriver om is och fyrar.");
  await page.getByRole("button", { name: /Omslaget är här/ }).click();
  await expect(page.locator("canvas.studio-card")).toBeVisible();
});

test("copying the chapter says so, and its plain text keeps the paragraphs", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: /Kapitel till nyhetsbrev/ }).click();
  await expect(page.locator(".studio-mail-body p").nth(3)).toBeVisible();
  await page.getByRole("button", { name: "Substack och Patreon" }).click();

  await expect(page.getByRole("button", { name: "Kopierad" })).toBeVisible();
  const plain = await page.evaluate(() => navigator.clipboard.readText());
  expect(plain.split(/\r?\n\r?\n/).length).toBeGreaterThan(2);
});
