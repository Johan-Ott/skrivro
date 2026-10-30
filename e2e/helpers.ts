import { expect, type Page } from "@playwright/test";

/** Opens the example book "Vintervägen" with its first scene in the editor, and its notes
 * unfolded in the sidebar so the tests reach them. */
export async function openExample(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem("skrivro.app")) {
      localStorage.setItem("skrivro.app", JSON.stringify({ isOnboardingDone: true }));
    }
    const folded = "skrivro.folded./Användare/Elin/Dokument/Skrivro/Vintervägen.skrivro";
    if (!localStorage.getItem(folded)) {
      localStorage.setItem(folded, JSON.stringify({ book: false, notes: false }));
    }
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Prova exempelboken" }).click();
  await expect(page.locator(".ProseMirror")).toContainText("Brevet låg på köksbordet");
}

export const editor = (page: Page) => page.locator(".ProseMirror");
export const sidebar = (page: Page) => page.locator(".sidebar");
export const treeRow = (page: Page, name: string) => sidebar(page).getByText(name, { exact: true });

/** Puts the cursor at the end of the scene's first paragraph. */
export async function cursorAfterFirstParagraph(page: Page) {
  await editor(page).locator("p").first().click();
  await page.evaluate(() => {
    const paragraph = document.querySelector(".ProseMirror p");
    if (!paragraph) return;
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    range.collapse(false);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  });
  await settleSelection(page);
}

/** Selects the first word of the scene, "Brevet". */
export async function selectFirstWord(page: Page) {
  await editor(page).locator("p").first().click();
  await page.evaluate(() => {
    const paragraph = document.querySelector(".ProseMirror p");
    const text = paragraph && document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT).nextNode();
    if (!text) return;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, "Brevet".length);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  });
  await settleSelection(page);
}

// ProseMirror reads a selection change on the next event loop turn, after "selectionchange".
async function settleSelection(page: Page) {
  await page.evaluate(() => new Promise((done) => setTimeout(done, 50)));
}

/** Runs a command from the palette by its name. */
export async function runCommand(page: Page, name: string) {
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type(name);
  await page.keyboard.press("Enter");
}

/** Opens a panel's section in the right column by its title, folding the column out first. */
export async function showPanel(page: Page, name: string) {
  const column = page.getByRole("complementary", { name: "Högerspalten" });
  if (!(await column.isVisible())) await columnToggle(page).click();
  const title = column.getByRole("button", { name: new RegExp(`^${name}`) });
  if ((await title.getAttribute("aria-expanded")) === "false") await title.click();
}

export const columnToggle = (page: Page) =>
  page.getByRole("button", { name: "Visa eller dölj högerspalten" });

/** Picks one way out of the book from Publicera's Exportera menu. */
export async function exportAs(page: Page, name: string) {
  await page.getByRole("button", { name: /^Exportera/ }).click();
  await page.getByRole("menuitem", { name }).click();
}

/** Unfolds a section of Publicera's Utseende panel. */
export const openLook = (page: Page, section: string) =>
  page.locator("summary", { hasText: section }).click();

/** A part of the book in Publicera's sidebar, by the name it starts with. */
export const bookPart = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Bokens delar" })
    .getByRole("button", { name: new RegExp(`^${name}`) });
