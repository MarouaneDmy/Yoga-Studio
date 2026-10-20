import type { Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyToken } from "../utils/jwt.util";
import { type AuthRequest, authMiddleware } from "./auth.middleware";

vi.mock("../utils/jwt.util", () => ({ verifyToken: vi.fn() }));

const verifyTokenMock = vi.mocked(verifyToken);

const makeReq = (authorization?: string) =>
  ({ headers: { authorization } }) as unknown as AuthRequest;

const makeRes = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};

describe("authMiddleware", () => {
  let res: ReturnType<typeof makeRes>;
  const next = vi.fn();

  beforeEach(() => {
    res = makeRes();
  });

  const run = (req: AuthRequest) =>
    authMiddleware(req, res as unknown as Response, next);

  it("répond 401 si le header Authorization est absent", () => {
    run(makeReq());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "No token provided" });
    expect(next).not.toHaveBeenCalled();
  });

  it.each(["Bearer", "Bearer "])(
    "répond 401 si le format est invalide (%j)",
    (header) => {
      run(makeReq(header));

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid token format",
      });
      expect(next).not.toHaveBeenCalled();
    },
  );

  it("répond 401 si le token est invalide ou expiré", () => {
    verifyTokenMock.mockReturnValue(null);

    run(makeReq("Bearer bad.token"));

    expect(verifyTokenMock).toHaveBeenCalledWith("bad.token");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid or expired token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("renseigne req.userId et appelle next() quand le token est valide", () => {
    verifyTokenMock.mockReturnValue({ userId: 42 });
    const req = makeReq("Bearer good.token");

    run(req);

    expect(req.userId).toBe(42);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });
});
