import { test, expect } from "@playwright/test";

test.describe("Parcours d'Authentification", () => {
  test.describe("Connexion (Login)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
    });

    test("devrait permettre à un utilisateur de se connecter et d'accéder aux sessions", async ({
      page,
    }) => {
      await page.getByLabel("Email").fill("yoga@studio.com");
      await page.getByLabel("Password").fill("test!1234");

      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/auth/login") &&
          response.status() === 200,
      );

      await page.getByRole("button", { name: "Login" }).click();

      const response = await responsePromise;
      expect(response.ok()).toBeTruthy();

      await expect(page).toHaveURL(/\/sessions/);
      await expect(
        page.getByRole("heading", { name: "Yoga Sessions" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
    });

    test("devrait afficher un message d'erreur avec des identifiants invalides", async ({
      page,
    }) => {
      await page.getByLabel("Email").fill("wrong@email.com");
      await page.getByLabel("Password").fill("wrongpassword");

      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/auth/login") &&
          response.status() === 401,
      );

      await page.getByRole("button", { name: "Login" }).click();

      const response = await responsePromise;
      expect(response.status()).toBe(401);

      await expect(page.getByText("Invalid credentials")).toBeVisible();
      await expect(page).toHaveURL("/login");
    });
  });

  test.describe("Inscription (Register)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/register");
    });

    test("devrait permettre à un nouvel utilisateur de s'inscrire et d'accéder aux sessions", async ({
      page,
    }) => {
      const uniqueEmail = `e2e.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@test.com`;

      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/auth/register") &&
          response.status() === 201,
      );

      await page.getByLabel("First Name").fill("Jane");
      await page.getByLabel("Last Name").fill("Doe");
      await page.getByLabel("Email").fill(uniqueEmail);
      await page.getByLabel("Password").fill("SecurePassword123!");

      await page.getByRole("button", { name: "Register", exact: true }).click();

      const response = await responsePromise;
      expect(response.ok()).toBeTruthy();

      await expect(page).toHaveURL(/\/sessions/);
      await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

      await expect(
        page.getByRole("link", { name: "Create Session" }),
      ).not.toBeVisible();
    });

    test("devrait afficher un message d'erreur si l'email existe déjà", async ({
      page,
    }) => {
      await page.route("**/api/auth/register", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ message: "Email already exists" }),
        });
      });

      await page.getByLabel("First Name").fill("John");
      await page.getByLabel("Last Name").fill("Doe");
      await page.getByLabel("Email").fill("existing@test.com");
      await page.getByLabel("Password").fill("password123");

      await page.getByRole("button", { name: "Register", exact: true }).click();

      await expect(page.getByText("Email already exists")).toBeVisible();
      await expect(page).toHaveURL("/register");
    });

    test("devrait bloquer la soumission si les champs requis sont vides", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Register", exact: true }).click();

      await expect(page).toHaveURL("/register");
      await expect(
        page.getByRole("button", { name: "Register", exact: true }),
      ).toBeEnabled();
    });

    test("devrait valider la longueur minimale du mot de passe", async ({
      page,
    }) => {
      await page.getByLabel("First Name").fill("John");
      await page.getByLabel("Last Name").fill("Doe");
      await page.getByLabel("Email").fill("test@test.com");
      await page.getByLabel("Password").fill("short");

      await page.getByRole("button", { name: "Register", exact: true }).click();

      await expect(page).toHaveURL("/register");
      await expect(
        page.getByRole("button", { name: "Register", exact: true }),
      ).toBeEnabled();
    });
  });

  test.describe("Déconnexion (Logout)", () => {
    test("devrait permettre à un utilisateur connecté de se déconnecter", async ({
      page,
    }) => {
      await page.goto("/login");
      await page.getByLabel("Email").fill("yoga@studio.com");
      await page.getByLabel("Password").fill("test!1234");
      await page.getByRole("button", { name: "Login" }).click();
      await expect(page).toHaveURL(/\/sessions/);

      const logoutButton = page.getByRole("button", { name: "Logout" });
      await expect(logoutButton).toBeVisible();

      await logoutButton.click();

      await expect(page).toHaveURL("/login");

      await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Register", exact: true }),
      ).toBeVisible();
    });
  });
});
