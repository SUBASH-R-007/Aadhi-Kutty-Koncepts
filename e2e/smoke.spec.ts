import { expect, test } from "@playwright/test";

/**
 * Full-workflow smoke test using the keyless mock providers.
 * Requires PostgreSQL (docker compose up -d db && npm run db:migrate).
 */
test("create project → paste source → generate → approve → visual → export", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "New project" })).toBeVisible();

  // Create a project
  await page.getByRole("link", { name: "New project" }).click();
  await page.getByLabel("Project name").fill("E2E Photosynthesis");
  await page.getByLabel("Course / subject").fill("Plant Biology 101");
  await page.getByLabel("College name").fill("Rajalakshmi Engineering College");
  await page.getByRole("button", { name: "Create project" }).click();

  // Paste source material
  await expect(page.getByLabel("Pasted learning material")).toBeVisible();
  await page.getByLabel("Pasted learning material").fill(
    [
      "# Photosynthesis",
      "Photosynthesis converts light energy into chemical energy stored in glucose. Chlorophyll pigments absorb photons in the thylakoid membranes.",
      "",
      "## Light reactions",
      "The light reactions split water molecules, releasing oxygen and producing ATP and NADPH for the Calvin cycle to use later.",
      "",
      "## Calvin cycle",
      "The Calvin cycle fixes carbon dioxide into three-carbon sugars using the ATP and NADPH produced earlier in the stroma of the chloroplast.",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "Add pasted text" }).click();
  await expect(page.getByText("chunk(s)").first()).toBeVisible({ timeout: 15_000 });

  // Generate content (mock provider) and land in the editor
  await page.getByRole("button", { name: "Generate page content" }).click();
  await expect(page.getByRole("group", { name: "Reading level" })).toBeVisible({ timeout: 60_000 });

  // Approve page 1, check level toggle
  await page.getByRole("button", { name: "advanced" }).click();
  await page.getByRole("button", { name: "novice" }).click();
  await page.getByRole("button", { name: "Save & approve for visuals" }).click();
  await expect(page.getByText("Approved").first()).toBeVisible({ timeout: 15_000 });

  // Generate a visual for page 1
  await page.goto(page.url().replace("/content", "/visuals"));
  await page.getByRole("button", { name: "Generate visual" }).first().click();
  await expect(page.getByAltText(/Composed page 1/).first()).toBeVisible({ timeout: 90_000 });

  // Export the novice booklet
  await page.goto(page.url().replace("/visuals", "/export"));
  await page.getByRole("button", { name: "Export novice version" }).click();
  await expect(page.getByRole("link", { name: "Download" }).first()).toBeVisible({
    timeout: 90_000,
  });
});
