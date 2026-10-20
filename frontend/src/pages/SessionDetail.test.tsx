import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SessionDetail from "./SessionDetail";
import { useFetch } from "../hooks/useFetch";
import { authService } from "../services/auth.service";
import api from "../services/api";

const mockNavigate = vi.fn();
let mockParams = { id: "1" };

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

vi.mock("../hooks/useFetch");

vi.mock("../services/auth.service", () => ({
  authService: {
    getCurrentUser: vi.fn(),
    getToken: vi.fn(() => "fake-token"),
  },
}));

vi.mock("../services/api");

const mockSession = {
  id: 1,
  name: "Yoga Vinyasa",
  date: "2024-12-01T10:00:00.000Z",
  description: "A dynamic class",
  teacher: { id: 1, firstName: "Margot", lastName: "Delahaye" },
  users: [2, 3],
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

describe("Page SessionDetail", () => {
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: "1" };

    vi.mocked(useFetch).mockReturnValue({
      data: mockSession,
      loading: false,
      error: "",
      refetch: mockRefetch,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderSessionDetail = () => {
    return render(
      <MemoryRouter initialEntries={[`/sessions/${mockParams.id}`]}>
        <Routes>
          <Route path="/sessions/:id" element={<SessionDetail />} />
        </Routes>
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

      renderSessionDetail();
      expect(screen.getByText(/loading session/i)).toBeInTheDocument();
    });

    it("affiche un message d'erreur si le hook renvoie une erreur", () => {
      vi.mocked(useFetch).mockReturnValue({
        data: null,
        loading: false,
        error: "Session not found",
        refetch: mockRefetch,
      });

      renderSessionDetail();
      expect(screen.getByText(/session not found/i)).toBeInTheDocument();
    });
  });

  describe("Affichage pour un Utilisateur Standard (Non participant)", () => {
    beforeEach(() => {
      vi.mocked(authService.getCurrentUser).mockReturnValue({
        id: 1,
        email: "user@test.com",
        firstName: "John",
        lastName: "Doe",
        admin: false,
      });
    });

    it("affiche les détails de la session et le bouton Join", () => {
      renderSessionDetail();

      expect(
        screen.getByRole("heading", { name: /yoga vinyasa/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/margot delahaye/i)).toBeInTheDocument();
      expect(
        screen.getByText((content, element) => {
          return (
            element?.tagName.toLowerCase() === "p" &&
            element?.textContent?.includes("Participants:") &&
            element?.textContent?.includes("2")
          );
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /join session/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /leave session/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /edit/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /delete/i }),
      ).not.toBeInTheDocument();
    });

    it("appelle l'API et refetch lors du clic sur Join", async () => {
      const user = userEvent.setup();
      vi.mocked(api.post).mockResolvedValue({ data: {} });

      renderSessionDetail();

      await user.click(screen.getByRole("button", { name: /join session/i }));

      expect(api.post).toHaveBeenCalledWith(
        "/session/1/participate/1",
        {},
        { headers: { Authorization: "Bearer fake-token" } },
      );
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Affichage pour un Utilisateur Standard (Déjà participant)", () => {
    beforeEach(() => {
      vi.mocked(authService.getCurrentUser).mockReturnValue({
        id: 2,
        email: "user@test.com",
        firstName: "John",
        lastName: "Doe",
        admin: false,
      });
    });

    it("affiche le bouton Leave Session au lieu de Join", () => {
      renderSessionDetail();

      expect(
        screen.getByRole("button", { name: /leave session/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /join session/i }),
      ).not.toBeInTheDocument();
    });

    it("appelle l'API et refetch lors du clic sur Leave", async () => {
      const user = userEvent.setup();
      vi.mocked(api.delete).mockResolvedValue({ data: {} });

      renderSessionDetail();

      await user.click(screen.getByRole("button", { name: /leave session/i }));

      expect(api.delete).toHaveBeenCalledWith("/session/1/participate/2", {
        headers: { Authorization: "Bearer fake-token" },
      });
      expect(mockRefetch).toHaveBeenCalledTimes(1);
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

    it("affiche les boutons Edit et Delete, mais pas Join/Leave", () => {
      renderSessionDetail();

      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /delete/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /join session/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /leave session/i }),
      ).not.toBeInTheDocument();
    });

    it("supprime la session et redirige après confirmation", async () => {
      const user = userEvent.setup();
      vi.mocked(api.delete).mockResolvedValue({ data: {} });

      vi.spyOn(window, "confirm").mockReturnValue(true);

      renderSessionDetail();

      await user.click(screen.getByRole("button", { name: /delete/i }));

      expect(window.confirm).toHaveBeenCalledWith(
        "Are you sure you want to delete this session?",
      );
      expect(api.delete).toHaveBeenCalledWith("/session/1", {
        headers: { Authorization: "Bearer fake-token" },
      });
      expect(mockNavigate).toHaveBeenCalledWith("/sessions");
    });

    it("n'appelle PAS l'API si l'utilisateur annule la suppression", async () => {
      const user = userEvent.setup();
      vi.spyOn(window, "confirm").mockReturnValue(false);

      renderSessionDetail();

      await user.click(screen.getByRole("button", { name: /delete/i }));

      expect(api.delete).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Navigation commune", () => {
    it("le bouton Back to Sessions redirige vers /sessions", async () => {
      const user = userEvent.setup();
      vi.mocked(authService.getCurrentUser).mockReturnValue({
        id: 1,
        email: "user@test.com",
        firstName: "John",
        lastName: "Doe",
        admin: false,
      });

      renderSessionDetail();

      await user.click(
        screen.getByRole("button", { name: /back to sessions/i }),
      );
      expect(mockNavigate).toHaveBeenCalledWith("/sessions");
    });
  });
});
