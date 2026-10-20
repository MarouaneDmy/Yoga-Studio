import { describe, expect, it, vi } from "vitest";
import { userService } from "../services/user.service";
import { expectNextAppError, runHandler } from "../test/helpers";
import { AppError } from "../utils/AppError";
import { userController } from "./user.controller";

vi.mock("../services/user.service", () => ({
  userService: {
    getById: vi.fn(),
    delete: vi.fn(),
    promoteSelfToAdmin: vi.fn(),
  },
}));

const getById = vi.mocked(userService.getById);
const remove = vi.mocked(userService.delete);
const promote = vi.mocked(userService.promoteSelfToAdmin);

const user = {
  id: 1,
  email: "john@yoga.com",
  firstName: "John",
  lastName: "Doe",
  admin: false,
} as never;

describe("UserController", () => {
  describe("getById", () => {
    it("convertit l'id en nombre et répond 200 avec l'utilisateur", async () => {
      getById.mockResolvedValue(user);

      const { res, next } = await runHandler(userController.getById, {
        params: { id: "1" },
      });

      expect(getById).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(user);
      expect(next).not.toHaveBeenCalled();
    });

    it("rejette en 400 quand l'id est absent", async () => {
      const { next } = await runHandler(userController.getById, {
        params: { id: "" },
      });

      expectNextAppError(next, 400, "User ID is required");
      expect(getById).not.toHaveBeenCalled();
    });

    it("rejette en 400 quand l'id n'est pas un nombre", async () => {
      const { next } = await runHandler(userController.getById, {
        params: { id: "abc" },
      });

      expectNextAppError(next, 400, "Invalid user ID");
      expect(getById).not.toHaveBeenCalled();
    });

    it("transmet le 404 du service à next()", async () => {
      getById.mockRejectedValue(new AppError("User not found", 404));

      const { next } = await runHandler(userController.getById, {
        params: { id: "999" },
      });

      expectNextAppError(next, 404, "User not found");
    });
  });

  describe("delete", () => {
    it("supprime avec l'id du paramètre et l'utilisateur authentifié, puis répond 200", async () => {
      remove.mockResolvedValue(undefined);

      const { res, next } = await runHandler(userController.delete, {
        params: { id: "1" },
        userId: 1,
      });

      expect(remove).toHaveBeenCalledWith(1, 1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "User deleted successfully",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("rejette en 400 quand l'id est absent", async () => {
      const { next } = await runHandler(userController.delete, {
        params: { id: "" },
        userId: 1,
      });

      expectNextAppError(next, 400, "User ID is required");
      expect(remove).not.toHaveBeenCalled();
    });

    it("rejette en 400 quand l'id n'est pas un nombre", async () => {
      const { next } = await runHandler(userController.delete, {
        params: { id: "abc" },
        userId: 1,
      });

      expectNextAppError(next, 400, "Invalid user ID");
      expect(remove).not.toHaveBeenCalled();
    });

    it("transmet le 403 du service à next() sans répondre", async () => {
      remove.mockRejectedValue(
        new AppError("You can only delete your own account", 403),
      );

      const { res, next } = await runHandler(userController.delete, {
        params: { id: "2" },
        userId: 1,
      });

      expectNextAppError(next, 403, "You can only delete your own account");
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("promoteSelfToAdmin", () => {
    it("promeut l'utilisateur authentifié et répond 200", async () => {
      const admin = { ...(user as object), admin: true } as never;
      promote.mockResolvedValue(admin);

      const { res, next } = await runHandler(
        userController.promoteSelfToAdmin,
        { userId: 1 },
      );

      expect(promote).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(admin);
      expect(next).not.toHaveBeenCalled();
    });

    it("transmet le 403 du service (hors développement) à next()", async () => {
      promote.mockRejectedValue(
        new AppError(
          "Admin self-promotion is only available in development",
          403,
        ),
      );

      const { res, next } = await runHandler(
        userController.promoteSelfToAdmin,
        { userId: 1 },
      );

      expectNextAppError(
        next,
        403,
        "Admin self-promotion is only available in development",
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
