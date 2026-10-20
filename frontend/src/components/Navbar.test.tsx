import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Navbar from "./Navbar";
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
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn(),
    logout: vi.fn(),
  },
}));

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderNavbar = () => {
    return render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
  };

  describe("Quand l'utilisateur n'est PAS connecté", () => {
    beforeEach(() => {
      (authService.isAuthenticated as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      );
      (authService.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(
        null,
      );
    });

    it("affiche le lien Login", () => {
      renderNavbar();
      expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();
    });

    it("affiche le lien Register", () => {
      renderNavbar();
      expect(
        screen.getByRole("link", { name: /register/i }),
      ).toBeInTheDocument();
    });

    it("n'affiche PAS le lien Sessions", () => {
      renderNavbar();
      expect(
        screen.queryByRole("link", { name: /sessions/i }),
      ).not.toBeInTheDocument();
    });

    it("n'affiche PAS le bouton Logout", () => {
      renderNavbar();
      expect(
        screen.queryByRole("button", { name: /logout/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Quand l'utilisateur est connecté (non admin)", () => {
    beforeEach(() => {
      (authService.isAuthenticated as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (authService.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue({
        id: 1,
        email: "user@test.com",
        firstName: "John",
        lastName: "Doe",
        admin: false,
      });
    });

    it("affiche le lien Sessions", () => {
      renderNavbar();
      expect(
        screen.getByRole("link", { name: /sessions/i }),
      ).toBeInTheDocument();
    });

    it("affiche le lien Profile", () => {
      renderNavbar();
      expect(
        screen.getByRole("link", { name: /profile/i }),
      ).toBeInTheDocument();
    });

    it("affiche le bouton Logout", () => {
      renderNavbar();
      expect(
        screen.getByRole("button", { name: /logout/i }),
      ).toBeInTheDocument();
    });

    it("n'affiche PAS le lien Create Session", () => {
      renderNavbar();
      expect(
        screen.queryByRole("link", { name: /create session/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Quand l'utilisateur est connecté ET admin", () => {
    beforeEach(() => {
      (authService.isAuthenticated as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (authService.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue({
        id: 1,
        email: "admin@test.com",
        firstName: "Admin",
        lastName: "User",
        admin: true,
      });
    });

    it("affiche le lien Create Session", () => {
      renderNavbar();
      expect(
        screen.getByRole("link", { name: /create session/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Action Logout", () => {
    beforeEach(() => {
      (authService.isAuthenticated as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (authService.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue({
        id: 1,
        email: "user@test.com",
        firstName: "John",
        lastName: "Doe",
        admin: false,
      });
    });

    it("appelle authService.logout() et redirige vers /login au clic", async () => {
      const user = userEvent.setup();
      renderNavbar();

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      await user.click(logoutButton);

      expect(authService.logout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });
});
