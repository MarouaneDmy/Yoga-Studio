import { test, expect } from "@playwright/test";

test.describe("Parcours Administrateur : Création de session", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("yoga@studio.com");
    await page.getByLabel("Password").fill("test!1234");
    await page.getByRole("button", { name: "Login" }).click();

    await page.waitForURL(/\/sessions/);
  });

  test("devrait permettre à un admin de créer une nouvelle session", async ({
    page,
  }) => {
    const uniqueSessionName = `E2E Yoga Test ${Date.now()}`;

    const createButton = page
      .getByRole("link", { name: "Create Session", exact: true })
      .last();
    await expect(createButton).toBeVisible();
    await createButton.click();

    await page.waitForURL("/sessions/create");
    await expect(
      page.getByRole("heading", { name: "Create New Session" }),
    ).toBeVisible();

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/session") &&
        response.request().method() === "POST" &&
        response.status() === 201,
    );

    await page.getByLabel("Session Name").fill(uniqueSessionName);
    await page.getByLabel("Date").fill("2026-12-01");

    await page.getByLabel("Teacher").selectOption({ index: 1 });

    await page
      .getByLabel("Description")
      .fill("Session créée automatiquement par le test E2E.");

    await page
      .getByRole("button", { name: "Create Session", exact: true })
      .click();

    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    await page.waitForURL(/\/sessions/);
    await expect(page.getByText(uniqueSessionName)).toBeVisible();
  });
});
