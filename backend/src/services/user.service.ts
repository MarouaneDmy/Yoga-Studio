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

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
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
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        admin: user.admin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { admin: true },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      admin: updatedUser.admin,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }
}

export const userService = new UserService();
