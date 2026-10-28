import { sidebar, editor } from "../helpers";
import { expect, test, type Page } from "@playwright/test";

// A planner on her computer: lays out parts and chapters first, keeps a cast of characters,
// writes a little, and plans the book in Innehåll with what happens and when.

async function add(page: Page, what: string) {
  await page.getByRole("button", { name: "Lägg till", exact: true }).click();
  await page.getByRole("menuitem", { name: what }).click();
}

test("a planner lays out a book, keeps her characters, and plans it in Innehåll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Kom igång" })).toBeVisible({ timeout: 50_000 });
  await page.getByRole("button", { name: "Kom igång" }).click();
  await page.getByRole("button", { name: "Klar" }).click();
  await page.getByRole("button", { name: "+ Ny bok" }).click();
  for (let step = 0; step < 2; step++) await page.getByRole("button", { name: "Fortsätt" }).click();
  await page.getByPlaceholder("Arbetstitel duger").fill("Saltet");
  await page.getByRole("button", { name: "Skapa boken" }).click();
  await page.getByRole("button", { name: "Börja skriva" }).click();
  await editor(page).click();
  await page.keyboard.type("Sigrid kom till ön i mars.", { delay: 2 });

  // The outline: a second chapter and a part, before much is written.
  await add(page, "Nytt kapitel");
  // The new chapter waits for its name, as a new folder does.
  await page.keyboard.type("Ankomsten");
  await page.keyboard.press("Enter");
  await add(page, "Ny del");
  await page.keyboard.press("Escape");
  await expect(sidebar(page)).toContainText("Ankomsten");
  // A new chapter has a scene to write in from the start.
  await expect(sidebar(page).getByRole("treeitem", { name: /Ny scen/ })).toHaveCount(1);

  // A character, linked in the text: her name becomes something to click.
  await page.getByRole("button", { name: "+ Ny anteckning" }).click();
  const dialog = page.getByRole("dialog", { name: "Ny anteckning" });
  await dialog.getByRole("textbox", { name: "Namn" }).fill("Sigrid");
  await dialog.getByRole("button", { name: "Skapa" }).click();
  // The new note opens; the notes are unfolded to show it, and are only clicked open if they are not.
  const notes = sidebar(page).getByRole("button", { name: "Anteckningar" });
  if ((await notes.getAttribute("aria-expanded")) === "false") await notes.click();
  await expect(notes).toHaveAttribute("aria-expanded", "true");
  await expect(sidebar(page)).toContainText("Sigrid");

  await sidebar(page).getByRole("treeitem").filter({ hasText: "Scen 1" }).first().click();
  await expect(editor(page).locator(".mention").first()).toContainText("Sigrid");
  await editor(page).locator(".mention").first().click();
  await expect(page.locator(".mention-card")).toContainText("Sigrid");
  await page.keyboard.press("Escape");

  // Innehåll: what happens in the first chapter, and when.
  await page.getByRole("button", { name: "Saltet" }).click();
  const contents = page.locator(".contents-view");
  await contents.getByLabel("Vad händer?").first().fill("Sigrid kommer till ön.");
  await contents.getByLabel("Vad händer?").first().press("Enter");
  await contents.getByLabel("När?").first().fill("Mars");
  await contents.getByLabel("När?").first().press("Enter");
  await contents.getByRole("radio", { name: "Tidsordning" }).click();
  await expect(contents.getByLabel("När?").first()).toHaveValue("Mars");

  // Everything planned is still there after the book is closed and opened again.
  await page.keyboard.press("ControlOrMeta+Shift+O");
  await page.getByText("Saltet").first().click();
  await page.getByRole("button", { name: "Saltet" }).click();
  await expect(page.locator(".contents-view").getByLabel("Vad händer?").first()).toHaveValue(
    "Sigrid kommer till ön.",
  );
});
