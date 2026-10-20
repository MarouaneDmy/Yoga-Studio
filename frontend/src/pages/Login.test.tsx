import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";
import { authService } from "../services/auth.service";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../services/auth.service", () => ({
  authService: {
    login: vi.fn(),
  },
}));

describe("Page Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

      (authService.login as ReturnType<typeof vi.fn>).mockResolvedValue({});

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /login/i });

      await user.type(emailInput, "test@yoga.com");
      await user.type(passwordInput, "supersecret");
      await user.click(submitButton);

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

      expect(await screen.findByText(apiErrorMessage)).toBeInTheDocument();

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("affiche un message d'erreur générique si l'erreur n'est pas une AxiosError", async () => {
      const user = userEvent.setup();

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
