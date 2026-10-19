import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";
import { authService } from "../services/auth.service";

// 1. Mock de react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// 2. Mock du service d'authentification
vi.mock("../services/auth.service", () => ({
  authService: {
    login: vi.fn(),
  },
}));

describe("Page Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper pour le rendu
  const renderLogin = () => {
    return render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
  };

  describe("Rendu initial", () => {
    it("affiche le formulaire de connexion avec tous les éléments", () => {
      renderLogin();

      expect(
        screen.getByRole("heading", { name: /login to yoga studio/i }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /login/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /register here/i }),
      ).toBeInTheDocument();
    });

    it("n'affiche pas de message d'erreur au chargement", () => {
      renderLogin();
      expect(screen.queryByText(/login failed/i)).not.toBeInTheDocument();
    });
  });

  describe("Soumission réussie", () => {
    it("appelle authService.login avec les bonnes données et redirige vers /sessions", async () => {
      const user = userEvent.setup();

      // On simule une réussite de l'API
      (authService.login as ReturnType<typeof vi.fn>).mockResolvedValue({});

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /login/i });

      // Simulation de la saisie utilisateur
      await user.type(emailInput, "test@yoga.com");
      await user.type(passwordInput, "supersecret");
      await user.click(submitButton);

      // Vérifications
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(authService.login).toHaveBeenCalledWith({
        email: "test@yoga.com",
        password: "supersecret",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/sessions");
    });
  });

  describe("État de chargement", () => {
    it("désactive le bouton et affiche 'Loading...' pendant la requête", async () => {
      const user = userEvent.setup();

      // On simule une requête qui ne se termine jamais pour tester l'état loading
      (authService.login as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}),
      );

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /login/i });

      await user.type(emailInput, "test@yoga.com");
      await user.type(passwordInput, "supersecret");
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/loading/i);
    });
  });

  describe("Gestion des erreurs", () => {
    it("affiche le message d'erreur spécifique renvoyé par l'API en cas d'échec", async () => {
      const user = userEvent.setup();
      const apiErrorMessage = "Invalid credentials";

      // On simule une erreur Axios comme le ferait le vrai service
      const mockAxiosError = {
        isAxiosError: true,
        response: { data: { message: apiErrorMessage } },
      };
      (authService.login as ReturnType<typeof vi.fn>).mockRejectedValue(
        mockAxiosError,
      );

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /login/i });

      await user.type(emailInput, "wrong@yoga.com");
      await user.type(passwordInput, "wrongpassword");
      await user.click(submitButton);

      // findByText est asynchrone et attend que l'élément apparaisse dans le DOM
      expect(await screen.findByText(apiErrorMessage)).toBeInTheDocument();

      // On vérifie qu'on n'a PAS été redirigé
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("affiche un message d'erreur générique si l'erreur n'est pas une AxiosError", async () => {
      const user = userEvent.setup();

      // On simule une erreur standard (non-Axios)
      (authService.login as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /login/i });

      await user.type(emailInput, "test@yoga.com");
      await user.type(passwordInput, "password");
      await user.click(submitButton);

      expect(await screen.findByText("Login failed")).toBeInTheDocument();
    });
  });
});
