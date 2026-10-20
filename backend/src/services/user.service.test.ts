import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../utils/prisma";
import { UserService } from "./user.service";
import { expectAppError } from "../test/helpers";

vi.mock("../utils/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

const findUnique = vi.mocked(prisma.user.findUnique);
const update = vi.mocked(prisma.user.update);
const remove = vi.mocked(prisma.user.delete);

const dbUser = {
  id: 1,
  email: "john@yoga.com",
  password: "hashed-password",
  firstName: "John",
  lastName: "Doe",
  admin: false,
};

describe("UserService", () => {
  const service = new UserService();

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getById", () => {
    it("retourne l'utilisateur trouvé", async () => {
      findUnique.mockResolvedValue(dbUser as never);

      const result = await service.getById(1);

      expect(findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toBe(dbUser);
    });

    it("rejette en 404 si l'utilisateur n'existe pas", async () => {
      findUnique.mockResolvedValue(null);

      await expectAppError(service.getById(999), 404, "User not found");
    });
  });

  describe("delete", () => {
    it("rejette en 403 si on essaie de supprimer le compte d'un autre", async () => {
      await expectAppError(
        service.delete(1, 2),
        403,
        "You can only delete your own account",
      );
      expect(findUnique).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    });

    it("rejette en 404 si l'utilisateur n'existe pas", async () => {
      findUnique.mockResolvedValue(null);

      await expectAppError(service.delete(1, 1), 404, "User not found");
      expect(remove).not.toHaveBeenCalled();
    });

    it("supprime son propre compte", async () => {
      findUnique.mockResolvedValue(dbUser as never);
      remove.mockResolvedValue(dbUser as never);

      await expect(service.delete(1, 1)).resolves.toBeUndefined();
      expect(remove).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe("promoteSelfToAdmin", () => {
    describe("hors développement", () => {
      it.each(["test", "production"])(
        "rejette en 403 quand NODE_ENV vaut %s",
        async (env) => {
          vi.stubEnv("NODE_ENV", env);

          await expectAppError(
            service.promoteSelfToAdmin(1),
            403,
            "Admin self-promotion is only available in development",
          );
          expect(findUnique).not.toHaveBeenCalled();
        },
      );
    });

    describe("en développement", () => {
      it("considère l'environnement comme dev quand NODE_ENV n'est pas défini", async () => {
        vi.stubEnv("NODE_ENV", "placeholder");
        delete process.env.NODE_ENV;
        findUnique.mockResolvedValue(dbUser as never);
        update.mockResolvedValue({ ...dbUser, admin: true } as never);

        await expect(service.promoteSelfToAdmin(1)).resolves.toMatchObject({
          admin: true,
        });
      });

      it("rejette en 401 si l'identifiant utilisateur est absent", async () => {
        vi.stubEnv("NODE_ENV", "development");

        await expectAppError(
          service.promoteSelfToAdmin(0),
          401,
          "Unauthorized",
        );
        expect(findUnique).not.toHaveBeenCalled();
      });

      it("rejette en 404 si l'utilisateur n'existe pas", async () => {
        vi.stubEnv("NODE_ENV", "development");
        findUnique.mockResolvedValue(null);

        await expectAppError(
          service.promoteSelfToAdmin(1),
          404,
          "User not found",
        );
        expect(update).not.toHaveBeenCalled();
      });

      it("retourne l'utilisateur sans écriture s'il est déjà admin", async () => {
        vi.stubEnv("NODE_ENV", "development");
        const admin = { ...dbUser, admin: true };
        findUnique.mockResolvedValue(admin as never);

        const result = await service.promoteSelfToAdmin(1);

        expect(result).toBe(admin);
        expect(update).not.toHaveBeenCalled();
      });

      it("passe l'utilisateur en admin et retourne la version mise à jour", async () => {
        vi.stubEnv("NODE_ENV", "development");
        findUnique.mockResolvedValue(dbUser as never);
        update.mockResolvedValue({ ...dbUser, admin: true } as never);

        const result = await service.promoteSelfToAdmin(1);

        expect(update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { admin: true },
        });
        expect(result).toMatchObject({ id: 1, admin: true });
      });
    });
  });
});
