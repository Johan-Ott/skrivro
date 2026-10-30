import { expect, test } from "@playwright/test";
import { columnToggle, openExample, showPanel } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

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

test("Insikter in the column shows the open scene and chapter, and keeps a goal for the chapter", async ({
  page,
}) => {
  await showPanel(page, "Insikter");
  const insights = page.getByRole("region", { name: "Insikter" });
  await expect(insights).toContainText("Scenen");
  await insights.getByRole("textbox", { name: "Mål för Kapitel 1" }).fill("3000");
  await insights.getByRole("textbox", { name: "Mål för Kapitel 1" }).press("Enter");

  await columnToggle(page).click();
  await columnToggle(page).click();

  await expect(page.getByRole("textbox", { name: "Mål för Kapitel 1" })).toHaveValue("3000");
});
