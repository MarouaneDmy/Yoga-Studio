import { Response } from "express";
import { teacherService } from "../services/teacher.service";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { AuthRequest } from "../middleware/auth.middleware";

export class TeacherController {
  getAll = catchAsync(async (req: AuthRequest, res: Response) => {
    const teachers = await teacherService.getAll();
    res.status(200).json(teachers);
  });

  getById = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };

    if (!id) {
      throw new AppError("Teacher ID is required", 400);
    }

    const teacherId = parseInt(id, 10);

    if (isNaN(teacherId)) {
      throw new AppError("Invalid teacher ID", 400);
    }

    const teacher = await teacherService.getById(teacherId);
    res.status(200).json(teacher);
  });
}

export const teacherController = new TeacherController();
