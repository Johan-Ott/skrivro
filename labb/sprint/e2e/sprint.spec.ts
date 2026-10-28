import { expect, test } from "@playwright/test";
import { editor, openExample, runCommand } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

test("a layout with Insikter brings it back after the sprint was opened", async ({ page }) => {
  await page.getByRole("button", { name: "Insikter", exact: true }).click();
  await expect(page.locator(".insights-head")).toBeVisible();
  await page.getByRole("button", { name: "Layouter" }).click();
  await page.getByRole("menuitem", { name: "Spara som layout 1" }).click();
  await page.getByRole("button", { name: "Skrivsprint" }).first().click();

  await page.getByRole("button", { name: /^Layouter/ }).click();
  await page.getByRole("menuitemradio", { name: "Layout 1" }).click();

  await expect(page.locator(".insights-head")).toBeVisible();
  await expect(page.getByRole("region", { name: "Skrivsprint" })).toBeHidden();
});

test("a writing sprint counts the words written and can be ended", async ({ page }) => {
  await runCommand(page, "Skrivsprint");
  await cursorAfterFirstParagraph(page);
  await page.keyboard.type(" Hon log och gick.");
  const sprint = page.getByRole("timer");
  await expect(sprint).toContainText("4 ord", { timeout: 5000 });

  await sprint.getByRole("button", { name: "Avsluta" }).click();
  await expect(page.getByText("Sprinten är klar: 4 ord på 1 pass.")).toBeVisible();
});

test("the sprint's block sets its passes and breaks, and shows the pass running", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Skrivsprint" }).first().click();
  const block = page.getByRole("region", { name: "Skrivsprint" });
  await block.getByRole("button", { name: "Mer Varv" }).click();
  await expect(block.locator(".sprint-setting").nth(3)).toContainText("03");

  await block.getByRole("button", { name: "▶ Starta" }).click();

  await expect(block).toContainText("Pass · 1 av 3");
  await expect(page.getByRole("timer")).toBeVisible();
});

test("words typed just before Avsluta count in the sprint's result", async ({ page }) => {
  await runCommand(page, "Skrivsprint");
  await cursorAfterFirstParagraph(page);
  const sprint = page.getByRole("timer");
  await expect(sprint).toContainText("0 ord");

  await page.keyboard.type(" Hon log och gick.");
  await sprint.getByRole("button", { name: "Avsluta" }).click();

  await expect(page.getByText("Sprinten är klar: 4 ord på 1 pass.")).toBeVisible();
});
