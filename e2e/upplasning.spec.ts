import { expect, test } from "@playwright/test";
import { openExample, selectFirstWord } from "./helpers";

// The computer's voice is replaced by one that only remembers what it was asked to say.
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.addInitScript(() => {
    const said: string[] = [];
    Object.assign(window, { said });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        speak: (utterance: { text: string }) => said.push(utterance.text),
        cancel: () => undefined,
        getVoices: () => [],
      },
    });
  });
  await openExample(page);
});

test("the selected words are read aloud, and the pill stops the reading", async ({ page }) => {
  await selectFirstWord(page);
  await page
    .getByRole("toolbar", { name: "Formatering" })
    .getByRole("button", { name: "Mer" })
    .click();
  await page.getByRole("menuitem", { name: "Läs upp" }).click();

  const pill = page.getByRole("button", { name: "Läser upp · Stoppa" });
  await expect(pill).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { said: string[] }).said)).toEqual([
    "Brevet",
  ]);
  await pill.click();
  await expect(pill).toBeHidden();
});
