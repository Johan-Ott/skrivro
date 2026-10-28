import { expect, test, type Page } from "@playwright/test";
import { editor, openExample } from "../../../e2e/helpers";

test.beforeEach(async ({ page }) => openExample(page));

test("reaching the daily goal shows the ink in the journey", async ({ page }) => {
  await editor(page).locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.insertText(` ${Array.from({ length: 520 }, () => "ord").join(" ")}`);

  await page.getByRole("button", { name: "Insikter", exact: true }).click();
  await page.locator(".insight-journey").click();
  const journey = page.getByRole("dialog", { name: "Skrivarresan" });
  await expect(journey.getByText("520 ord sedan du började.", { exact: false })).toBeVisible();
  await expect(page.locator(".insight-journey")).toContainText("75 bläck");
});

test("holiday mode is turned on from the inkwell", async ({ page }) => {
  await page.getByRole("button", { name: "Insikter", exact: true }).click();
  await page.locator(".insight-journey").click();
  await page.getByRole("button", { name: "Slå på semesterläge" }).click();

  await expect(page.getByRole("button", { name: /Semesterläge på/ })).toBeVisible();
});

const writeWords = async (page: Page, count: number) => {
  await editor(page).locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.insertText(` ${Array.from({ length: count }, () => "ord").join(" ")}`);
};

test("Dagens mål lists the text written when the day's goal is met", async ({ page }) => {
  await writeWords(page, 520);
  await page.getByRole("button", { name: "Insikter", exact: true }).click();
  await page.locator(".insight-day").click();
  await expect(page.getByRole("dialog", { name: "Dagens mål" })).toContainText("Köket");
});
