import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import { exportAs, openExample, showPanel } from "../helpers";

// A writer sends her manuscript to an editor in Word and reads the editor's file back: the
// file Skrivro made, changed in Word as an editor would, and each change taken or left.

async function editInWord(file: string, changes: [string, string][]) {
  const zip = await JSZip.loadAsync(readFileSync(file));
  let xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("Not a Word file");
  for (const [from, to] of changes) xml = xml.replace(from, to);
  zip.file("word/document.xml", xml);
  const edited = file.replace(/\.docx$/, " redigerad.docx");
  writeFileSync(edited, await zip.generateAsync({ type: "nodebuffer" }));
  return edited;
}

test("a manuscript goes to the editor in Word and comes back with changes to take or leave", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await openExample(page);

  await page.getByRole("tab", { name: "Publicera" }).click();
  const download = page.waitForEvent("download");
  await exportAs(page, "Standardmanus");
  const manuscript = join(testInfo.outputDir, (await download).suggestedFilename());
  await (await download).saveAs(manuscript);

  const edited = await editInWord(manuscript, [
    ["gult av ålder", "gulnat av åren"],
    ["utan att se upp från spisen", "vid spisen"],
  ]);

  await page.getByRole("tab", { name: "Skriv" }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Dela och samarbeta" }).click();
  await page.getByRole("menuitem", { name: "Läs in kommenterad Word-fil…" }).click();
  await (await chooser).setFiles(edited);
  await expect(page.getByText(/Redaktören har ändrat i \d+ scener/)).toBeVisible();
  await page.getByRole("button", { name: "Stäng", exact: true }).click();

  await showPanel(page, "Granska");
  const panel = page.getByRole("complementary", { name: "Granskning" });
  await expect(panel.getByText("Ändringar att gå igenom")).toBeVisible();
  await panel.getByRole("button", { name: "Godta", exact: true }).first().click();
  await panel.getByRole("button", { name: "Avvisa", exact: true }).first().click();

  const text = page.locator(".ProseMirror");
  await expect(text).toContainText("gulnat av åren");
  await expect(text).toContainText("utan att se upp från spisen");
  await expect(panel.getByText("Alla ändringar är genomgångna.")).toBeVisible();
});
