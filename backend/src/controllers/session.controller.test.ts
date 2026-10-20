import { describe, expect, it, vi } from "vitest";
import { sessionService } from "../services/session.service";
import { expectNextAppError, runHandler } from "../test/helpers";
import { AppError } from "../utils/AppError";
import { sessionController } from "./session.controller";

vi.mock("../services/session.service", () => ({
  sessionService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    participate: vi.fn(),
    unparticipate: vi.fn(),
  },
}));

const getAll = vi.mocked(sessionService.getAll);
const getById = vi.mocked(sessionService.getById);
const create = vi.mocked(sessionService.create);
const update = vi.mocked(sessionService.update);
const remove = vi.mocked(sessionService.delete);
const participate = vi.mocked(sessionService.participate);
const unparticipate = vi.mocked(sessionService.unparticipate);

const session = { id: 3, name: "Morning Flow" } as never;
const INVALID_SESSION_ID = "ID de session invalide";
const INVALID_IDS = "ID de session ou d'utilisateur invalide";

describe("SessionController", () => {
  describe("getAll", () => {
    it("répond 200 avec la liste des sessions", async () => {
      getAll.mockResolvedValue([session]);

      const { res, next } = await runHandler(sessionController.getAll);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([session]);
      expect(next).not.toHaveBeenCalled();
    });

    it("transmet l'erreur du service à next()", async () => {
      const error = new Error("db down");
      getAll.mockRejectedValue(error);

      const { res, next } = await runHandler(sessionController.getAll);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getById", () => {
    it("convertit l'id en nombre et répond 200", async () => {
      getById.mockResolvedValue(session);

      const { res } = await runHandler(sessionController.getById, {
        params: { id: "3" },
      });

      expect(getById).toHaveBeenCalledWith(3);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(session);
    });

    it("rejette en 400 quand l'id n'est pas un nombre", async () => {
      const { next } = await runHandler(sessionController.getById, {
        params: { id: "abc" },
      });

      expectNextAppError(next, 400, INVALID_SESSION_ID);
      expect(getById).not.toHaveBeenCalled();
    });

    it("transmet le 404 du service à next()", async () => {
      getById.mockRejectedValue(new AppError("Session non trouvée", 404));

      const { next } = await runHandler(sessionController.getById, {
        params: { id: "999" },
      });

      expectNextAppError(next, 404, "Session non trouvée");
    });
  });

  describe("create", () => {
    const body = {
      name: "Morning Flow",
      date: "2026-12-01",
      description: "Séance douce",
      teacherId: 10,
    };

    it("transmet le body et l'utilisateur authentifié puis répond 201", async () => {
      create.mockResolvedValue(session);

      const { res, next } = await runHandler(sessionController.create, {
        body,
        userId: 99,
      });

      expect(create).toHaveBeenCalledWith(body, 99);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(session);
      expect(next).not.toHaveBeenCalled();
    });

    it("transmet le 403 du service à next()", async () => {
      create.mockRejectedValue(
        new AppError("Accès administrateur requis", 403),
      );

      const { res, next } = await runHandler(sessionController.create, {
        body,
        userId: 5,
      });

      expectNextAppError(next, 403, "Accès administrateur requis");
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("transmet l'id, le body et l'utilisateur puis répond 200", async () => {
      update.mockResolvedValue(session);

      const { res } = await runHandler(sessionController.update, {
        params: { id: "3" },
        body: { name: "New name" },
        userId: 99,
      });

      expect(update).toHaveBeenCalledWith(3, { name: "New name" }, 99);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(session);
    });

    it("rejette en 400 quand l'id n'est pas un nombre", async () => {
      const { next } = await runHandler(sessionController.update, {
        params: { id: "abc" },
        body: {},
        userId: 99,
      });

      expectNextAppError(next, 400, INVALID_SESSION_ID);
      expect(update).not.toHaveBeenCalled();
    });

    it("transmet l'erreur du service à next()", async () => {
      update.mockRejectedValue(new AppError("Session non trouvée", 404));

      const { next } = await runHandler(sessionController.update, {
        params: { id: "3" },
        body: { name: "X" },
        userId: 99,
      });

      expectNextAppError(next, 404, "Session non trouvée");
    });
  });

  describe("delete", () => {
    it("supprime la session et répond 200 avec un message", async () => {
      remove.mockResolvedValue(undefined);

      const { res, next } = await runHandler(sessionController.delete, {
        params: { id: "3" },
        userId: 99,
      });

      expect(remove).toHaveBeenCalledWith(3, 99);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Session supprimée avec succès",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("rejette en 400 quand l'id n'est pas un nombre", async () => {
      const { next } = await runHandler(sessionController.delete, {
        params: { id: "abc" },
        userId: 99,
      });

      expectNextAppError(next, 400, INVALID_SESSION_ID);
      expect(remove).not.toHaveBeenCalled();
    });

    it("transmet l'erreur du service à next()", async () => {
      remove.mockRejectedValue(
        new AppError("Accès administrateur requis", 403),
      );

      const { res, next } = await runHandler(sessionController.delete, {
        params: { id: "3" },
        userId: 5,
      });

      expectNextAppError(next, 403, "Accès administrateur requis");
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe.each([
    {
      name: "participate",
      handler: sessionController.participate,
      service: participate,
      message: "Successfully joined the session",
    },
    {
      name: "unparticipate",
      handler: sessionController.unparticipate,
      service: unparticipate,
      message: "Successfully left the session",
    },
  ])("$name", ({ handler, service, message }) => {
    it("convertit les ids en nombres et répond 200 avec un message", async () => {
      service.mockResolvedValue(undefined);

      const { res, next } = await runHandler(handler, {
        params: { id: "3", userId: "5" },
      });

      expect(service).toHaveBeenCalledWith(3, 5);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message });
      expect(next).not.toHaveBeenCalled();
    });

    it.each([
      ["l'id de session", { id: "abc", userId: "5" }],
      ["l'id d'utilisateur", { id: "3", userId: "abc" }],
    ])(
      "rejette en 400 quand %s n'est pas un nombre",
      async (_label, params) => {
        const { next } = await runHandler(handler, { params });

        expectNextAppError(next, 400, INVALID_IDS);
        expect(service).not.toHaveBeenCalled();
      },
    );

    it("transmet l'erreur du service à next()", async () => {
      service.mockRejectedValue(new AppError("Session non trouvée", 404));

      const { res, next } = await runHandler(handler, {
        params: { id: "3", userId: "5" },
      });

      expectNextAppError(next, 404, "Session non trouvée");
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
