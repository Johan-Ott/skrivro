import { expect, test, type Page } from "@playwright/test";
import { editor, openExample, runCommand, sidebar, treeRow } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

test("a new person starts as a short sheet to fill in", async ({ page }) => {
  await page.getByText("+ Ny anteckning").click();
  await page.keyboard.type("Henrik");
  await page.keyboard.press("Enter");

  await expect(editor(page)).toContainText("Vill:");
  await expect(editor(page)).toContainText("Döljer:");
});

test("Rollista shows the people as cards, and a card opens the person", async ({ page }) => {
  await runCommand(page, "Gå till Innehåll");
  await page.getByRole("radio", { name: "Rollista" }).click();

  const card = page.locator(".cast-card", { hasText: "Arvid" });
  await expect(card).toContainText("Elins farbror");
  await expect(card).toContainText("Nämns i kap.");
  await card.click();

  await expect(page.locator(".note-header h1")).toHaveText("Arvid");
});

test("whose eyes a chapter is seen through shows in the tree", async ({ page }) => {
  await expect(sidebar(page).locator(".tree-pov").first()).toHaveAttribute("data-pov", "Elin");
});

test("what a chapter is for stands under its title while writing it", async ({ page }) => {
  const task = page.getByRole("textbox", { name: "Vad händer i kapitlet?" });

  await expect(task).toHaveValue(/Elin får ett brev från Henrik/);
});

test("Innehåll shows where the reader learns a secret", async ({ page }) => {
  await runCommand(page, "Gå till Innehåll");

  await expect(page.locator(".contents-reveal")).toHaveText("Avslöjar: Henrik lever");
});

test("a new note with a name the book has says so, and Skapa waits for a name", async ({
  page,
}) => {
  await page.getByText("+ Ny anteckning").click();
  const dialog = page.getByRole("dialog", { name: "Ny anteckning" });
  await expect(dialog.getByRole("button", { name: "Skapa" })).toBeDisabled();

  await page.keyboard.type("Elin");

  await expect(dialog).toContainText("Det finns redan en anteckning som heter Elin.");
});

async function openElin(page: Page) {
  await treeRow(page, "Personer").click();
  await treeRow(page, "Elin").click();
}

test("a connection is typed at once, and shows on the other note's page too", async ({ page }) => {
  await openElin(page);
  await page.getByRole("button", { name: "+ Koppling" }).click();

  await page.keyboard.type("syster");
  await page.keyboard.press("Enter");
  const made = page.locator(".connections .connection-name", { hasText: "syster" });
  await expect(made).toBeVisible();
  await made.click();

  await expect(page.locator(".connections .connection-name", { hasText: "Elin" })).toBeVisible();
});

test("Escape closes the new connection's form", async ({ page }) => {
  await openElin(page);
  await page.getByRole("button", { name: "+ Koppling" }).click();

  await page.keyboard.press("Escape");

  await expect(page.getByRole("button", { name: "+ Koppling" })).toBeVisible();
});

test("a person's other names are chosen among the parts of the title, or typed", async ({
  page,
}) => {
  await page.getByRole("button", { name: "+ Ny anteckning" }).click();
  const dialog = page.getByRole("dialog", { name: "Ny anteckning" });
  await dialog.getByRole("textbox", { name: "Namn" }).fill("Erik Holm");
  await dialog.getByRole("button", { name: "Skapa" }).click();
  await expect(page.getByRole("button", { name: "Holm", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Holm", exact: true }).click();
  await page.getByRole("button", { name: "+ Andra namn" }).click();
  await page.getByRole("textbox", { name: "Ett annat namn" }).fill("Eken");
  await page.keyboard.press("Enter");

  const names = page.locator(".aliases");
  await expect(names).toContainText("Holm");
  await expect(names).toContainText("Eken");
  await expect(page.getByRole("button", { name: "Erik", exact: true })).toBeVisible();
});

test("Escape in the field for another name adds nothing, and a part of the title stays offered", async ({
  page,
}) => {
  await page.getByRole("button", { name: "+ Ny anteckning" }).click();
  const dialog = page.getByRole("dialog", { name: "Ny anteckning" });
  await dialog.getByRole("textbox", { name: "Namn" }).fill("Erik Holm");
  await dialog.getByRole("button", { name: "Skapa" }).click();
  await page.getByRole("button", { name: "Erik", exact: true }).click();
  await expect(page.getByRole("button", { name: "Holm", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "+ Andra namn" }).click();
  await page.getByRole("textbox", { name: "Ett annat namn" }).fill("Skuggan");
  await page.keyboard.press("Escape");

  await expect(page.locator(".aliases")).not.toContainText("Skuggan");
  await expect(page.locator(".aliases")).toContainText("Erik");
});
