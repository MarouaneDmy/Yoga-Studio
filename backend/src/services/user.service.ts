// src/services/user.service.ts
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";

export class UserService {
  async getById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  async delete(id: number, authenticatedUserId: number) {
    if (authenticatedUserId !== id) {
      throw new AppError("You can only delete your own account", 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    await prisma.user.delete({
      where: { id },
    });
  }

  async promoteSelfToAdmin(userId: number) {
    const isDev = (process.env.NODE_ENV || "development") === "development";
    if (!isDev) {
      throw new AppError(
        "Admin self-promotion is only available in development",
        403,
      );
    }

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.admin) {
      return user;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { admin: true },
    });

    return updatedUser;
  }
}

export const userService = new UserService();
