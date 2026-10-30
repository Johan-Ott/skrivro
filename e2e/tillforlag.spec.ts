import { expect, test } from "@playwright/test";
import { editor, exportAs, openExample, runCommand } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await editor(page).click();
  await runCommand(page, "Publicera");
  await exportAs(page, "Till förlag…");
});

test("the synopsis is kept, and a submission is added and answered", async ({ page }) => {
  const dialog = page.getByRole("region", { name: "Till förlag" });
  await dialog.getByRole("textbox", { name: "Synopsis" }).fill("Elin får ett brev.");
  await dialog.getByRole("radio", { name: "Inskick" }).click();
  await dialog.getByRole("button", { name: "Lägg till inskick" }).click();
  await dialog.getByRole("textbox", { name: "Förlag eller agent" }).fill("Bonniers");
  await dialog.getByRole("textbox", { name: "Förlag eller agent" }).blur();
  await dialog.getByRole("combobox", { name: "Svar" }).selectOption("mer");

  await dialog.getByRole("radio", { name: "Synopsis" }).click();
  await expect(dialog.getByRole("textbox", { name: "Synopsis" })).toHaveValue("Elin får ett brev.");
  await dialog.getByRole("radio", { name: "Inskick" }).click();
  await expect(dialog.getByRole("textbox", { name: "Förlag eller agent" })).toHaveValue("Bonniers");
  await expect(dialog.getByRole("combobox", { name: "Svar" })).toHaveValue("mer");
});
