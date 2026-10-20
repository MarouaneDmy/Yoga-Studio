import { test, expect } from "@playwright/test";

test.describe("Parcours d'Authentification", () => {
  // ============================================
  // CONNEXION (LOGIN)
  // ============================================
  test.describe("Connexion (Login)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
    });

    test("devrait permettre à un utilisateur de se connecter et d'accéder aux sessions", async ({
      page,
    }) => {
      // 1. Remplir le formulaire
      await page.getByLabel("Email").fill("yoga@studio.com"); // Email du seed.ts
      await page.getByLabel("Password").fill("test!1234");

      // 2. PRÉPARER l'écoute de la réponse
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/auth/login") &&
          response.status() === 200,
      );

      // 3. Soumettre
      await page.getByRole("button", { name: "Login" }).click();

      // 4. Attendre la réponse succès
      const response = await responsePromise;
      expect(response.ok()).toBeTruthy();

      // 5. Vérifier la redirection et l'UI
      await expect(page).toHaveURL(/\/sessions/);
      await expect(
        page.getByRole("heading", { name: "Yoga Sessions" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
    });

    test("devrait afficher un message d'erreur avec des identifiants invalides", async ({
      page,
    }) => {
      // 1. Remplir avec de faux identifiants
      await page.getByLabel("Email").fill("wrong@email.com");
      await page.getByLabel("Password").fill("wrongpassword");

      // 2. PRÉPARER l'écoute de la réponse d'erreur
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/auth/login") &&
          response.status() === 401,
      );

      // 3. Soumettre
      await page.getByRole("button", { name: "Login" }).click();

      // 4. Attendre la réponse erreur
      const response = await responsePromise;
      expect(response.status()).toBe(401);

      // 5. Vérifier le message d'erreur et l'URL
      await expect(page.getByText("Invalid credentials")).toBeVisible();
      await expect(page).toHaveURL("/login");
    });
  });

  // ============================================
  // INSCRIPTION (REGISTER)
  // ============================================
  test.describe("Inscription (Register)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/register");
    });

    test("devrait permettre à un nouvel utilisateur de s'inscrire et d'accéder aux sessions", async ({
      page,
    }) => {
      // 🌟 Email unique pour éviter les conflits
      const uniqueEmail = `e2e.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@test.com`;

      // 1. PRÉPARER l'écoute de la réponse
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/auth/register") &&
          response.status() === 201,
      );

      // 2. Remplir le formulaire
      await page.getByLabel("First Name").fill("Jane");
      await page.getByLabel("Last Name").fill("Doe");
      await page.getByLabel("Email").fill(uniqueEmail);
      await page.getByLabel("Password").fill("SecurePassword123!");

      // 3. Soumettre
      await page.getByRole("button", { name: "Register", exact: true }).click();

      // 4. Attendre la réponse succès
      const response = await responsePromise;
      expect(response.ok()).toBeTruthy();

      // 5. Vérifier la redirection et l'UI
      await expect(page).toHaveURL(/\/sessions/);
      await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

      // 6. Vérifier que le nouvel utilisateur n'est PAS admin
      await expect(
        page.getByRole("link", { name: "Create Session" }),
      ).not.toBeVisible();
    });

    test("devrait afficher un message d'erreur si l'email existe déjà", async ({
      page,
    }) => {
      // 🎭 MOCKING RÉSEAU : Simuler une erreur backend
      await page.route("**/api/auth/register", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ message: "Email already exists" }),
        });
      });

      // 1. Remplir le formulaire
      await page.getByLabel("First Name").fill("John");
      await page.getByLabel("Last Name").fill("Doe");
      await page.getByLabel("Email").fill("existing@test.com");
      await page.getByLabel("Password").fill("password123");

      // 2. Soumettre
      await page.getByRole("button", { name: "Register", exact: true }).click();

      // 3. Vérifier le message d'erreur et l'URL
      await expect(page.getByText("Email already exists")).toBeVisible();
      await expect(page).toHaveURL("/register");
    });

    test("devrait bloquer la soumission si les champs requis sont vides", async ({
      page,
    }) => {
      // 1. Ne rien remplir et cliquer
      await page.getByRole("button", { name: "Register", exact: true }).click();

      // 2. Le navigateur bloque (validation HTML native)
      await expect(page).toHaveURL("/register");
      await expect(
        page.getByRole("button", { name: "Register", exact: true }),
      ).toBeEnabled();
    });

    test("devrait valider la longueur minimale du mot de passe", async ({
      page,
    }) => {
      // 1. Remplir avec un mot de passe trop court
      await page.getByLabel("First Name").fill("John");
      await page.getByLabel("Last Name").fill("Doe");
      await page.getByLabel("Email").fill("test@test.com");
      await page.getByLabel("Password").fill("short");

      // 2. Essayer de soumettre
      await page.getByRole("button", { name: "Register", exact: true }).click();

      // 3. Le navigateur bloque (minLength={8})
      await expect(page).toHaveURL("/register");
      await expect(
        page.getByRole("button", { name: "Register", exact: true }),
      ).toBeEnabled();
    });
  });

  // ============================================
  // DÉCONNEXION (LOGOUT)
  // ============================================
  test.describe("Déconnexion (Logout)", () => {
    test("devrait permettre à un utilisateur connecté de se déconnecter", async ({
      page,
    }) => {
      // 1. Se connecter d'abord
      await page.goto("/login");
      await page.getByLabel("Email").fill("yoga@studio.com");
      await page.getByLabel("Password").fill("test!1234");
      await page.getByRole("button", { name: "Login" }).click();
      await expect(page).toHaveURL(/\/sessions/);

      // 2. Vérifier que Logout est visible
      const logoutButton = page.getByRole("button", { name: "Logout" });
      await expect(logoutButton).toBeVisible();

      // 3. Cliquer sur Logout
      await logoutButton.click();

      // 4. Vérifier la redirection vers /login
      await expect(page).toHaveURL("/login");

      // 5. Vérifier que les liens Login et Register sont de nouveau visibles
      await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Register", exact: true }),
      ).toBeVisible();
    });
  });
});
