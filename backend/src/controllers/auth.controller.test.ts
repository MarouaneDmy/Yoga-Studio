import { describe, expect, it, vi } from "vitest";
import { authService } from "../services/auth.service";
import { expectNextAppError, runHandler } from "../test/helpers";
import { AppError } from "../utils/AppError";
import { authController } from "./auth.controller";

vi.mock("../services/auth.service", () => ({
  authService: { login: vi.fn(), register: vi.fn() },
}));

const login = vi.mocked(authService.login);
const register = vi.mocked(authService.register);

const authResult = {
  id: 1,
  email: "john@yoga.com",
  firstName: "John",
  lastName: "Doe",
  admin: false,
  token: "jwt-token",
};

describe("AuthController", () => {
  describe("login", () => {
    it("appelle le service avec email et mot de passe puis répond 200", async () => {
      login.mockResolvedValue(authResult);

      const { res, next } = await runHandler(authController.login, {
        body: { email: "john@yoga.com", password: "password123" },
      });

      expect(login).toHaveBeenCalledWith("john@yoga.com", "password123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(authResult);
      expect(next).not.toHaveBeenCalled();
    });

    it("transmet l'erreur du service à next() sans répondre", async () => {
      login.mockRejectedValue(new AppError("Invalid credentials", 401));

      const { res, next } = await runHandler(authController.login, {
        body: { email: "john@yoga.com", password: "wrong" },
      });

      expectNextAppError(next, 401, "Invalid credentials");
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("register", () => {
    const body = {
      email: "john@yoga.com",
      password: "password123",
      firstName: "John",
      lastName: "Doe",
    };

    it("appelle le service avec les 4 champs dans l'ordre puis répond 201", async () => {
      register.mockResolvedValue(authResult);

      const { res, next } = await runHandler(authController.register, { body });

      expect(register).toHaveBeenCalledWith(
        "john@yoga.com",
        "password123",
        "John",
        "Doe",
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(authResult);
      expect(next).not.toHaveBeenCalled();
    });

    it("transmet l'erreur du service à next() sans répondre", async () => {
      register.mockRejectedValue(new AppError("Email already exists", 400));

      const { res, next } = await runHandler(authController.register, { body });

      expectNextAppError(next, 400, "Email already exists");
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
