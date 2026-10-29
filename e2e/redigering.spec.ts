import { Bookmark, Document, Packer, Paragraph, TextRun } from "docx";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { cursorAfterFirstParagraph, editor, openExample } from "./helpers";

const KOKET = "01J9Z4K2QX0000000000000001";

// The example's first scene as an editor might send it back: one word changed, one sentence cut.
async function editorsFile(folder: string) {
  const paragraph = (text: string, marks: { start?: boolean; end?: boolean } = {}) =>
    new Paragraph({
      children: [
        ...(marks.start ? [new Bookmark({ id: `skrivro_${KOKET}`, children: [] })] : []),
        new TextRun(text),
        ...(marks.end ? [new Bookmark({ id: `skrivroend_${KOKET}`, children: [] })] : []),
      ],
    });
  const doc = new Document({
    sections: [
      {
        children: [
          paragraph(
            "Brevet låg på köksbordet när Elin kom in från kylan. Kuvertet var gult av ålder, och handstilen kände hon igen innan hon ens hunnit ta av sig vantarna.",
            { start: true },
          ),
          paragraph("– Det kom i morse, sa Arvid utan att se upp från spisen.", { end: true }),
        ],
      },
    ],
  });
  mkdirSync(folder, { recursive: true });
  const path = join(folder, "redigerad.docx");
  writeFileSync(path, await Packer.toBuffer(doc));
  return path;
}

test("an editor's Word file is read back, and their changes are accepted or rejected one by one", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await openExample(page);
  const file = await editorsFile(testInfo.outputDir);

  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Dela och samarbeta" }).click();
  await page.getByRole("menuitem", { name: "Läs in kommenterad Word-fil…" }).click();
  await (await chooser).setFiles(file);
  await expect(page.getByText("Redaktören har ändrat i 1 scener")).toBeVisible();
  await page.getByRole("button", { name: "Stäng", exact: true }).click();

  const panel = page.getByRole("complementary", { name: "Granskning" });
  await expect(panel.getByText("Ändringar att gå igenom")).toBeVisible();
  await expect(editor(page).locator(".revision-removed").first()).toBeVisible();
  await panel.getByRole("button", { name: "Godta", exact: true }).click();

  await expect(panel.getByText("Alla ändringar är genomgångna.")).toBeVisible();
  await expect(editor(page)).not.toContainText("Med posten");
});

test("with the margin on, the editor's changes stand in it beside their words, and the text moves left to make room", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.addInitScript(() =>
    localStorage.setItem("skrivro.writing", JSON.stringify({ commentsInMargin: true })),
  );
  await openExample(page);
  const file = await editorsFile(testInfo.outputDir);

  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Dela och samarbeta" }).click();
  await page.getByRole("menuitem", { name: "Läs in kommenterad Word-fil…" }).click();
  await (await chooser).setFiles(file);
  await page.getByRole("button", { name: "Stäng", exact: true }).click();

  const card = page.locator(".margin-note[data-change]");
  await expect(card).toContainText("Med posten");
  await expect(page.getByRole("complementary", { name: "Granskning" })).toHaveCount(0);
  const leftOfCentre = await page.evaluate(() => {
    const middle = (box: DOMRect) => (box.left + box.right) / 2;
    const text = document.querySelector(".ProseMirror")?.getBoundingClientRect() ?? new DOMRect();
    const card = document.querySelector(".page")?.getBoundingClientRect() ?? new DOMRect();
    return middle(card) - middle(text);
  });
  expect(leftOfCentre).toBeGreaterThan(100);
  await card.getByRole("button", { name: "Godta" }).click();

  await expect(card).toHaveCount(0);
  await expect(editor(page)).not.toContainText("Med posten");
});

// The first scene as a test reader sends it back: unchanged, with a comment on one word.
async function readersFile(folder: string) {
  const { CommentRangeEnd, CommentRangeStart, CommentReference } = await import("docx");
  const doc = new Document({
    comments: {
      children: [
        {
          id: 0,
          author: "Testläsaren",
          children: [new Paragraph({ children: [new TextRun("Vem skickade det?")] })],
        },
      ],
    },
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new Bookmark({ id: `skrivro_${KOKET}`, children: [] }),
              new TextRun("Brevet låg på köksbordet när Elin kom in från kylan. "),
              new CommentRangeStart(0),
              new TextRun("Kuvertet"),
              new CommentRangeEnd(0),
              new TextRun({ children: [new CommentReference(0)] }),
              new TextRun(" var gult av ålder."),
              new Bookmark({ id: `skrivroend_${KOKET}`, children: [] }),
            ],
          }),
        ],
      },
    ],
  });
  mkdirSync(folder, { recursive: true });
  const path = join(folder, "kommenterad.docx");
  writeFileSync(path, await Packer.toBuffer(doc));
  return path;
}

test("a test reader's comments in Word come into Granska, on the words they are on", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await openExample(page);
  const file = await readersFile(testInfo.outputDir);

  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Dela och samarbeta" }).click();
  await page.getByRole("menuitem", { name: "Läs in kommenterad Word-fil…" }).click();
  await (await chooser).setFiles(file);
  await expect(page.getByText("1 nya kommentarer finns nu i Granska.")).toBeVisible();
  await page.getByRole("button", { name: "Stäng", exact: true }).click();

  await expect(page.getByText("Vem skickade det?").first()).toBeVisible();
  await expect(editor(page).locator(".commented", { hasText: "Kuvertet" })).toBeVisible();
});

async function pressTimes(page: Page, key: string, times: number) {
  for (let count = 0; count < times; count += 1) await page.keyboard.press(key);
}

test("the tree counts the words once they are saved", async ({ page }) => {
  await openExample(page);
  const sceneWords = page.locator(".tree-row.active .tree-meta");
  const before = Number((await sceneWords.innerText()).replace(/\D/g, ""));
  await cursorAfterFirstParagraph(page);

  await page.keyboard.type(" Hon log åt honom.");

  await expect(sceneWords).toHaveText(String(before + 4));
});

test("redo with nothing left to redo leaves the text as it is", async ({ page }) => {
  await openExample(page);
  await cursorAfterFirstParagraph(page);
  await page.keyboard.type(" Ångra mig.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("En rad till.");
  await pressTimes(page, "ControlOrMeta+z", 3);
  await pressTimes(page, "ControlOrMeta+Shift+z", 2);
  await expect(editor(page)).toContainText("En rad till.");

  await pressTimes(page, "ControlOrMeta+Shift+z", 3);

  await expect(editor(page)).toContainText("Ångra mig.");
  await expect(editor(page)).toContainText("En rad till.");
});

test("a footnote left empty with Escape is not kept", async ({ page }) => {
  await openExample(page);
  await cursorAfterFirstParagraph(page);

  await page.keyboard.press("ControlOrMeta+Alt+f");
  await page.keyboard.press("Escape");

  await expect(editor(page).locator("sup.footnote")).toHaveCount(0);
});
