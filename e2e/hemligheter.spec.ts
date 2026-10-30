import { expect, test } from "@playwright/test";
import { openExample, showPanel } from "./helpers";

// Vem vet vad: a secret, when the reader learns it, who learns it, and where it slips out early.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openExample(page);
});

test("a secret named before its reveal is flagged, and the person who learns it knows it", async ({
  page,
}) => {
  await page.getByRole("button", { name: "+ Ny anteckning" }).click();
  const dialog = page.getByRole("dialog", { name: "Ny anteckning" });
  await dialog.getByRole("textbox", { name: "Namn" }).fill("Henrik");
  await dialog.getByRole("radio", { name: "Hemligheter" }).click();
  await dialog.getByRole("button", { name: "Skapa" }).click();

  const panel = page.getByRole("region", { name: "Vem vet vad" });
  await panel
    .getByRole("combobox", { name: "Läsaren får veta i" })
    .selectOption({ label: "3. Smältningen · Regnet" });
  await expect(panel.getByRole("note")).toContainText("1. Brevet · Köket");

  await panel
    .getByRole("combobox", { name: "Lägg till en person som får veta" })
    .selectOption({ label: "Elin" });
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("Elin");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("region", { name: "Vet om" })).toContainText("Henrik");
});

test("Granska warns in a scene that names a secret before its reveal", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ny anteckning" }).click();
  const dialog = page.getByRole("dialog", { name: "Ny anteckning" });
  await dialog.getByRole("textbox", { name: "Namn" }).fill("Henrik");
  await dialog.getByRole("radio", { name: "Hemligheter" }).click();
  await dialog.getByRole("button", { name: "Skapa" }).click();
  const panel = page.getByRole("region", { name: "Vem vet vad" });
  await panel
    .getByRole("combobox", { name: "Läsaren får veta i" })
    .selectOption({ label: "3. Smältningen · Regnet" });

  await page.locator(".sidebar").getByText("Köket", { exact: true }).click();
  await page.getByRole("tab", { name: "Redigera" }).click();
  await showPanel(page, "Granska");

  await expect(page.getByRole("region", { name: "Hemligheter före avslöjandet" })).toContainText(
    "Henrik",
  );
});

test("a person who learns the secret can be taken off again", async ({ page }) => {
  await page.getByRole("button", { name: "+ Ny anteckning" }).click();
  const dialog = page.getByRole("dialog", { name: "Ny anteckning" });
  await dialog.getByRole("textbox", { name: "Namn" }).fill("Henrik");
  await dialog.getByRole("radio", { name: "Hemligheter" }).click();
  await dialog.getByRole("button", { name: "Skapa" }).click();
  const panel = page.getByRole("region", { name: "Vem vet vad" });
  await panel
    .getByRole("combobox", { name: "Lägg till en person som får veta" })
    .selectOption({ label: "Elin" });

  await panel.getByRole("button", { name: "Ta bort Elin" }).click();

  await expect(panel.getByRole("combobox", { name: "När Elin får veta" })).toHaveCount(0);
});
