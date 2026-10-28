import { expect, test } from "@playwright/test";
import { editor, openExample, sidebar, treeRow } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openExample(page);
});

const rowOf = (page: Parameters<typeof sidebar>[0], name: string) =>
  sidebar(page).locator(".tree-row", { hasText: name });

test("a scene made a note is marked in the tree, not opened, until the next click", async ({
  page,
}) => {
  await treeRow(page, "Isen").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Gör till anteckning i" }).click();
  await page.getByRole("menuitem", { name: "Personer", exact: true }).click();

  await expect(rowOf(page, "Isen")).toHaveClass(/active/);
  await expect(editor(page)).not.toContainText("Isen bar.");

  await treeRow(page, "Arvid").click();
  await expect(rowOf(page, "Isen")).not.toHaveClass(/active/);
});
