import { describe, expect, it, vi } from "vitest";
import { prisma } from "../utils/prisma";
import { TeacherService } from "./teacher.service";
import { expectAppError } from "../test/helpers";

vi.mock("../utils/prisma", () => ({
  prisma: { teacher: { findMany: vi.fn(), findUnique: vi.fn() } },
}));

const findMany = vi.mocked(prisma.teacher.findMany);
const findUnique = vi.mocked(prisma.teacher.findUnique);

const createdAt = new Date("2026-01-01T10:00:00Z");
const updatedAt = new Date("2026-01-02T10:00:00Z");

const dbTeacher = (id: number, firstName: string, lastName: string) => ({
  id,
  firstName,
  lastName,
  createdAt,
  updatedAt,
  internalField: "ne doit pas être exposé", // vérifie que le mapping filtre
});

const publicTeacher = (id: number, firstName: string, lastName: string) => ({
  id,
  firstName,
  lastName,
  createdAt,
  updatedAt,
});

describe("TeacherService", () => {
  const service = new TeacherService();

  describe("getAll", () => {
    it("trie par date de création décroissante", async () => {
      findMany.mockResolvedValue([]);

      await service.getAll();

      expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } });
    });

    it("retourne les professeurs mappés (champs publics uniquement)", async () => {
      findMany.mockResolvedValue([
        dbTeacher(1, "Margot", "Delahaye"),
        dbTeacher(2, "Hélène", "Thiercelin"),
      ] as never);

      const result = await service.getAll();

      expect(result).toEqual([
        publicTeacher(1, "Margot", "Delahaye"),
        publicTeacher(2, "Hélène", "Thiercelin"),
      ]);
    });

    it("retourne un tableau vide s'il n'y a aucun professeur", async () => {
      findMany.mockResolvedValue([]);

      await expect(service.getAll()).resolves.toEqual([]);
    });
  });

  describe("getById", () => {
    it("retourne le professeur mappé", async () => {
      findUnique.mockResolvedValue(dbTeacher(1, "Margot", "Delahaye") as never);

      const result = await service.getById(1);

      expect(findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(publicTeacher(1, "Margot", "Delahaye"));
    });

    it("rejette en 404 si le professeur n'existe pas", async () => {
      findUnique.mockResolvedValue(null);

      await expectAppError(service.getById(999), 404, "Teacher not found");
    });
  });
});
