import { describe, expect, it, vi } from "vitest";
import { prisma } from "../utils/prisma";
import { SessionService } from "./session.service";
import { expectAppError } from "../test/helpers";

vi.mock("../utils/prisma", () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: { findUnique: vi.fn() },
    teacher: { findUnique: vi.fn() },
    sessionParticipation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const sessionFindMany = vi.mocked(prisma.session.findMany);
const sessionFindUnique = vi.mocked(prisma.session.findUnique);
const sessionCreate = vi.mocked(prisma.session.create);
const sessionUpdate = vi.mocked(prisma.session.update);
const sessionDelete = vi.mocked(prisma.session.delete);
const userFindUnique = vi.mocked(prisma.user.findUnique);
const teacherFindUnique = vi.mocked(prisma.teacher.findUnique);
const participationFindUnique = vi.mocked(
  prisma.sessionParticipation.findUnique,
);
const participationCreate = vi.mocked(prisma.sessionParticipation.create);
const participationDelete = vi.mocked(prisma.sessionParticipation.delete);

const createdAt = new Date("2026-01-01T10:00:00Z");
const updatedAt = new Date("2026-01-02T10:00:00Z");
const sessionDate = new Date("2026-12-01T00:00:00Z");

const dbTeacher = {
  id: 10,
  firstName: "Margot",
  lastName: "Delahaye",
  createdAt,
  updatedAt,
};

const dbSession = {
  id: 1,
  name: "Morning Flow",
  date: sessionDate,
  description: "Séance douce",
  teacherId: 10,
  teacher: dbTeacher,
  participants: [{ user: { id: 5 } }, { user: { id: 6 } }],
  createdAt,
  updatedAt,
};

const publicSession = {
  id: 1,
  name: "Morning Flow",
  date: sessionDate,
  description: "Séance douce",
  teacher: { id: 10, firstName: "Margot", lastName: "Delahaye" },
  users: [5, 6],
  createdAt,
  updatedAt,
};

const asAdmin = () =>
  userFindUnique.mockResolvedValue({ id: 99, admin: true } as never);

const compositeKey = (sessionId: number, userId: number) => ({
  where: { sessionId_userId: { sessionId, userId } },
});

describe("SessionService", () => {
  const service = new SessionService();

  describe("getAll", () => {
    it("trie par date croissante et inclut professeur et participants", async () => {
      sessionFindMany.mockResolvedValue([]);

      await service.getAll();

      expect(sessionFindMany).toHaveBeenCalledWith({
        include: {
          teacher: true,
          participants: { include: { user: true } },
        },
        orderBy: { date: "asc" },
      });
    });

    it("retourne les sessions mappées (professeur réduit, users = ids)", async () => {
      sessionFindMany.mockResolvedValue([dbSession] as never);

      await expect(service.getAll()).resolves.toEqual([publicSession]);
    });

    it("retourne un tableau vide s'il n'y a aucune session", async () => {
      sessionFindMany.mockResolvedValue([]);

      await expect(service.getAll()).resolves.toEqual([]);
    });
  });

  describe("getById", () => {
    it("retourne la session mappée", async () => {
      sessionFindUnique.mockResolvedValue(dbSession as never);

      const result = await service.getById(1);

      expect(sessionFindUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { teacher: true, participants: { include: { user: true } } },
      });
      expect(result).toEqual(publicSession);
    });

    it("rejette en 404 si la session n'existe pas", async () => {
      sessionFindUnique.mockResolvedValue(null);

      await expectAppError(service.getById(999), 404, "Session non trouvée");
    });
  });

  describe("create", () => {
    const validData = {
      name: "Morning Flow",
      date: "2026-12-01",
      description: "Séance douce",
      teacherId: 10,
    };

    it.each(["name", "date", "description", "teacherId"] as const)(
      "rejette en 400 quand %s est manquant",
      async (field) => {
        await expectAppError(
          service.create({ ...validData, [field]: undefined }, 99),
          400,
          "Name, date, description, and teacherId are required",
        );
        expect(userFindUnique).not.toHaveBeenCalled();
      },
    );

    it.each([
      ["l'utilisateur n'existe pas", null],
      ["l'utilisateur n'est pas admin", { id: 99, admin: false }],
    ])("rejette en 403 quand %s", async (_label, user) => {
      userFindUnique.mockResolvedValue(user as never);

      await expectAppError(
        service.create(validData, 99),
        403,
        "Accès administrateur requis",
      );
      expect(teacherFindUnique).not.toHaveBeenCalled();
      expect(sessionCreate).not.toHaveBeenCalled();
    });

    it("rejette en 404 si le professeur n'existe pas", async () => {
      asAdmin();
      teacherFindUnique.mockResolvedValue(null);

      await expectAppError(
        service.create(validData, 99),
        404,
        "Professeur non trouvé",
      );
      expect(teacherFindUnique).toHaveBeenCalledWith({ where: { id: 10 } });
      expect(sessionCreate).not.toHaveBeenCalled();
    });

    it("crée la session (date convertie) et retourne users vide", async () => {
      asAdmin();
      teacherFindUnique.mockResolvedValue(dbTeacher as never);
      sessionCreate.mockResolvedValue({
        ...dbSession,
        participants: [],
      } as never);

      const result = await service.create(validData, 99);

      expect(sessionCreate).toHaveBeenCalledWith({
        data: {
          name: "Morning Flow",
          date: new Date("2026-12-01"),
          description: "Séance douce",
          teacherId: 10,
        },
        include: { teacher: true, participants: true },
      });
      expect(result).toEqual({ ...publicSession, users: [] });
    });
  });

  describe("update", () => {
    it.each([
      ["l'utilisateur n'existe pas", null],
      ["l'utilisateur n'est pas admin", { id: 99, admin: false }],
    ])("rejette en 403 quand %s", async (_label, user) => {
      userFindUnique.mockResolvedValue(user as never);

      await expectAppError(
        service.update(1, { name: "X" }, 99),
        403,
        "Accès administrateur requis",
      );
      expect(sessionFindUnique).not.toHaveBeenCalled();
    });

    it("rejette en 404 si la session n'existe pas", async () => {
      asAdmin();
      sessionFindUnique.mockResolvedValue(null);

      await expectAppError(
        service.update(1, { name: "X" }, 99),
        404,
        "Session non trouvée",
      );
      expect(sessionUpdate).not.toHaveBeenCalled();
    });

    it("rejette en 404 si le nouveau professeur n'existe pas", async () => {
      asAdmin();
      sessionFindUnique.mockResolvedValue(dbSession as never);
      teacherFindUnique.mockResolvedValue(null);

      await expectAppError(
        service.update(1, { teacherId: 404 }, 99),
        404,
        "Professeur non trouvé",
      );
      expect(sessionUpdate).not.toHaveBeenCalled();
    });

    it("n'écrit rien et retourne la session si aucun champ n'est fourni", async () => {
      asAdmin();
      sessionFindUnique.mockResolvedValue(dbSession as never);

      const result = await service.update(1, {}, 99);

      expect(sessionUpdate).not.toHaveBeenCalled();
      expect(result).toEqual(publicSession);
    });

    it("met à jour uniquement les champs fournis", async () => {
      asAdmin();
      sessionFindUnique.mockResolvedValue(dbSession as never);
      sessionUpdate.mockResolvedValue({
        ...dbSession,
        name: "New name",
      } as never);

      const result = await service.update(1, { name: "New name" }, 99);

      expect(sessionUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: "New name" },
        include: { teacher: true, participants: { include: { user: true } } },
      });
      expect(teacherFindUnique).not.toHaveBeenCalled();
      expect(result).toEqual({ ...publicSession, name: "New name" });
    });

    it("met à jour tous les champs, avec conversion de la date et vérification du professeur", async () => {
      asAdmin();
      sessionFindUnique.mockResolvedValue(dbSession as never);
      teacherFindUnique.mockResolvedValue({ ...dbTeacher, id: 11 } as never);
      sessionUpdate.mockResolvedValue(dbSession as never);

      await service.update(
        1,
        {
          name: "New",
          date: "2027-01-15",
          description: "Nouvelle description",
          teacherId: 11,
        },
        99,
      );

      expect(teacherFindUnique).toHaveBeenCalledWith({ where: { id: 11 } });
      expect(sessionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: {
            name: "New",
            date: new Date("2027-01-15"),
            description: "Nouvelle description",
            teacherId: 11,
          },
        }),
      );
    });
  });

  describe("delete", () => {
    it.each([
      ["l'utilisateur n'existe pas", null],
      ["l'utilisateur n'est pas admin", { id: 99, admin: false }],
    ])("rejette en 403 quand %s", async (_label, user) => {
      userFindUnique.mockResolvedValue(user as never);

      await expectAppError(
        service.delete(1, 99),
        403,
        "Accès administrateur requis",
      );
      expect(sessionDelete).not.toHaveBeenCalled();
    });

    it("rejette en 404 si la session n'existe pas", async () => {
      asAdmin();
      sessionFindUnique.mockResolvedValue(null);

      await expectAppError(service.delete(1, 99), 404, "Session non trouvée");
      expect(sessionDelete).not.toHaveBeenCalled();
    });

    it("supprime la session", async () => {
      asAdmin();
      sessionFindUnique.mockResolvedValue(dbSession as never);
      sessionDelete.mockResolvedValue(dbSession as never);

      await expect(service.delete(1, 99)).resolves.toBeUndefined();
      expect(sessionDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe("participate", () => {
    it("rejette en 404 si la session n'existe pas", async () => {
      sessionFindUnique.mockResolvedValue(null);

      await expectAppError(
        service.participate(1, 5),
        404,
        "Session non trouvée",
      );
      expect(userFindUnique).not.toHaveBeenCalled();
    });

    it("rejette en 404 si l'utilisateur n'existe pas", async () => {
      sessionFindUnique.mockResolvedValue(dbSession as never);
      userFindUnique.mockResolvedValue(null);

      await expectAppError(
        service.participate(1, 5),
        404,
        "Utilisateur non trouvé",
      );
      expect(participationCreate).not.toHaveBeenCalled();
    });

    it("rejette en 400 si l'utilisateur participe déjà", async () => {
      sessionFindUnique.mockResolvedValue(dbSession as never);
      userFindUnique.mockResolvedValue({ id: 5 } as never);
      participationFindUnique.mockResolvedValue({
        sessionId: 1,
        userId: 5,
      } as never);

      await expectAppError(
        service.participate(1, 5),
        400,
        "L'utilisateur participe déjà à cette session",
      );
      expect(participationFindUnique).toHaveBeenCalledWith(compositeKey(1, 5));
      expect(participationCreate).not.toHaveBeenCalled();
    });

    it("inscrit l'utilisateur à la session", async () => {
      sessionFindUnique.mockResolvedValue(dbSession as never);
      userFindUnique.mockResolvedValue({ id: 5 } as never);
      participationFindUnique.mockResolvedValue(null);
      participationCreate.mockResolvedValue({
        sessionId: 1,
        userId: 5,
      } as never);

      await expect(service.participate(1, 5)).resolves.toBeUndefined();
      expect(participationCreate).toHaveBeenCalledWith({
        data: { sessionId: 1, userId: 5 },
      });
    });
  });

  describe("unparticipate", () => {
    it("rejette en 404 si la participation n'existe pas", async () => {
      participationFindUnique.mockResolvedValue(null);

      await expectAppError(
        service.unparticipate(1, 5),
        404,
        "Participation non trouvée",
      );
      expect(participationDelete).not.toHaveBeenCalled();
    });

    it("supprime la participation", async () => {
      participationFindUnique.mockResolvedValue({
        sessionId: 1,
        userId: 5,
      } as never);
      participationDelete.mockResolvedValue({
        sessionId: 1,
        userId: 5,
      } as never);

      await expect(service.unparticipate(1, 5)).resolves.toBeUndefined();
      expect(participationDelete).toHaveBeenCalledWith(compositeKey(1, 5));
    });
  });
});
