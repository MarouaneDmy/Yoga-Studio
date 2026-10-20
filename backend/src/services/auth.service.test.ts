import * as bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../utils/AppError";
import { generateToken } from "../utils/jwt.util";
import { prisma } from "../utils/prisma";
import { AuthService } from "./auth.service";

vi.mock("../utils/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), create: vi.fn() } },
}));
vi.mock("bcrypt", () => ({ compare: vi.fn(), hash: vi.fn() }));
vi.mock("../utils/jwt.util", () => ({ generateToken: vi.fn() }));

const findUnique = vi.mocked(prisma.user.findUnique);
const create = vi.mocked(prisma.user.create);
const compare = vi.mocked(bcrypt.compare);
const hash = vi.mocked(bcrypt.hash);
const generateTokenMock = vi.mocked(generateToken);

const dbUser = {
  id: 1,
  email: "john@yoga.com",
  password: "hashed-password",
  firstName: "John",
  lastName: "Doe",
  admin: false,
};

const expectedPublicUser = {
  id: 1,
  email: "john@yoga.com",
  firstName: "John",
  lastName: "Doe",
  admin: false,
  token: "jwt-token",
};

const expectAppError = async (
  promise: Promise<unknown>,
  statusCode: number,
  message: string,
) => {
  await expect(promise).rejects.toBeInstanceOf(AppError);
  await expect(promise).rejects.toMatchObject({ statusCode, message });
};

describe("AuthService", () => {
  const service = new AuthService();

  beforeEach(() => {
    generateTokenMock.mockReturnValue("jwt-token");
  });

  describe("login", () => {
    it.each([
      ["l'email est vide", "", "password123"],
      ["le mot de passe est vide", "john@yoga.com", ""],
    ])("rejette en 400 quand %s", async (_label, email, password) => {
      await expectAppError(
        service.login(email, password),
        400,
        "Email and password are required",
      );
      expect(findUnique).not.toHaveBeenCalled();
    });

    it("rejette en 400 quand les identifiants ne sont pas des chaînes", async () => {
      await expectAppError(
        service.login(123 as unknown as string, 456 as unknown as string),
        400,
        "Email and password must be strings",
      );
      expect(findUnique).not.toHaveBeenCalled();
    });

    it("rejette en 401 quand l'utilisateur n'existe pas", async () => {
      findUnique.mockResolvedValue(null);

      await expectAppError(
        service.login("ghost@yoga.com", "password123"),
        401,
        "Invalid credentials",
      );
      expect(findUnique).toHaveBeenCalledWith({
        where: { email: "ghost@yoga.com" },
      });
      expect(compare).not.toHaveBeenCalled();
    });

    it("rejette en 401 avec le même message quand le mot de passe est faux", async () => {
      findUnique.mockResolvedValue(dbUser as never);
      compare.mockResolvedValue(false as never);

      await expectAppError(
        service.login("john@yoga.com", "wrong-password"),
        401,
        "Invalid credentials",
      );
      expect(compare).toHaveBeenCalledWith("wrong-password", "hashed-password");
      expect(generateTokenMock).not.toHaveBeenCalled();
    });

    it("retourne l'utilisateur et un token, sans le mot de passe", async () => {
      findUnique.mockResolvedValue(dbUser as never);
      compare.mockResolvedValue(true as never);

      const result = await service.login("john@yoga.com", "password123");

      expect(result).toEqual(expectedPublicUser);
      expect(result).not.toHaveProperty("password");
      expect(generateTokenMock).toHaveBeenCalledWith(1);
    });
  });

  describe("register", () => {
    const valid = ["john@yoga.com", "password123", "John", "Doe"] as const;

    type RegisterArgs = Parameters<AuthService["register"]>;

    it.each<[string, RegisterArgs]>([
      ["email", ["", "password123", "John", "Doe"]],
      ["password", ["john@yoga.com", "", "John", "Doe"]],
      ["firstName", ["john@yoga.com", "password123", "", "Doe"]],
      ["lastName", ["john@yoga.com", "password123", "John", ""]],
    ])("rejette en 400 quand %s est manquant", async (_field, args) => {
      await expectAppError(
        service.register(...args),
        400,
        "Email, password, firstName, and lastName are required",
      );
      expect(findUnique).not.toHaveBeenCalled();
    });

    it("rejette en 400 quand le mot de passe fait moins de 8 caractères", async () => {
      await expectAppError(
        service.register("john@yoga.com", "1234567", "John", "Doe"),
        400,
        "Password must be at least 8 characters",
      );
      expect(findUnique).not.toHaveBeenCalled();
    });

    it("accepte un mot de passe d'exactement 8 caractères", async () => {
      findUnique.mockResolvedValue(null);
      hash.mockResolvedValue("hashed" as never);
      create.mockResolvedValue(dbUser as never);

      await expect(
        service.register("john@yoga.com", "12345678", "John", "Doe"),
      ).resolves.toBeDefined();
    });

    it("rejette en 400 quand l'email existe déjà", async () => {
      findUnique.mockResolvedValue(dbUser as never);

      await expectAppError(
        service.register(...valid),
        400,
        "Email already exists",
      );
      expect(hash).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    });

    it("hache le mot de passe (10 rounds) et crée un utilisateur non admin", async () => {
      findUnique.mockResolvedValue(null);
      hash.mockResolvedValue("hashed-password" as never);
      create.mockResolvedValue(dbUser as never);

      await service.register(...valid);

      expect(hash).toHaveBeenCalledWith("password123", 10);
      expect(create).toHaveBeenCalledWith({
        data: {
          email: "john@yoga.com",
          password: "hashed-password",
          firstName: "John",
          lastName: "Doe",
          admin: false,
        },
      });
    });

    it("retourne l'utilisateur et un token, sans le mot de passe", async () => {
      findUnique.mockResolvedValue(null);
      hash.mockResolvedValue("hashed-password" as never);
      create.mockResolvedValue(dbUser as never);

      const result = await service.register(...valid);

      expect(result).toEqual(expectedPublicUser);
      expect(result).not.toHaveProperty("password");
      expect(generateTokenMock).toHaveBeenCalledWith(1);
    });
  });
});
