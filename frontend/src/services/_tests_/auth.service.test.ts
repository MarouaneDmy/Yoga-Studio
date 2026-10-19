import { describe, it, expect, vi, beforeEach } from "vitest";
import { authService } from "../auth.service";
import api from "../api";

vi.mock("../api");

describe("authService", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("stocke le token et l'utilisateur dans localStorage après une connexion réussie", async () => {
      const mockResponse = {
        data: {
          id: 1,
          email: "test@test.com",
          firstName: "John",
          lastName: "Doe",
          admin: false,
          token: "fake-jwt-token",
        },
      };
      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await authService.login({
        email: "test@test.com",
        password: "password",
      });

      expect(localStorage.getItem("token")).toBe("fake-jwt-token");
      expect(localStorage.getItem("user")).toBe(
        JSON.stringify(mockResponse.data),
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("register", () => {
    it("crée un utilisateur et stocke le token", async () => {
      const mockResponse = {
        data: {
          id: 2,
          email: "new@test.com",
          firstName: "Jane",
          lastName: "Doe",
          admin: false,
          token: "new-jwt-token",
        },
      };
      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await authService.register({
        email: "new@test.com",
        password: "password",
        firstName: "Jane",
        lastName: "Doe",
      });

      expect(localStorage.getItem("token")).toBe("new-jwt-token");
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("logout", () => {
    it("supprime le token et l'utilisateur du localStorage", () => {
      localStorage.setItem("token", "fake-token");
      localStorage.setItem("user", JSON.stringify({ id: 1 }));

      authService.logout();

      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
    });
  });

  describe("getCurrentUser", () => {
    it("retourne l'utilisateur depuis localStorage", () => {
      const mockUser = { id: 1, email: "test@test.com", admin: false };
      localStorage.setItem("user", JSON.stringify(mockUser));

      const user = authService.getCurrentUser();

      expect(user).toEqual(mockUser);
    });

    it("retourne null si aucun utilisateur dans localStorage", () => {
      const user = authService.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe("isAuthenticated", () => {
    it("retourne true si un token existe", () => {
      localStorage.setItem("token", "fake-token");
      expect(authService.isAuthenticated()).toBe(true);
    });

    it("retourne false si aucun token", () => {
      expect(authService.isAuthenticated()).toBe(false);
    });
  });
});
