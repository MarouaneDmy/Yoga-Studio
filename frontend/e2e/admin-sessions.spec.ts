import { test, expect } from "@playwright/test";

test.describe("Parcours Administrateur : Création de session", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Connexion avec le compte ADMIN défini dans ton seed.ts
    await page.goto("/login");
    await page.getByLabel("Email").fill("yoga@studio.com");
    await page.getByLabel("Password").fill("test!1234");
    await page.getByRole("button", { name: "Login" }).click();

    // 2. Attendre la redirection
    await page.waitForURL(/\/sessions/);
  });

  test("devrait permettre à un admin de créer une nouvelle session", async ({
    page,
  }) => {
    const uniqueSessionName = `E2E Yoga Test ${Date.now()}`;

    // 1. ✅ CORRECTION ICI : Utiliser .last() pour cibler le bouton de la page, pas celui de la navbar
    const createButton = page
      .getByRole("link", { name: "Create Session", exact: true })
      .last();
    await expect(createButton).toBeVisible();
    await createButton.click();

    // 2. Vérifier qu'on est sur le formulaire
    await page.waitForURL("/sessions/create");
    await expect(
      page.getByRole("heading", { name: "Create New Session" }),
    ).toBeVisible();

    // 3. PRÉPARER l'écoute de la création AVANT la soumission
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/session") &&
        response.request().method() === "POST" &&
        response.status() === 201,
    );

    // 4. Remplir le formulaire
    await page.getByLabel("Session Name").fill(uniqueSessionName);
    await page.getByLabel("Date").fill("2026-12-01"); // Format YYYY-MM-DD

    // Sélectionner le premier vrai professeur (index 1, car index 0 est "Select a teacher")
    await page.getByLabel("Teacher").selectOption({ index: 1 });

    await page
      .getByLabel("Description")
      .fill("Session créée automatiquement par le test E2E.");

    // 5. Soumettre le formulaire
    await page
      .getByRole("button", { name: "Create Session", exact: true })
      .click();

    // 6. Attendre la réponse succès du backend
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    // 7. Vérifier la redirection et la présence de la nouvelle session dans la liste
    await page.waitForURL(/\/sessions/);
    await expect(page.getByText(uniqueSessionName)).toBeVisible();
  });
});
