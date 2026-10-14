import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";

export class TeacherService {
  async getAll() {
    const teachers = await prisma.teacher.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return teachers.map((teacher) => ({
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    }));
  }

  async getById(id: number) {
    const teacher = await prisma.teacher.findUnique({
      where: { id },
    });

    if (!teacher) {
      throw new AppError("Teacher not found", 404);
    }

    return {
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    };
  }
}

export const teacherService = new TeacherService();
