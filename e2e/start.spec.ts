import { expect, test } from "@playwright/test";
import { editor } from "./helpers";

test("the first start goes to the shelf, where a new book opens a scene to write in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Kom igång" })).toBeVisible({ timeout: 50_000 });
  await page.getByRole("button", { name: "Kom igång" }).click();
  await page.getByRole("button", { name: "Klar" }).click();
  await page.getByRole("button", { name: "+ Ny bok" }).click();
  for (let step = 0; step < 2; step++) await page.getByRole("button", { name: "Fortsätt" }).click();
  await page.getByPlaceholder("Arbetstitel duger").fill("Isen");
  await page.getByRole("button", { name: "Skapa boken" }).click();
  await editor(page).click();
  await page.keyboard.type("Det var kallt.");

  await expect(editor(page)).toHaveText("Det var kallt.");
  await expect(page.locator(".sidebar")).toContainText("Isen");
});

test("a new book's genre gives its structure, and what it gets shows before it is made", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Kom igång" }).click({ timeout: 50_000 });
  await page.getByRole("button", { name: "Klar" }).click();
  await page.getByRole("button", { name: "+ Ny bok" }).click();
  await page.getByRole("button", { name: "Fortsätt" }).click();

  await page.getByRole("button", { name: "Genre" }).click();
  await page.getByRole("menuitemradio", { name: "Deckare" }).click();
  for (const piece of ["Skräck", "Romans"]) {
    await page.getByRole("button", { name: piece, exact: true }).click();
  }

  const gets = page.getByRole("definition");
  await expect(gets.first()).toContainText("Deckarens fyra delar");
  await expect(page.locator(".book-gets")).toContainText("Det som skrämmer");
  await expect(page.locator(".book-gets")).toContainText("Relationen");
  await page.getByRole("radio", { name: /Jag skriver mig fram/ }).click();
  await expect(gets.first()).toContainText("1 kapitel");
  await page.getByRole("button", { name: "Fortsätt" }).click();
  await expect(page.getByLabel("Bokens längd i ord")).toHaveValue(/85/);
  await expect(page.getByText("Cirka 340 sidor")).toBeVisible();
});

test("an empty book opens on its welcome, which goes to the trash on request", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Kom igång" }).click({ timeout: 50_000 });
  await page.getByRole("button", { name: "Klar" }).click();
  await page.getByRole("button", { name: "+ Ny bok" }).click();
  await page.getByRole("radio", { name: /Annat/ }).click();
  for (let step = 0; step < 2; step++) await page.getByRole("button", { name: "Fortsätt" }).click();
  await page.getByPlaceholder("Arbetstitel duger").fill("Tom");
  await page.getByRole("button", { name: "Skapa boken" }).click();

  await expect(editor(page)).toContainText("inte en del av boken");
  await expect(page.locator(".sidebar")).not.toContainText("Personer");
  await page.getByRole("button", { name: "Ta bort välkomsten" }).click();

  await expect(page.locator(".sidebar")).not.toContainText("Välkommen");
});

test("the first start asks the writer's languages, and a new book takes the first", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Kom igång" }).click({ timeout: 50_000 });
  await page.getByRole("button", { name: "Svenska", exact: true }).click();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("radio", { name: "500" }).click();
  await page.getByRole("button", { name: "Klar" }).click();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("skrivro.app") ?? "{}"));
  expect(stored).toMatchObject({ bookLanguage: "en-GB", defaultDailyGoal: 500 });
});

test("Tillbaka from the list of structures goes back to the book's summary", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Kom igång" }).click({ timeout: 50_000 });
  await page.getByRole("button", { name: "Klar" }).click();
  await page.getByRole("button", { name: "+ Ny bok" }).click();
  await page.getByRole("button", { name: "Fortsätt" }).click();
  await page.getByRole("button", { name: "Byt", exact: true }).click();

  await page.getByRole("button", { name: "Tillbaka" }).click();

  await expect(page.getByText("Steg 2 av 3")).toBeVisible();
  await expect(page.getByRole("button", { name: "Byt", exact: true })).toBeVisible();
});
