import { expect, test } from "@playwright/test";
import { bookPart, openExample, runCommand } from "./helpers";

test("the print cover counts the book's pages for its spine, and keeps the back text", async ({
  page,
}) => {
  await openExample(page);
  await runCommand(page, "Gå till Publicera");
  await bookPart(page, "Omslag").click();

  await expect(page.getByText(/Ryggen blir [\d,]+ mm vid \d+ sidor/)).toBeVisible({
    timeout: 40_000,
  });
  await page.getByLabel("Baksidestext").fill("En roman om is och tystnad.");
  await page.getByRole("radio", { name: "Krämvitt" }).click();

  await expect(page.getByLabel("Baksidestext")).toHaveValue("En roman om is och tystnad.");
});

test("the cover and the e-book show their front, and an ISBN that cannot be one says so", async ({
  page,
}) => {
  await openExample(page);
  await runCommand(page, "Gå till Publicera");

  await bookPart(page, "Omslag").click();
  await expect(page.getByText("Förhandsvisning · Framsidan")).toBeVisible();
  await page.getByRole("radio", { name: "E-bok" }).click();
  await expect(page.getByText("Förhandsvisning · E-bok")).toBeVisible();

  await page.getByRole("tab", { name: "Uppgifter" }).click();
  await page.getByLabel("ISBN (valfritt)").fill("abc123");
  await expect(page.getByText("Ett ISBN har 10 eller 13 siffror")).toBeVisible();
});
