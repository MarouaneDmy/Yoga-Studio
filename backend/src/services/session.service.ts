import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";

export class SessionService {
  async getAll() {
    const sessions = await prisma.session.findMany({
      include: {
        teacher: true,
        participants: { include: { user: true } },
      },
      orderBy: { date: "asc" },
    });

    return sessions.map((session) => ({
      id: session.id,
      name: session.name,
      date: session.date,
      description: session.description,
      teacher: {
        id: session.teacher.id,
        firstName: session.teacher.firstName,
        lastName: session.teacher.lastName,
      },
      users: session.participants.map((p) => p.user.id),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));
  }

  async getById(id: number) {
    const session = await prisma.session.findUnique({
      where: { id },
      include: { teacher: true, participants: { include: { user: true } } },
    });

    if (!session) {
      throw new AppError("Session non trouvée", 404);
    }

    return {
      id: session.id,
      name: session.name,
      date: session.date,
      description: session.description,
      teacher: {
        id: session.teacher.id,
        firstName: session.teacher.firstName,
        lastName: session.teacher.lastName,
      },
      users: session.participants.map((p) => p.user.id),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  async create(data: any, userId: number) {
    const { name, date, description, teacherId } = data;

    if (!name || !date || !description || !teacherId) {
      throw new AppError(
        "Name, date, description, and teacherId are required",
        400,
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.admin) {
      throw new AppError("Accès administrateur requis", 403);
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) {
      throw new AppError("Professeur non trouvé", 404);
    }

    const session = await prisma.session.create({
      data: { name, date: new Date(date), description, teacherId },
      include: { teacher: true, participants: true },
    });

    return {
      id: session.id,
      name: session.name,
      date: session.date,
      description: session.description,
      teacher: {
        id: session.teacher.id,
        firstName: session.teacher.firstName,
        lastName: session.teacher.lastName,
      },
      users: [],
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  async update(id: number, data: any, userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.admin) {
      throw new AppError("Accès administrateur requis", 403);
    }

    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Session non trouvée", 404);
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.date) updateData.date = new Date(data.date);
    if (data.description) updateData.description = data.description;

    if (data.teacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: data.teacherId },
      });
      if (!teacher) {
        throw new AppError("Professeur non trouvé", 404);
      }
      updateData.teacherId = data.teacherId;
    }

    if (Object.keys(updateData).length === 0) {
      return this.getById(id);
    }

    const session = await prisma.session.update({
      where: { id },
      data: updateData,
      include: { teacher: true, participants: { include: { user: true } } },
    });

    return {
      id: session.id,
      name: session.name,
      date: session.date,
      description: session.description,
      teacher: {
        id: session.teacher.id,
        firstName: session.teacher.firstName,
        lastName: session.teacher.lastName,
      },
      users: session.participants.map((p) => p.user.id),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  async delete(id: number, userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.admin) {
      throw new AppError("Accès administrateur requis", 403);
    }

    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Session non trouvée", 404);
    }

    await prisma.session.delete({ where: { id } });
  }

  async participate(sessionId: number, participantUserId: number) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new AppError("Session non trouvée", 404);
    }

    const user = await prisma.user.findUnique({
      where: { id: participantUserId },
    });
    if (!user) {
      throw new AppError("Utilisateur non trouvé", 404);
    }

    const existing = await prisma.sessionParticipation.findUnique({
      where: { sessionId_userId: { sessionId, userId: participantUserId } },
    });

    if (existing) {
      throw new AppError("L'utilisateur participe déjà à cette session", 400);
    }

    await prisma.sessionParticipation.create({
      data: { sessionId, userId: participantUserId },
    });
  }

  async unparticipate(sessionId: number, participantUserId: number) {
    const participation = await prisma.sessionParticipation.findUnique({
      where: { sessionId_userId: { sessionId, userId: participantUserId } },
    });

    if (!participation) {
      throw new AppError("Participation non trouvée", 404);
    }

    await prisma.sessionParticipation.delete({
      where: { sessionId_userId: { sessionId, userId: participantUserId } },
    });
  }
}

export const sessionService = new SessionService();
