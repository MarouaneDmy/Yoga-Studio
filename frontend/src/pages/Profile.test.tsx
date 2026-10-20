import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Profile from "./Profile";
import { useFetch } from "../hooks/useFetch";
import { authService } from "../services/auth.service";
import api from "../services/api";

vi.mock("../hooks/useFetch");

vi.mock("../services/auth.service", () => ({
  authService: {
    getCurrentUser: vi.fn(),
    getToken: vi.fn(() => "fake-token"),
    logout: vi.fn(),
    updateCurrentUser: vi.fn(),
  },
}));

vi.mock("../services/api");

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUser = {
  id: 1,
  email: "john@yoga.com",
  firstName: "John",
  lastName: "Doe",
  admin: false,
  createdAt: "2024-01-15T10:00:00.000Z",
  updatedAt: "2024-01-15T10:00:00.000Z",
};

const mockAdminUser = {
  ...mockUser,
  id: 2,
  email: "admin@yoga.com",
  firstName: "Admin",
  lastName: "Smith",
  admin: true,
};

describe("Page Profile", () => {
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authService.getCurrentUser).mockReturnValue(mockUser);

    vi.mocked(useFetch).mockReturnValue({
      data: mockUser,
      loading: false,
      error: "",
      refetch: mockRefetch,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  const renderProfile = () => {
    return render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
  };

  describe("États de chargement et d'erreur", () => {
    it("affiche un indicateur de chargement", () => {
      vi.mocked(useFetch).mockReturnValue({
        data: null,
        loading: true,
        error: "",
        refetch: mockRefetch,
      });

      renderProfile();
      expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
    });

    it("affiche 'Profile not found' si les données sont null (même avec une erreur)", () => {
      vi.mocked(useFetch).mockReturnValue({
        data: null,
        loading: false,
        error: "Failed to load profile",
        refetch: mockRefetch,
      });

      renderProfile();
      expect(screen.getByText(/profile not found/i)).toBeInTheDocument();
    });
  });

  describe("Affichage du profil pour un utilisateur standard", () => {
    it("affiche toutes les informations du profil", () => {
      renderProfile();

      expect(
        screen.getByRole("heading", { name: /my profile/i }),
      ).toBeInTheDocument();

      expect(screen.getByText("John")).toBeInTheDocument();
      expect(screen.getByText("Doe")).toBeInTheDocument();
      expect(screen.getByText("john@yoga.com")).toBeInTheDocument();
      expect(screen.getByText("User")).toBeInTheDocument();
      expect(screen.getByText(/january 15, 2024/i)).toBeInTheDocument();
    });

    it("n'affiche PAS le badge Administrator", () => {
      renderProfile();
      expect(screen.queryByText(/administrator/i)).not.toBeInTheDocument();
    });
  });

  describe("Affichage du profil pour un administrateur", () => {
    beforeEach(() => {
      vi.mocked(authService.getCurrentUser).mockReturnValue(mockAdminUser);
      vi.mocked(useFetch).mockReturnValue({
        data: mockAdminUser,
        loading: false,
        error: "",
        refetch: mockRefetch,
      });
    });

    it("affiche le badge Administrator", () => {
      renderProfile();
      expect(screen.getByText(/administrator/i)).toBeInTheDocument();
      expect(
        screen.queryByText("User", { exact: true }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Bouton Promote to Admin (mode dev uniquement)", () => {
    beforeEach(() => {
      vi.stubEnv("DEV", true);
    });

    it("affiche le bouton Promote to Admin en mode dev pour les non-admins", () => {
      renderProfile();
      expect(
        screen.getByRole("button", { name: /promote to admin/i }),
      ).toBeInTheDocument();
    });

    it("n'affiche PAS le bouton Promote to Admin pour les admins même en mode dev", () => {
      vi.mocked(authService.getCurrentUser).mockReturnValue(mockAdminUser);
      vi.mocked(useFetch).mockReturnValue({
        data: mockAdminUser,
        loading: false,
        error: "",
        refetch: mockRefetch,
      });

      renderProfile();
      expect(
        screen.queryByRole("button", { name: /promote to admin/i }),
      ).not.toBeInTheDocument();
    });

    it("appelle l'API et refetch lors du clic sur Promote to Admin", async () => {
      const user = userEvent.setup();
      const mockResponse = { data: { admin: true } };
      vi.mocked(api.post).mockResolvedValue(mockResponse);

      renderProfile();

      await user.click(
        screen.getByRole("button", { name: /promote to admin/i }),
      );

      expect(api.post).toHaveBeenCalledWith(
        "/user/promote-admin",
        {},
        { headers: { Authorization: "Bearer fake-token" } },
      );
      expect(authService.updateCurrentUser).toHaveBeenCalledWith({
        admin: true,
      });
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it("affiche un message d'erreur si la promotion échoue", async () => {
      const user = userEvent.setup();
      vi.mocked(api.post).mockRejectedValue(new Error("Server error"));

      renderProfile();

      await user.click(
        screen.getByRole("button", { name: /promote to admin/i }),
      );

      expect(
        await screen.findByText(/failed to promote to admin/i),
      ).toBeInTheDocument();
    });

    it("désactive le bouton et affiche 'Promoting...' pendant la requête", async () => {
      const user = userEvent.setup();
      vi.mocked(api.post).mockImplementation(() => new Promise(() => {}));

      renderProfile();

      await user.click(
        screen.getByRole("button", { name: /promote to admin/i }),
      );

      const promotingButton = screen.getByRole("button", {
        name: /promoting/i,
      });
      expect(promotingButton).toBeDisabled();
    });
  });

  describe("Action Delete Account", () => {
    it("supprime le compte et redirige vers /login après confirmation", async () => {
      const user = userEvent.setup();
      vi.mocked(api.delete).mockResolvedValue({ data: {} });
      vi.spyOn(window, "confirm").mockReturnValue(true);

      renderProfile();

      await user.click(screen.getByRole("button", { name: /delete account/i }));

      expect(window.confirm).toHaveBeenCalledWith(
        "Are you sure you want to delete your account? This action cannot be undone.",
      );
      expect(api.delete).toHaveBeenCalledWith("/user/1", {
        headers: { Authorization: "Bearer fake-token" },
      });
      expect(authService.logout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });

    it("n'appelle PAS l'API si l'utilisateur annule la suppression", async () => {
      const user = userEvent.setup();
      vi.spyOn(window, "confirm").mockReturnValue(false);

      renderProfile();

      await user.click(screen.getByRole("button", { name: /delete account/i }));

      expect(api.delete).not.toHaveBeenCalled();
      expect(authService.logout).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("affiche une alerte si la suppression échoue", async () => {
      const user = userEvent.setup();
      vi.mocked(api.delete).mockRejectedValue(new Error("Network error"));
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

      renderProfile();

      await user.click(screen.getByRole("button", { name: /delete account/i }));

      expect(alertMock).toHaveBeenCalledWith("Failed to delete account");
      expect(authService.logout).not.toHaveBeenCalled();

      alertMock.mockRestore();
    });
  });

  describe("Navigation", () => {
    it("le bouton Back to Sessions redirige vers /sessions", async () => {
      const user = userEvent.setup();

      renderProfile();

      await user.click(
        screen.getByRole("button", { name: /back to sessions/i }),
      );
      expect(mockNavigate).toHaveBeenCalledWith("/sessions");
    });
  });
});
