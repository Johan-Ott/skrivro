import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

// A writer who has her novel in Word moves it into Skrivro on the first start: the chapters
// become chapters, the text stays her text, and she can go on writing where she stopped.

async function manuscript(folder: string) {
  const heading = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_1 });
  const text = (words: string) => new Paragraph({ children: [new TextRun(words)] });
  const doc = new Document({
    sections: [
      {
        children: [
          heading("Ett"),
          text("Vinden kom från havet och tog med sig allt som inte satt fast."),
          text("Hon hörde den genom väggarna hela natten."),
          heading("Två"),
          text("På morgonen var stranden full av tång och brädor."),
          heading("Tre"),
          text("Ingen visste var båten hade tagit vägen."),
        ],
      },
    ],
  });
  mkdirSync(folder, { recursive: true });
  const path = join(folder, "Stormen.docx");
  writeFileSync(path, await Packer.toBuffer(doc));
  return path;
}

test("a novel in Word moves into Skrivro on the first start, chapter by chapter", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const file = await manuscript(testInfo.outputDir);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Kom igång" }).click({ timeout: 50_000 });
  await page.getByRole("button", { name: "Fortsätt" }).click();
  await page.getByRole("button", { name: "Klar" }).click();

  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Importera manus…" }).click();
  await (await chooser).setFiles(file);

  const sidebar = page.locator(".sidebar");
  await expect(sidebar).toContainText("Ett", { timeout: 30_000 });
  await expect(sidebar).toContainText("Två");
  await expect(sidebar).toContainText("Tre");
  // Each scene is named by its first words until she names it; chapters start folded.
  await sidebar.getByRole("treeitem", { name: /Två/ }).click();
  await sidebar.getByRole("treeitem").filter({ hasText: "På morgonen var stranden" }).click();
  const editor = page.locator(".ProseMirror");
  await expect(editor).toContainText("stranden full av tång");

  await editor.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Hon gick ner till vattnet.", { delay: 2 });
  await expect(editor).toContainText("Hon gick ner till vattnet.");
});
