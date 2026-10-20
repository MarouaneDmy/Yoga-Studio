import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Sessions from "./Sessions";
import { useFetch } from "../hooks/useFetch";
import { authService } from "../services/auth.service";
import api from "../services/api";

vi.mock("../hooks/useFetch");

vi.mock("../services/auth.service", () => ({
  authService: {
    getCurrentUser: vi.fn(),
    getToken: vi.fn(() => "fake-token"),
  },
}));

vi.mock("../services/api");

const mockSessions = [
  {
    id: 1,
    name: "Yoga Vinyasa",
    date: "2024-12-01T10:00:00.000Z",
    description: "A dynamic class",
    teacher: { id: 1, firstName: "Margot", lastName: "Delahaye" },
    users: [2, 3],
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
  {
    id: 2,
    name: "Yoga Hatha",
    date: "2024-12-05T14:00:00.000Z",
    description: "A gentle class",
    teacher: { id: 2, firstName: "David", lastName: "Martin" },
    users: [1],
    createdAt: "2024-01-02",
    updatedAt: "2024-01-02",
  },
];

describe("Page Sessions", () => {
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFetch).mockReturnValue({
      data: mockSessions,
      loading: false,
      error: "",
      refetch: mockRefetch,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderSessions = () => {
    return render(
      <MemoryRouter>
        <Sessions />
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

      renderSessions();
      expect(screen.getByText(/loading sessions/i)).toBeInTheDocument();
    });

    it("affiche un message d'erreur si le hook renvoie une erreur", () => {
      vi.mocked(useFetch).mockReturnValue({
        data: null,
        loading: false,
        error: "Failed to load sessions",
        refetch: mockRefetch,
      });

      renderSessions();
      expect(screen.getByText(/failed to load sessions/i)).toBeInTheDocument();
    });
  });

  describe("Liste vide", () => {
    beforeEach(() => {
      vi.mocked(useFetch).mockReturnValue({
        data: [],
        loading: false,
        error: "",
        refetch: mockRefetch,
      });
      vi.mocked(authService.getCurrentUser).mockReturnValue({
        id: 1,
        email: "user@test.com",
        firstName: "John",
        lastName: "Doe",
        admin: false,
      });
    });

    it("affiche 'No sessions available' quand la liste est vide", () => {
      renderSessions();
      expect(screen.getByText(/no sessions available/i)).toBeInTheDocument();
    });

    it("n'affiche pas le bouton Create Session pour un utilisateur non-admin", () => {
      renderSessions();
      expect(
        screen.queryByRole("link", { name: /create session/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Affichage pour un Utilisateur Standard", () => {
    beforeEach(() => {
      vi.mocked(authService.getCurrentUser).mockReturnValue({
        id: 1,
        email: "user@test.com",
        firstName: "John",
        lastName: "Doe",
        admin: false,
      });
    });

    it("affiche toutes les sessions avec leurs détails", () => {
      renderSessions();

      expect(
        screen.getByRole("heading", { name: /yoga vinyasa/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /yoga hatha/i }),
      ).toBeInTheDocument();

      expect(screen.getByText(/margot delahaye/i)).toBeInTheDocument();
      expect(screen.getByText(/participants: 2/i)).toBeInTheDocument();
      expect(screen.getByText(/a dynamic class/i)).toBeInTheDocument();

      expect(screen.getByText(/david martin/i)).toBeInTheDocument();
      expect(screen.getByText(/participants: 1/i)).toBeInTheDocument();
      expect(screen.getByText(/a gentle class/i)).toBeInTheDocument();
    });

    it("affiche les liens View Details pour chaque session", () => {
      renderSessions();

      const viewDetailsLinks = screen.getAllByRole("link", {
        name: /view details/i,
      });
      expect(viewDetailsLinks).toHaveLength(2);

      expect(viewDetailsLinks[0]).toHaveAttribute("href", "/sessions/1");
      expect(viewDetailsLinks[1]).toHaveAttribute("href", "/sessions/2");
    });

    it("n'affiche PAS le bouton Create Session", () => {
      renderSessions();
      expect(
        screen.queryByRole("link", { name: /create session/i }),
      ).not.toBeInTheDocument();
    });

    it("n'affiche PAS les boutons Delete sur les cartes", () => {
      renderSessions();
      expect(screen.queryAllByRole("button", { name: /delete/i })).toHaveLength(
        0,
      );
    });
  });

  describe("Affichage pour un Administrateur", () => {
    beforeEach(() => {
      vi.mocked(authService.getCurrentUser).mockReturnValue({
        id: 1,
        email: "admin@test.com",
        firstName: "Admin",
        lastName: "User",
        admin: true,
      });
    });

    it("affiche le bouton Create Session", () => {
      renderSessions();
      expect(
        screen.getByRole("link", { name: /create session/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /create session/i }),
      ).toHaveAttribute("href", "/sessions/create");
    });

    it("affiche les boutons Delete sur chaque carte", () => {
      renderSessions();
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      expect(deleteButtons).toHaveLength(2);
    });

    it("supprime une session et refetch après confirmation", async () => {
      const user = userEvent.setup();
      vi.mocked(api.delete).mockResolvedValue({ data: {} });
      vi.spyOn(window, "confirm").mockReturnValue(true);

      renderSessions();

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith(
        "Are you sure you want to delete this session?",
      );
      expect(api.delete).toHaveBeenCalledWith("/session/1", {
        headers: { Authorization: "Bearer fake-token" },
      });
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it("n'appelle PAS l'API si l'utilisateur annule la suppression", async () => {
      const user = userEvent.setup();
      vi.spyOn(window, "confirm").mockReturnValue(false);

      renderSessions();

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(api.delete).not.toHaveBeenCalled();
      expect(mockRefetch).not.toHaveBeenCalled();
    });
  });

  describe("Gestion des erreurs de suppression", () => {
    beforeEach(() => {
      vi.mocked(authService.getCurrentUser).mockReturnValue({
        id: 1,
        email: "admin@test.com",
        firstName: "Admin",
        lastName: "User",
        admin: true,
      });
    });

    it("affiche une alerte si la suppression échoue", async () => {
      const user = userEvent.setup();
      vi.mocked(api.delete).mockRejectedValue(new Error("Network error"));
      vi.spyOn(window, "confirm").mockReturnValue(true);

      const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

      renderSessions();

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(alertMock).toHaveBeenCalledWith("Failed to delete session");
      expect(mockRefetch).not.toHaveBeenCalled();

      alertMock.mockRestore();
    });
  });
});
