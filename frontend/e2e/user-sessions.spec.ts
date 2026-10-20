import { test, expect } from "@playwright/test";

test.describe("Parcours Utilisateur : Sessions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("user@test.com");
    await page.getByLabel("Password").fill("test!1234");
    await page.getByRole("button", { name: "Login" }).click();
    await page.waitForURL(/\/sessions/);
  });

  test("devrait permettre de voir les détails et de modifier son inscription à une session", async ({
    page,
  }) => {
    // 1. Vérifier qu'on est bien sur la liste des sessions
    await expect(
      page.getByRole("heading", { name: "Yoga Sessions" }),
    ).toBeVisible();

    // 2. Cliquer sur "View Details" de la PREMIÈRE session
    const firstViewDetailsButton = page
      .getByRole("link", { name: "View Details" })
      .first();
    await firstViewDetailsButton.click();

    // 3. ✅ ATTENDRE que le titre de la session apparaisse (preuve que les données sont chargées)
    // C'est le <h1> qui contient le nom de la session
    const sessionTitle = page.getByRole("heading", { level: 1 });
    await expect(sessionTitle).toBeVisible({ timeout: 10000 });

    // 4. Maintenant seulement, chercher les boutons
    const joinButton = page.getByRole("button", {
      name: "Join Session",
      exact: true,
    });
    const leaveButton = page.getByRole("button", {
      name: "Leave Session",
      exact: true,
    });

    // 5. Vérifier quel est l'état actuel et agir
    if (await joinButton.isVisible()) {
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/participate") &&
          response.request().method() === "POST",
      );

      await joinButton.click();
      const response = await responsePromise;
      expect(response.ok()).toBeTruthy();
      await expect(leaveButton).toBeVisible();
    } else if (await leaveButton.isVisible()) {
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/participate") &&
          response.request().method() === "DELETE",
      );

      await leaveButton.click();
      const response = await responsePromise;
      expect(response.ok()).toBeTruthy();
      await expect(joinButton).toBeVisible();
    } else {
      // 💡 DEBUG : Décommente cette ligne pour voir ce qui s'affiche vraiment sur la page
      // await page.pause();

      // Prendre une capture d'écran pour déboguer
      await page.screenshot({ path: "debug-session-detail.png" });

      throw new Error(
        "Ni 'Join Session' ni 'Leave Session' n'est visible. Vérifie debug-session-detail.png",
      );
    }
  });
});
