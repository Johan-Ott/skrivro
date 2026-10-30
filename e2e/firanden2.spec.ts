import { expect, test } from "@playwright/test";
import { columnToggle, openExample, showPanel } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

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
