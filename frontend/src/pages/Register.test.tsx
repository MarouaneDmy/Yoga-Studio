import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Register from "./Register";
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
    register: vi.fn(),
  },
}));

describe("Page Register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRegister = () => {
    return render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );
  };

  describe("Rendu initial", () => {
    it("affiche le formulaire d'inscription avec tous les champs", () => {
      renderRegister();

      expect(
        screen.getByRole("heading", { name: /register for yoga studio/i }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /register/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /login here/i }),
      ).toBeInTheDocument();
    });

    it("n'affiche pas de message d'erreur au chargement", () => {
      renderRegister();
      expect(
        screen.queryByText(/registration failed/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("Soumission réussie", () => {
    it("appelle authService.register avec les bonnes données et redirige vers /sessions", async () => {
      const user = userEvent.setup();
      (authService.register as ReturnType<typeof vi.fn>).mockResolvedValue({});

      renderRegister();

      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "john@yoga.com");
      await user.type(screen.getByLabelText(/password/i), "password123");

      await user.click(screen.getByRole("button", { name: /register/i }));

      expect(authService.register).toHaveBeenCalledTimes(1);
      expect(authService.register).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        email: "john@yoga.com",
        password: "password123",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/sessions");
    });
  });

  describe("État de chargement", () => {
    it("désactive le bouton et affiche 'Registering...' pendant la requête", async () => {
      const user = userEvent.setup();

      // Simule une requête qui ne se termine jamais
      (authService.register as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}),
      );

      renderRegister();

      await user.type(screen.getByLabelText(/email/i), "test@yoga.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      // On remplit vite fait les autres pour que le formulaire soit valide (required)
      await user.type(screen.getByLabelText(/first name/i), "Test");
      await user.type(screen.getByLabelText(/last name/i), "User");

      await user.click(screen.getByRole("button", { name: /register/i }));

      const submitButton = screen.getByRole("button", { name: /registering/i });
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/registering/i);
    });
  });

  describe("Gestion des erreurs", () => {
    it("affiche le message d'erreur spécifique renvoyé par l'API en cas d'échec", async () => {
      const user = userEvent.setup();
      const apiErrorMessage = "Email already exists";

      const mockAxiosError = {
        isAxiosError: true,
        response: { data: { message: apiErrorMessage } },
      };
      (authService.register as ReturnType<typeof vi.fn>).mockRejectedValue(
        mockAxiosError,
      );

      renderRegister();

      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "existing@yoga.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /register/i }));

      expect(await screen.findByText(apiErrorMessage)).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("affiche un message d'erreur générique si l'erreur n'est pas une AxiosError", async () => {
      const user = userEvent.setup();

      (authService.register as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      renderRegister();

      await user.type(screen.getByLabelText(/first name/i), "John");
      await user.type(screen.getByLabelText(/last name/i), "Doe");
      await user.type(screen.getByLabelText(/email/i), "test@yoga.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /register/i }));

      expect(
        await screen.findByText("Registration failed"),
      ).toBeInTheDocument();
    });
  });
});
