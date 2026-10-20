import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../utils/AppError";
import { errorHandler } from "./errorHandler";

const makeRes = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};

describe("errorHandler", () => {
  let res: ReturnType<typeof makeRes>;
  const next = vi.fn();

  beforeEach(() => {
    res = makeRes();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  const run = (err: unknown) =>
    errorHandler(err, {} as Request, res as unknown as Response, next);

  it("renvoie le statusCode et le message d'une AppError", () => {
    run(new AppError("Email already exists", 400));

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Email already exists",
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("renvoie 404 pour une erreur Prisma P2025 (ressource introuvable)", () => {
    run(Object.assign(new Error("Record not found"), { code: "P2025" }));

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Ressource non trouvée.",
    });
  });

  it("renvoie 500 et loggue une erreur inattendue sans fuiter son message", () => {
    const error = new Error("database password is hunter2");

    run(error);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Une erreur interne est survenue.",
    });
    expect(console.error).toHaveBeenCalledWith("ERROR :", error);
  });

  it("renvoie 500 pour une autre erreur Prisma (code différent de P2025)", () => {
    run(Object.assign(new Error("Unique constraint"), { code: "P2002" }));

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
