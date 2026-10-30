// The Redigera step: the walk, the book read on, the counts in the tree and the editor's letter.
import { expect, test } from "@playwright/test";
import { editorsFile, KOKET } from "./editorsFile";
import { editor, openExample } from "./helpers";

test("in Redigera the walk stands where the format row was, reads the editor's file in and steps through it", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.addInitScript(() =>
    localStorage.setItem("skrivro.writing", JSON.stringify({ commentsInMargin: true })),
  );
  await openExample(page);
  await page.getByRole("tablist", { name: "Steg" }).getByRole("tab", { name: "Redigera" }).click();
  const walk = page.getByRole("toolbar", { name: "Genomgång" });
  await expect(walk).toContainText("Inget kvar att gå igenom");
  await expect(page.getByRole("toolbar", { name: "Formatering" })).toBeHidden();

  const chooser = page.waitForEvent("filechooser");
  await walk.getByRole("button", { name: "Läs in redaktörens fil…" }).click();
  await (await chooser).setFiles(await editorsFile(testInfo.outputDir));
  await page.getByRole("button", { name: "Stäng", exact: true }).click();
  await expect(walk).toContainText(/\d+ att gå igenom/);

  await walk.getByRole("button", { name: "Nästa" }).click();
  await expect(walk).toContainText(/1 av \d+/);
  await expect(page.locator(".margin-note.current")).toHaveCount(1);
  await page.getByRole("tablist", { name: "Steg" }).getByRole("tab", { name: "Skriv" }).click();
  await expect(page.getByRole("toolbar", { name: "Formatering" })).toBeVisible();
});

test("an editor's file with a letter opens Redigera on the letter, until the walk begins", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await openExample(page);
  await page.getByRole("tablist", { name: "Steg" }).getByRole("tab", { name: "Redigera" }).click();
  const walk = page.getByRole("toolbar", { name: "Genomgång" });
  const chooser = page.waitForEvent("filechooser");
  await walk.getByRole("button", { name: "Läs in redaktörens fil…" }).click();
  await (await chooser).setFiles(await editorsFile(testInfo.outputDir, "Isen bär hela boken."));

  const letter = page.getByRole("region", { name: "Brev från redaktören" });
  await expect(letter.getByRole("heading", { name: "Brev från Lena" })).toBeVisible();
  await expect(letter).toContainText("Isen bär hela boken.");
  await expect(letter.getByRole("listitem").first()).toContainText("Brevet");
  await expect(walk).toContainText("Omgång 1 från Lena");
  await letter.getByRole("button", { name: "Börja genomgången" }).click();

  await expect(letter).toHaveCount(0);
  await expect(walk.getByRole("button", { name: "Brev från Lena" })).toBeVisible();
});

test("in Redigera the rest of the book follows the open scene, and a click opens the one read", async ({
  page,
}) => {
  await openExample(page);
  await expect(page.locator(".read-on")).toHaveCount(0);
  await page.getByRole("tablist", { name: "Steg" }).getByRole("tab", { name: "Redigera" }).click();
  const next = page.locator(".read-on-scene").first();
  await expect(next).toContainText("Isen bar.");

  await next.getByRole("button", { name: /Isen/ }).click();

  await expect(editor(page)).toContainText("Isen bar.");
  await expect(page.locator(".read-on-scene").first()).not.toContainText("Isen bar.");
});

test("in Redigera the tree counts what waits in each scene, and the open one counts from the editor", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await openExample(page);
  const steps = page.getByRole("tablist", { name: "Steg" });
  await steps.getByRole("tab", { name: "Redigera" }).click();
  const chooser = page.waitForEvent("filechooser");
  const walk = page.getByRole("toolbar", { name: "Genomgång" });
  await walk.getByRole("button", { name: "Läs in redaktörens fil…" }).click();
  await (await chooser).setFiles(await editorsFile(testInfo.outputDir));
  await page.getByRole("button", { name: "Stäng", exact: true }).click();

  const koket = page.locator(`.tree-row[data-node-id="${KOKET}"] .tree-left`);
  await expect(koket).toHaveText(/^[1-9]\d*$/);
  const count = (await koket.textContent()) ?? "";
  await page.locator(".tree-row", { hasText: "Isen" }).first().click();
  await expect(editor(page)).toContainText("Isen bar.");
  await expect(koket).toHaveText(count);

  await steps.getByRole("tab", { name: "Skriv" }).click();
  await expect(page.locator(".tree-left")).toHaveCount(0);
});
