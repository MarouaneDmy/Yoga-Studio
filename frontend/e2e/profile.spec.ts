import { test, expect, type Page } from "@playwright/test";

const PROFILE_URL = "/profile";

async function isViteDevServer(page: Page): Promise<boolean> {
  const res = await page.request.get("/@vite/client");
  return (
    res.ok() && (res.headers()["content-type"] ?? "").includes("javascript")
  );
}

const ADMIN = { email: "yoga@studio.com", password: "test!1234" };
const USER = { email: "user@test.com", password: "test!1234" };

async function login(
  page: Page,
  { email, password }: { email: string; password: string },
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL(/\/sessions/);
}

async function registerFreshUser(page: Page) {
  const creds = {
    firstName: "Jane",
    lastName: "Profile",
    email: `e2e.profile.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@test.com`,
    password: "SecurePassword123!",
  };
  await page.goto("/register");
  await page.getByLabel("First Name").fill(creds.firstName);
  await page.getByLabel("Last Name").fill(creds.lastName);
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Password").fill(creds.password);
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await page.waitForURL(/\/sessions/);
  return creds;
}

async function goToProfile(page: Page) {
  const profileLoaded = page.waitForResponse(
    (r) =>
      r.url().includes("/api/user/") &&
      r.request().method() === "GET" &&
      r.ok(),
  );
  await page.goto(PROFILE_URL);
  await profileLoaded;
  await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();
}

const fieldValue = (page: Page, label: string) =>
  page
    .getByText(label, { exact: true })
    .locator("xpath=following-sibling::p[1]");

test.describe("Page Profile : utilisateur standard", () => {
  test("affiche les informations du profil avec le badge User", async ({
    page,
  }) => {
    await login(page, USER);
    await goToProfile(page);

    await expect(fieldValue(page, "Email")).toHaveText(USER.email);
    await expect(fieldValue(page, "First Name")).not.toBeEmpty();
    await expect(fieldValue(page, "Last Name")).not.toBeEmpty();

    await expect(fieldValue(page, "Account Type")).toHaveText("User");
    await expect(page.getByText("Administrator", { exact: true })).toHaveCount(
      0,
    );

    await expect(fieldValue(page, "Member Since")).toHaveText(
      /^[A-Z][a-z]+ \d{1,2}, \d{4}$/,
    );
  });

  test("affiche 'Loading profile...' pendant le chargement", async ({
    page,
  }) => {
    await login(page, USER);

    await page.route("**/api/user/*", async (route) => {
      if (route.request().method() === "GET") {
        await new Promise((r) => setTimeout(r, 1000));
      }
      await route.continue();
    });

    await page.goto(PROFILE_URL);
    await expect(page.getByText("Loading profile...")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "My Profile" }),
    ).toBeVisible();
  });

  test.fixme("affiche le message d'erreur si l'API échoue", async ({
    page,
  }) => {
    await login(page, USER);

    await page.route("**/api/user/*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Internal server error" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(PROFILE_URL);
    await expect(page.getByText(/error/i)).toBeVisible();
  });

  test("le bouton 'Back to Sessions' ramène à la liste des sessions", async ({
    page,
  }) => {
    await login(page, USER);
    await goToProfile(page);

    await page.getByRole("button", { name: "Back to Sessions" }).click();

    await expect(page).toHaveURL(/\/sessions/);
    await expect(
      page.getByRole("heading", { name: "Yoga Sessions" }),
    ).toBeVisible();
  });

  test("n'affiche pas le bouton de promotion si le front n'est pas en mode dev", async ({
    page,
  }) => {
    test.skip(await isViteDevServer(page), "Le bouton est visible en mode dev");

    await login(page, USER);
    await goToProfile(page);

    await expect(
      page.getByRole("button", { name: /Promote to Admin/ }),
    ).toHaveCount(0);
  });
});

test.describe("Page Profile : promotion admin (dev)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !(await isViteDevServer(page)),
      "Nécessite un front servi par vite (mode dev)",
    );
  });

  test("promeut l'utilisateur en admin et met à jour le badge", async ({
    page,
  }) => {
    await registerFreshUser(page);
    await goToProfile(page);

    await expect(fieldValue(page, "Account Type")).toHaveText("User");
    const promoteButton = page.getByRole("button", {
      name: "Promote to Admin (Dev)",
    });
    await expect(promoteButton).toBeVisible();

    const promoteResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/api/user/promote-admin") &&
        r.request().method() === "POST",
    );
    await promoteButton.click();
    expect((await promoteResponse).ok()).toBeTruthy();

    await expect(fieldValue(page, "Account Type")).toHaveText("Administrator");
    await expect(promoteButton).toHaveCount(0);
  });

  test("affiche une erreur si la promotion échoue", async ({ page }) => {
    await registerFreshUser(page);
    await goToProfile(page);

    await page.route("**/api/user/promote-admin", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Server error" }),
      }),
    );

    const promoteButton = page.getByRole("button", {
      name: "Promote to Admin (Dev)",
    });
    await promoteButton.click();

    await expect(page.getByText("Failed to promote to admin")).toBeVisible();
    await expect(promoteButton).toBeEnabled();
    await expect(fieldValue(page, "Account Type")).toHaveText("User");
  });
});

test.describe("Page Profile : administrateur", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN);
    await goToProfile(page);
  });

  test("affiche le badge Administrator et ses informations", async ({
    page,
  }) => {
    await expect(fieldValue(page, "Email")).toHaveText(ADMIN.email);
    await expect(fieldValue(page, "Account Type")).toHaveText("Administrator");
    await expect(page.getByText("User", { exact: true })).toHaveCount(0);
  });

  test("ne propose jamais la promotion (déjà admin)", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Promote to Admin/ }),
    ).toHaveCount(0);
  });
});

test.describe("Page Profile : suppression de compte", () => {
  test("annuler la confirmation ne supprime rien", async ({ page }) => {
    await registerFreshUser(page);
    await goToProfile(page);

    let deleteCalled = false;
    page.on("request", (req) => {
      if (req.method() === "DELETE") deleteCalled = true;
    });

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toContain("delete your account");
      await dialog.dismiss();
    });

    await page.getByRole("button", { name: "Delete Account" }).click();

    await expect(page).toHaveURL(new RegExp(PROFILE_URL));
    await expect(
      page.getByRole("heading", { name: "My Profile" }),
    ).toBeVisible();
    expect(deleteCalled).toBe(false);
  });

  test("confirmer supprime le compte, déconnecte et redirige vers /login", async ({
    page,
  }) => {
    const creds = await registerFreshUser(page);
    await goToProfile(page);

    page.once("dialog", (dialog) => dialog.accept());

    const deleteResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/api/user/") && r.request().method() === "DELETE",
    );
    await page.getByRole("button", { name: "Delete Account" }).click();
    expect((await deleteResponse).ok()).toBeTruthy();

    await expect(page).toHaveURL("/login");

    await page.getByLabel("Email").fill(creds.email);
    await page.getByLabel("Password").fill(creds.password);
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByText("Invalid credentials")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("affiche une alerte et reste sur la page si la suppression échoue", async ({
    page,
  }) => {
    await registerFreshUser(page);
    await goToProfile(page);

    await page.route("**/api/user/*", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({ status: 500, body: "{}" });
      } else {
        await route.continue();
      }
    });

    const messages: string[] = [];
    page.on("dialog", async (dialog) => {
      messages.push(dialog.message());
      await dialog.accept();
    });

    await page.getByRole("button", { name: "Delete Account" }).click();

    await expect
      .poll(() => messages)
      .toEqual([
        expect.stringContaining("delete your account"),
        "Failed to delete account",
      ]);
    await expect(page).toHaveURL(new RegExp(PROFILE_URL));
    await expect(
      page.getByRole("heading", { name: "My Profile" }),
    ).toBeVisible();
  });
});
