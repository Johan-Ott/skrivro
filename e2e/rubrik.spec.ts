import { expect, test } from "@playwright/test";
import { openExample, openLook, runCommand } from "./helpers";

test("a chapter gets a subtitle and an epigraph, and the design sets its title in small caps", async ({
  page,
}) => {
  await openExample(page);
  await runCommand(page, "Gå till Innehåll");

  await page.getByRole("button", { name: "Rubrik…" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Rubriken för 1. Brevet" });
  await dialog.getByLabel("Undertitel").fill("Elin, vintern 1952");
  await dialog.getByLabel("Citat före texten").fill("Isen bär den som går lätt.");
  await dialog.getByRole("button", { name: "Spara" }).click();
  await expect(page.getByRole("button", { name: "Elin, vintern 1952" })).toBeVisible();

  await runCommand(page, "Gå till Publicera");
  await openLook(page, "Kapitelrubrik");
  await page.getByRole("button", { name: "Titel", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Kapitäler" }).click();
  await expect(page.getByRole("button", { name: "Titel", exact: true })).toHaveText("Kapitäler");
});

test("a new chapter opening template is drawn, made the standard, and picked by a chapter", async ({
  page,
}) => {
  await openExample(page);
  await runCommand(page, "Gå till Publicera");
  await openLook(page, "Kapitelöppningar");

  await page.getByRole("button", { name: "+ Ny mall" }).click();
  await page.getByRole("menuitem", { name: "Bild överst" }).click();
  const editor = page.getByRole("dialog", { name: "Kapitelöppning" });
  await editor.getByText("Bildyta", { exact: true }).click();
  await editor.getByRole("button", { name: "Ornament" }).click();
  await editor.getByRole("button", { name: "Klar" }).click();
  await page.getByRole("button", { name: "Mallens meny" }).last().click();
  await page.getByRole("menuitem", { name: "Gör till standard" }).click();

  await runCommand(page, "Gå till Innehåll");
  await page.getByRole("button", { name: "Rubrik…" }).first().click();
  await expect(page.getByRole("button", { name: "Kapitelöppning" })).toHaveText(
    "Som boken (Bild överst)",
  );
});

test("a template is duplicated and removed from its menu, but the last one stays", async ({
  page,
}) => {
  await openExample(page);
  await runCommand(page, "Gå till Publicera");
  await openLook(page, "Kapitelöppningar");

  await page.getByRole("button", { name: "Mallens meny" }).click();
  await page.getByRole("menuitem", { name: "Duplicera" }).click();
  await expect(page.getByRole("button", { name: "Klassisk 2" })).toBeVisible();

  await page.getByRole("button", { name: "Mallens meny" }).last().click();
  await page.getByRole("menuitem", { name: "Ta bort" }).click();
  await expect(page.getByRole("button", { name: "Klassisk 2" })).toBeHidden();

  await page.getByRole("button", { name: "Mallens meny" }).click();
  await expect(page.getByRole("menuitem", { name: "Ta bort" })).toBeHidden();
});
