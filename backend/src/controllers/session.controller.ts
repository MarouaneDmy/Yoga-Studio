// src/controllers/session.controller.ts
import { Response } from "express";
import { sessionService } from "../services/session.service";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { AuthRequest } from "../middleware/auth.middleware";

export class SessionController {
  getAll = catchAsync(async (req: AuthRequest, res: Response) => {
    const sessions = await sessionService.getAll();
    res.status(200).json(sessions);
  });

  getById = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const sessionId = parseInt(id, 10);

    if (isNaN(sessionId)) throw new AppError("ID de session invalide", 400);

    const session = await sessionService.getById(sessionId);
    res.status(200).json(session);
  });

  create = catchAsync(async (req: AuthRequest, res: Response) => {
    const newSession = await sessionService.create(req.body, req.userId!);
    res.status(201).json(newSession);
  });

  update = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const sessionId = parseInt(id, 10);

    if (isNaN(sessionId)) throw new AppError("ID de session invalide", 400);

    const updatedSession = await sessionService.update(
      sessionId,
      req.body,
      req.userId!,
    );
    res.status(200).json(updatedSession);
  });

  delete = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const sessionId = parseInt(id, 10);

    if (isNaN(sessionId)) throw new AppError("ID de session invalide", 400);

    await sessionService.delete(sessionId, req.userId!);
    res.status(200).json({ message: "Session supprimée avec succès" });
  });

  participate = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id, userId } = req.params as { id: string; userId: string };
    const sessionId = parseInt(id, 10);
    const participantUserId = parseInt(userId, 10);

    if (isNaN(sessionId) || isNaN(participantUserId)) {
      throw new AppError("ID de session ou d'utilisateur invalide", 400);
    }

    await sessionService.participate(sessionId, participantUserId);
    res.status(200).json({ message: "Successfully joined the session" });
  });

  unparticipate = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id, userId } = req.params as { id: string; userId: string };
    const sessionId = parseInt(id, 10);
    const participantUserId = parseInt(userId, 10);

    if (isNaN(sessionId) || isNaN(participantUserId)) {
      throw new AppError("ID de session ou d'utilisateur invalide", 400);
    }

    await sessionService.unparticipate(sessionId, participantUserId);
    res.status(200).json({ message: "Successfully left the session" });
  });
}

export const sessionController = new SessionController();
