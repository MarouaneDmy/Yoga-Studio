import { describe, expect, it, vi } from "vitest";
import { teacherService } from "../services/teacher.service";
import { expectNextAppError, runHandler } from "../test/helpers";
import { AppError } from "../utils/AppError";
import { teacherController } from "./teacher.controller";

vi.mock("../services/teacher.service", () => ({
  teacherService: { getAll: vi.fn(), getById: vi.fn() },
}));

const getAll = vi.mocked(teacherService.getAll);
const getById = vi.mocked(teacherService.getById);

const teacher = {
  id: 1,
  firstName: "Margot",
  lastName: "Delahaye",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
};

describe("TeacherController", () => {
  describe("getAll", () => {
    it("répond 200 avec la liste des professeurs", async () => {
      getAll.mockResolvedValue([teacher]);

      const { res, next } = await runHandler(teacherController.getAll);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([teacher]);
      expect(next).not.toHaveBeenCalled();
    });

    it("transmet l'erreur du service à next()", async () => {
      const error = new Error("db down");
      getAll.mockRejectedValue(error);

      const { res, next } = await runHandler(teacherController.getAll);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getById", () => {
    it("convertit l'id en nombre et répond 200", async () => {
      getById.mockResolvedValue(teacher);

      const { res, next } = await runHandler(teacherController.getById, {
        params: { id: "1" },
      });

      expect(getById).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(teacher);
      expect(next).not.toHaveBeenCalled();
    });

    it("rejette en 400 quand l'id est absent", async () => {
      const { next } = await runHandler(teacherController.getById, {
        params: { id: "" },
      });

      expectNextAppError(next, 400, "Teacher ID is required");
      expect(getById).not.toHaveBeenCalled();
    });

    it("rejette en 400 quand l'id n'est pas un nombre", async () => {
      const { next } = await runHandler(teacherController.getById, {
        params: { id: "abc" },
      });

      expectNextAppError(next, 400, "Invalid teacher ID");
      expect(getById).not.toHaveBeenCalled();
    });

    it("transmet le 404 du service à next()", async () => {
      getById.mockRejectedValue(new AppError("Teacher not found", 404));

      const { next } = await runHandler(teacherController.getById, {
        params: { id: "999" },
      });

      expectNextAppError(next, 404, "Teacher not found");
    });
  });
});
