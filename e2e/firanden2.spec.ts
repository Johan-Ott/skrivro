import { expect, test } from "@playwright/test";
import { openExample } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

test("Mål under the day's words shows the scene and chapter, and keeps a goal for the chapter", async ({
  page,
}) => {
  await page.locator(".day-progress").click();
  const goals = page.getByRole("region", { name: "Mål" });
  await expect(goals).toContainText("Scenen");
  await goals.getByRole("textbox", { name: "Mål för Kapitel 1" }).fill("3000");
  await goals.getByRole("textbox", { name: "Mål för Kapitel 1" }).press("Enter");
  await page.getByRole("button", { name: "Stäng" }).last().click();

  await page.locator(".day-progress").click();

  await expect(page.getByRole("textbox", { name: "Mål för Kapitel 1" })).toHaveValue("3000");
});
