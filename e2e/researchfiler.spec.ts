import { expect, test } from "@playwright/test";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { editor, openExample, runCommand, togglePanel, treeRow } from "./helpers";

test("a research file becomes a note among the notes, showing its picture", async ({ page }) => {
  await openExample(page);

  const chooser = page.waitForEvent("filechooser");
  await runCommand(page, "Lägg till fil bland anteckningarna…");
  await (await chooser).setFiles("src-tauri/icons/128x128.png");

  const header = page.locator(".note-header");
  await expect(header.locator("h1")).toHaveText("128x128");
  await expect(header.locator(".research-picture")).toHaveAttribute("src", /^blob:/);
  await expect(header.locator(".research-file-name")).toHaveText("128x128.png");
  await expect(treeRow(page, "128x128")).toBeVisible();
});

test("a file that is no picture shows its name, and the note takes the writer's words", async ({
  page,
}) => {
  await openExample(page);

  const chooser = page.waitForEvent("filechooser");
  await runCommand(page, "Lägg till fil bland anteckningarna…");
  await (await chooser).setFiles("package.json");

  await expect(page.locator(".research-file-name")).toHaveText("package.json");
  await expect(page.locator(".research-picture")).toHaveCount(0);
  await page.locator(".ProseMirror").click();
  await page.keyboard.type("Beroendena, för säkerhets skull.");
  await expect(page.locator(".ProseMirror")).toContainText("Beroendena");
});

test("a file added from a scene is in I scenen there, as no one names it in the text", async ({
  page,
}) => {
  await openExample(page);
  await expect(editor(page)).toContainText("Brevet låg på köksbordet");

  const chooser = page.waitForEvent("filechooser");
  await runCommand(page, "Lägg till fil bland anteckningarna…");
  await (await chooser).setFiles("package.json");
  await expect(page.locator(".research-file-name")).toHaveText("package.json");
  await treeRow(page, "Köket").click();
  await togglePanel(page, "I scenen");

  const block = page.getByRole("region", { name: "I scenen" });
  await block.getByRole("button", { name: /package/ }).click();
  await expect(page.locator(".beside-pane")).toContainText("dependencies");
});

test("a text file is read in the note, and a PDF page by page", async ({ page }) => {
  await openExample(page);

  const chooser = page.waitForEvent("filechooser");
  await runCommand(page, "Lägg till fil bland anteckningarna…");
  await (await chooser).setFiles("package.json");
  await expect(page.locator(".research-text")).toContainText("dependencies");

  const pdf =
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 2/Kids[3 0 R 3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R/Size 4>>\n%%EOF";
  const second = page.waitForEvent("filechooser");
  await runCommand(page, "Lägg till fil bland anteckningarna…");
  await (
    await second
  ).setFiles({ name: "brev.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdf) });

  await expect(page.getByText("Sida 1 av 2")).toBeVisible();
  await expect(page.locator(".pdf-page")).toBeVisible();
  await page.getByRole("button", { name: "Nästa sida" }).click();
  await expect(page.getByText("Sida 2 av 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nästa sida" })).toBeDisabled();
});

test("a Word file is read in the note as text, with its italics", async ({ page }) => {
  await openExample(page);
  const letter = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun("Kära Elin, "), new TextRun({ text: "kom hem", italics: true })],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(letter);

  const chooser = page.waitForEvent("filechooser");
  await runCommand(page, "Lägg till fil bland anteckningarna…");
  await (
    await chooser
  ).setFiles({ name: "brev.docx", mimeType: "application/octet-stream", buffer });

  await expect(page.locator(".research-docx")).toContainText("Kära Elin, kom hem");
  await expect(page.locator(".research-docx em")).toHaveText("kom hem");
});

test("the same file added twice asks, in the open book, whether to open it", async ({ page }) => {
  await openExample(page);
  await expect(editor(page)).toContainText("Brevet låg på köksbordet");

  for (let time = 0; time < 2; time++) {
    const chooser = page.waitForEvent("filechooser");
    await runCommand(page, "Lägg till fil bland anteckningarna…");
    await (await chooser).setFiles("package.json");
    if (time === 0) await expect(page.locator(".research-file-name")).toHaveText("package.json");
  }

  const question = page.getByRole("dialog", { name: "Filen finns redan" });
  await expect(question).toBeVisible();
  await question.getByRole("button", { name: "Öppna" }).click();
  await expect(page.locator(".research-file-name")).toHaveText("package.json");
});
