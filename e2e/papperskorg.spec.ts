import { expect, test, type Locator, type Page } from "@playwright/test";
import { openExample, sidebar, treeRow } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openExample(page);
});

const rowNames = (page: Page) => sidebar(page).locator(".tree-row .tree-label").allInnerTexts();

test("a scene thrown away from the menu can be taken back at once, to where it was", async ({
  page,
}) => {
  const before = await rowNames(page);
  await treeRow(page, "Isen").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Flytta till papperskorg" }).click();

  await page.getByRole("status").getByRole("button", { name: "Ångra" }).click();

  await expect.poll(() => rowNames(page)).toEqual(before);
});

test("a scene dragged onto Personer stays in the book", async ({ page }) => {
  const before = await rowNames(page);

  await treeRow(page, "Isen").dragTo(treeRow(page, "Personer"));

  await expect.poll(() => rowNames(page)).toEqual(before);
});

test("a refused drag right after a throw shows its notice above the Ångra", async ({ page }) => {
  await treeRow(page, "Isen").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Flytta till papperskorg" }).click();
  await treeRow(page, "Köket").dragTo(treeRow(page, "Personer"));
  const refused = page.locator(".tree-undo", { hasText: "blir inte en anteckning" });
  const undo = page.locator(".tree-undo", { hasText: "Ångra" });
  await expect(refused).toBeVisible();

  const [above, below] = [await refused.boundingBox(), await undo.boundingBox()];
  expect((above?.y ?? 0) + (above?.height ?? Infinity)).toBeLessThanOrEqual(below?.y ?? 0);
});

test("the notice of a thrown open scene and a refused drag do not lie over each other", async ({
  page,
}) => {
  await treeRow(page, "Köket").click();
  await treeRow(page, "Köket").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Flytta till papperskorg" }).click();
  await treeRow(page, "Isen").dragTo(treeRow(page, "Personer"));
  const refused = page.locator(".tree-undo", { hasText: "blir inte en anteckning" });
  const undo = page.locator(".tree-undo", { hasText: "ligger i papperskorgen" });
  await expect(refused).toBeVisible();

  const stay = page.locator(".toast", { hasText: "går bara att läsa" });
  const place = async (toast: Locator) => (await toast.boundingBox()) ?? { y: 0, height: Infinity };
  const [first, second, third] = [await place(refused), await place(undo), await place(stay)];
  expect(first.y + first.height).toBeLessThanOrEqual(second.y);
  expect(second.y + second.height).toBeLessThanOrEqual(third.y);
});

test("a scene merged with the next is not counted as words written today", async ({ page }) => {
  await treeRow(page, "Köket").click();
  await treeRow(page, "Köket").click({ button: "right" });

  await page.getByRole("menuitem", { name: "Slå ihop med nästa scen" }).click();

  await expect(page.locator(".tree-row.active .tree-meta")).not.toHaveText("94");
  await expect(page.getByText(/^0 \/ /)).toBeVisible();
});

// The phone's rows are dragged by pointer too, but dragTo is too quick for it.
async function dragByHand(page: Page, from: string, to: RegExp) {
  const start = await page.getByText(from, { exact: true }).boundingBox();
  const end = await page.getByRole("treeitem", { name: to }).boundingBox();
  if (!start || !end) throw new Error("The rows to drag are not on the screen.");
  await page.mouse.move(start.x + 10, start.y + 5);
  await page.mouse.down();
  await page.mouse.move(start.x + 10, start.y + 30, { steps: 5 });
  await page.mouse.move(end.x + 40, end.y + end.height / 2, { steps: 10 });
  await page.mouse.up();
}

test("on a phone a refused drag's notice stands above the Ångra, and Ångra can be pressed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Meny för Isen" }).click();
  await page.getByRole("menuitem", { name: "Flytta till papperskorg" }).click();
  await dragByHand(page, "Köket", /^Personer/);
  const refused = page.locator(".tree-undo", { hasText: "blir inte en anteckning" });
  const undo = page.locator(".tree-undo", { hasText: "Ångra" });
  await expect(refused).toBeVisible();

  const [above, below] = [await refused.boundingBox(), await undo.boundingBox()];
  expect((above?.y ?? 0) + (above?.height ?? Infinity)).toBeLessThanOrEqual(below?.y ?? 0);
  await undo.getByRole("button", { name: "Ångra" }).click({ trial: true });
});
