import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SessionForm from "./SessionForm";
import api from "../services/api";
import { authService } from "../services/auth.service";

const mockNavigate = vi.fn();
let mockParams: { id?: string } = {};

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

vi.mock("../services/api");
vi.mock("../services/auth.service", () => ({
  authService: {
    getCurrentUser: vi.fn(),
    getToken: vi.fn(() => "fake-token"),
  },
}));

describe("Page SessionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
    (authService.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue({
      id: 1,
      email: "admin@yoga.com",
      firstName: "Admin",
      lastName: "User",
      admin: true,
    });
  });

  const renderSessionForm = (initialRoute = "/sessions/create") => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/sessions/create" element={<SessionForm />} />
          <Route path="/sessions/edit/:id" element={<SessionForm />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  describe("Sécurité et Redirection", () => {
    it("redirige vers /sessions si l'utilisateur n'est pas admin", () => {
      (authService.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue({
        admin: false,
      });

      renderSessionForm();

      expect(mockNavigate).toHaveBeenCalledWith("/sessions");
    });
  });

  describe("Mode Création (Create)", () => {
    beforeEach(() => {
      mockParams = {};
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          { id: 1, firstName: "Margot", lastName: "Delahaye" },
          { id: 2, firstName: "David", lastName: "Martin" },
        ],
      });
    });

    it("affiche le formulaire vide et la liste des professeurs", async () => {
      renderSessionForm("/sessions/create");

      expect(
        screen.getByRole("heading", { name: /create new session/i }),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(
          screen.getByRole("option", { name: /margot delahaye/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("option", { name: /david martin/i }),
        ).toBeInTheDocument();
      });
    });

    it("soumet correctement le formulaire et redirige", async () => {
      const user = userEvent.setup();
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });

      renderSessionForm("/sessions/create");

      await waitFor(() =>
        screen.getByRole("option", { name: /margot delahaye/i }),
      );

      await user.type(screen.getByLabelText(/session name/i), "Yoga Vinyasa");
      await user.type(screen.getByLabelText(/date/i), "2024-12-01");
      await user.selectOptions(screen.getByLabelText(/teacher/i), "1");
      await user.type(screen.getByLabelText(/description/i), "Super cours");

      await user.click(screen.getByRole("button", { name: /create session/i }));

      expect(api.post).toHaveBeenCalledWith(
        "/session",
        {
          name: "Yoga Vinyasa",
          date: "2024-12-01",
          description: "Super cours",
          teacherId: 1,
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer fake-token",
          }),
        }),
      );

      expect(mockNavigate).toHaveBeenCalledWith("/sessions");
    });
  });

  describe("Mode Édition (Edit)", () => {
    beforeEach(() => {
      mockParams = { id: "42" };

      (api.get as ReturnType<typeof vi.fn>).mockImplementation(
        (url: string) => {
          if (url === "/teacher") {
            return Promise.resolve({
              data: [{ id: 1, firstName: "Margot", lastName: "Delahaye" }],
            });
          }
          if (url === "/session/42") {
            return Promise.resolve({
              data: {
                id: 42,
                name: "Yoga Hatha",
                date: "2024-11-15T10:00:00.000Z",
                description: "Cours doux",
                teacher: { id: 1, firstName: "Margot", lastName: "Delahaye" },
              },
            });
          }
        },
      );
    });

    it("pré-remplit le formulaire avec les données de la session", async () => {
      renderSessionForm("/sessions/edit/42");

      expect(
        screen.getByRole("heading", { name: /edit session/i }),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByLabelText(/session name/i)).toHaveValue(
          "Yoga Hatha",
        );
        expect(screen.getByLabelText(/date/i)).toHaveValue("2024-11-15");
        expect(screen.getByLabelText(/description/i)).toHaveValue("Cours doux");
        expect(screen.getByLabelText(/teacher/i)).toHaveValue("1");
      });
    });

    it("met à jour la session via PUT et redirige", async () => {
      const user = userEvent.setup();
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });

      renderSessionForm("/sessions/edit/42");

      await waitFor(() => screen.getByLabelText(/session name/i));

      await user.clear(screen.getByLabelText(/session name/i));
      await user.type(
        screen.getByLabelText(/session name/i),
        "Yoga Hatha Avancé",
      );

      await user.click(screen.getByRole("button", { name: /update session/i }));

      expect(api.put).toHaveBeenCalledWith(
        "/session/42",
        expect.objectContaining({
          name: "Yoga Hatha Avancé",
          teacherId: 1,
        }),
        expect.any(Object),
      );

      expect(mockNavigate).toHaveBeenCalledWith("/sessions");
    });
  });

  describe("Interactions UI et Erreurs", () => {
    beforeEach(() => {
      mockParams = {};
      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ id: 1, firstName: "Margot", lastName: "Delahaye" }],
      });
    });

    it("affiche un message d'erreur en cas d'échec de la sauvegarde", async () => {
      const user = userEvent.setup();
      (api.post as ReturnType<typeof vi.fn>).mockRejectedValue({
        isAxiosError: true,
        response: { data: { message: "Teacher not found" } },
      });

      renderSessionForm("/sessions/create");
      await waitFor(() =>
        screen.getByRole("option", { name: /margot delahaye/i }),
      );

      await user.type(screen.getByLabelText(/session name/i), "Test");
      await user.type(screen.getByLabelText(/date/i), "2024-12-01");
      await user.selectOptions(screen.getByLabelText(/teacher/i), "1");
      await user.type(screen.getByLabelText(/description/i), "Test desc");
      await user.click(screen.getByRole("button", { name: /create session/i }));

      expect(await screen.findByText("Teacher not found")).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("le bouton Cancel redirige vers /sessions", async () => {
      const user = userEvent.setup();
      renderSessionForm("/sessions/create");

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(mockNavigate).toHaveBeenCalledWith("/sessions");
    });
  });
});
