import { expect, test } from "@playwright/test";
import { editor, openExample } from "./helpers";

// Sök: through the whole book, notes too, with its hit list, narrowed by steps, or in the scene.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

test("search finds a name across the scene", async ({ page }) => {
  await editor(page).click();

  await page.keyboard.press("ControlOrMeta+f");
  await page.getByRole("button", { name: "Sök i hela boken" }).click();
  await page.getByRole("textbox", { name: "Sök" }).fill("Elin");

  await expect(page.getByText(/^\d+ träffar$/)).toBeVisible();
  await page.getByRole("textbox", { name: "Sök" }).press("Enter");
  await expect(page.getByText(/^1 av \d+$/)).toBeVisible();
  await page.getByRole("button", { name: "Stäng sökning" }).click();
  await expect(page.getByRole("search")).toBeHidden();
});

test("across the book the matches are listed by scene, and one opens its scene", async ({
  page,
}) => {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+f");
  await page.keyboard.type("Elin");

  const hits = page.getByRole("list", { name: "Träffar i boken" }).getByRole("listitem");
  await expect(hits).not.toHaveCount(0);
  await hits.filter({ hasText: "· Isen" }).click();

  await expect(editor(page)).toContainText("Isen bar.");
});

test("a status chip narrows the manuscript's matches to scenes in that step", async ({ page }) => {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+f");
  await page.keyboard.type("Elin");

  await page
    .getByRole("group", { name: "Bara scener med" })
    .getByRole("button", { name: "Redigering" })
    .click();

  const hits = page.getByRole("list", { name: "Träffar i boken" }).getByRole("listitem");
  await expect(hits).toHaveCount(1);
  await expect(hits).toContainText("Köket");
});

test("the notes' text is searched from the start, and the hit says the note's sort", async ({
  page,
}) => {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+f");
  await page.keyboard.type("Trettioåtta");

  const hits = page.getByRole("list", { name: "Träffar i boken" }).getByRole("listitem");
  await expect(hits).toHaveCount(1);
  await expect(hits).toContainText("Personer · Elin");
});

test("Ersätt replaces the next match at the first click", async ({ page }) => {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+Home");
  await page.keyboard.press("ControlOrMeta+f");
  await page.getByRole("textbox", { name: "Sök" }).fill("Elin");
  await page.getByRole("textbox", { name: "Ersätt med" }).fill("Elina");
  await expect(page.getByText(/^\d+ träffar$/)).toBeVisible();

  await page.getByRole("button", { name: "Ersätt", exact: true }).click();

  await expect(editor(page)).toContainText("Elina");
});

test("Ersätt says it changes the manuscript only, while the notes are searched too", async ({
  page,
}) => {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+f");
  await page.getByRole("textbox", { name: "Ersätt med" }).fill("Elina");

  await expect(page.getByText("Ersätter i manuset, inte i anteckningar")).toBeVisible();
  await page.getByRole("button", { name: "Sök i hela boken" }).click();
  await expect(page.getByText("Ersätter i manuset, inte i anteckningar")).toBeHidden();
});

const LONG_NAME =
  "Den mycket långa anteckningen om vad som hände vid fyren den vintern då isen låg "
    .repeat(3)
    .trim();

for (const width of [1280, 390]) {
  test(`a long name in Ctrl+K stays on one line, ${width} px wide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 820 });
    await page.getByRole("button", { name: "+ Ny anteckning" }).click();
    const dialog = page.getByRole("dialog", { name: "Ny anteckning" });
    await dialog.getByRole("textbox", { name: "Namn" }).fill(LONG_NAME);
    await dialog.getByRole("button", { name: "Skapa" }).click();
    await page.keyboard.press("ControlOrMeta+k");
    await page.keyboard.type("Den mycket långa");

    const name = page
      .getByRole("option", { name: /Den mycket långa/ })
      .first()
      .locator(".palette-entry-name");
    const box = await name.boundingBox();
    expect(box?.height ?? Infinity).toBeLessThan(40);
    expect(box?.width ?? 0).toBeGreaterThan(100);
  });
}
