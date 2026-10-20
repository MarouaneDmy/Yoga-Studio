import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateToken, verifyToken } from "./jwt.util";

const SECRET = "test-secret";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("generateToken", () => {
  it("retourne un JWT (3 segments) contenant le userId", () => {
    const token = generateToken(42);

    expect(token.split(".")).toHaveLength(3);
    expect(jwt.decode(token)).toMatchObject({ userId: 42 });
  });

  it("expire au bout de 24 heures", () => {
    const decoded = jwt.decode(generateToken(1)) as jwt.JwtPayload;

    expect(decoded.exp! - decoded.iat!).toBe(24 * 60 * 60);
  });

  it("utilise la clé par défaut si JWT_SECRET n'est pas défini", async () => {
    vi.stubEnv("JWT_SECRET", "");
    vi.resetModules();
    const { generateToken: generateWithDefaultKey } =
      await import("./jwt.util");

    const token = generateWithDefaultKey(1);

    expect(() => jwt.verify(token, "default-secret-key")).not.toThrow();
  });
});

describe("verifyToken", () => {
  it("retourne le payload d'un token valide", () => {
    const decoded = verifyToken(generateToken(7));

    expect(decoded).toMatchObject({ userId: 7 });
  });

  it("retourne null pour une chaîne qui n'est pas un JWT", () => {
    expect(verifyToken("not-a-token")).toBeNull();
  });

  it("retourne null pour un token signé avec une autre clé", () => {
    const forged = jwt.sign({ userId: 1 }, "another-secret");

    expect(verifyToken(forged)).toBeNull();
  });

  it("retourne null pour un token expiré", () => {
    const expired = jwt.sign({ userId: 1 }, SECRET, { expiresIn: -10 });

    expect(verifyToken(expired)).toBeNull();
  });
});
