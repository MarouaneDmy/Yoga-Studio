// src/services/auth.service.ts
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";
import * as bcrypt from "bcrypt";
import { generateToken } from "../utils/jwt.util";

export class AuthService {
  async login(email: string, password: string) {
    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    if (typeof email !== "string" || typeof password !== "string") {
      throw new AppError("Email and password must be strings", 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401);
    }

    const token = generateToken(user.id);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      token,
    };
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) {
    if (!email || !password || !firstName || !lastName) {
      throw new AppError(
        "Email, password, firstName, and lastName are required",
        400,
      );
    }

    if (password.length < 8) {
      throw new AppError("Password must be at least 8 characters", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError("Email already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        admin: false,
      },
    });

    const token = generateToken(user.id);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      token,
    };
  }
}

export const authService = new AuthService();
