import { Response } from "express";
import { userService } from "../services/user.service";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { AuthRequest } from "../middleware/auth.middleware";

export class UserController {
  getById = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };

    if (!id) {
      throw new AppError("User ID is required", 400);
    }

    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    const user = await userService.getById(userId);
    res.status(200).json(user);
  });

  delete = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };

    if (!id) {
      throw new AppError("User ID is required", 400);
    }

    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      throw new AppError("Invalid user ID", 400);
    }

    await userService.delete(userId, req.userId!);
    res.status(200).json({ message: "User deleted successfully" });
  });

  promoteSelfToAdmin = catchAsync(async (req: AuthRequest, res: Response) => {
    const user = await userService.promoteSelfToAdmin(req.userId!);
    res.status(200).json(user);
  });
}

export const userController = new UserController();
